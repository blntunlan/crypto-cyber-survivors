import { DIRECTOR_CONFIG_V1, type DirectorConfigV1 } from './config/DirectorConfigV1';
import {
  ADVANTAGE_CARD_CATALOG,
  type AdvantageCard,
  type AdvantageMechanic,
} from './encounters/AdvantageCatalog';
import { type MarketRegime } from './contracts';

export type AdvantageAllocationInput = {
  deltaSeconds: number;
  advantage: number;
  regime: MarketRegime;
  regimeConfidence: number;
  elapsedSeconds: number;
  seed: number;
};

export type AdvantageAllocationSnapshot = {
  creditRate: number;
  availableCredits: number;
  maximumCredits: number;
  activeMechanic: AdvantageMechanic | null;
  /**
   * The active window is published on the snapshot so consumers never have to
   * reach back into the allocator — subsystems read the snapshot only (§19).
   */
  movementMultiplier: number;
  dashCooldownMultiplier: number;
  endsAtElapsedSeconds: number;
  /** Increments once per activation, so a one-shot effect fires exactly once. */
  activationSequence: number;
};

export type AdvantagePlan = {
  mechanic: AdvantageMechanic;
  costCredits: number;
  startsAtSeconds: number;
  endsAtSeconds: number;
  movementMultiplier: number;
  dashCooldownMultiplier: number;
  grantsToken: false;
};

type ActiveAdvantage = AdvantagePlan;

const UNIT_MINIMUM = 0;
const UNIT_MAXIMUM = 1;

const clampUnit = (value: number): number =>
  Math.min(
    UNIT_MAXIMUM,
    Math.max(UNIT_MINIMUM, Number.isFinite(value) ? value : UNIT_MINIMUM)
  );

/**
 * Favourable position alignment buys a single deterministic gameplay
 * opportunity. It never creates tokens or settlement rewards directly.
 */
export class AdvantageAllocator {
  private readonly config: DirectorConfigV1;
  private readonly catalog: readonly AdvantageCard[];
  private availableCredits = UNIT_MINIMUM;
  private active: ActiveAdvantage | null = null;
  private activationSequence = 0;
  private readonly cooldownEndsAt = new Map<AdvantageMechanic, number>();
  private readonly snapshot: AdvantageAllocationSnapshot;

  public constructor(
    config: DirectorConfigV1 = DIRECTOR_CONFIG_V1,
    catalog: readonly AdvantageCard[] = ADVANTAGE_CARD_CATALOG
  ) {
    this.config = config;
    this.catalog = catalog;
    this.snapshot = {
      creditRate: UNIT_MINIMUM,
      availableCredits: UNIT_MINIMUM,
      maximumCredits: UNIT_MINIMUM,
      activeMechanic: null,
      movementMultiplier: 1,
      dashCooldownMultiplier: 1,
      endsAtElapsedSeconds: UNIT_MINIMUM,
      activationSequence: 0,
    };
  }

  public update(input: AdvantageAllocationInput): AdvantageAllocationSnapshot {
    this.clearExpiredActive(input.elapsedSeconds);

    const advantage = clampUnit(input.advantage);
    const regimeConfidence = clampUnit(input.regimeConfidence);
    const creditRate =
      this.config.advantage.baseCreditsPerSecond *
      advantage *
      (this.config.advantage.regimeConfidenceBaseMultiplier +
        this.config.advantage.regimeConfidenceWeight * regimeConfidence);
    const maximumCredits = creditRate * this.config.advantage.maximumCreditBankSeconds;
    const accruedCredits = creditRate * Math.max(UNIT_MINIMUM, input.deltaSeconds);

    this.availableCredits = Math.min(
      maximumCredits,
      Math.max(UNIT_MINIMUM, this.availableCredits + accruedCredits)
    );
    this.writeSnapshot(creditRate, maximumCredits);
    return this.snapshot;
  }

  public planNext(input: AdvantageAllocationInput): AdvantagePlan | null {
    this.clearExpiredActive(input.elapsedSeconds);
    if (this.active !== null) return null;

    const card = this.pickEligibleCard(input);
    if (!card) return null;

    return {
      mechanic: card.mechanic,
      costCredits: card.costCredits,
      startsAtSeconds: input.elapsedSeconds,
      endsAtSeconds: input.elapsedSeconds + card.durationSeconds,
      movementMultiplier: card.movementMultiplier,
      dashCooldownMultiplier: card.dashCooldownMultiplier,
      grantsToken: false,
    };
  }

  public activate(plan: AdvantagePlan): boolean {
    const card = this.findCard(plan.mechanic);
    if (
      this.active !== null ||
      this.availableCredits < plan.costCredits ||
      card === null
    ) {
      return false;
    }

    if (card.costCredits !== plan.costCredits) return false;

    this.availableCredits -= plan.costCredits;
    this.active = plan;
    this.activationSequence += 1;
    this.cooldownEndsAt.set(plan.mechanic, plan.endsAtSeconds + card.cooldownSeconds);
    this.snapshot.availableCredits = this.availableCredits;
    this.writeActiveWindow();
    return true;
  }

  public getSnapshot(): AdvantageAllocationSnapshot {
    return this.snapshot;
  }

  public freeze(elapsedSeconds: number): AdvantageAllocationSnapshot {
    this.clearExpiredActive(elapsedSeconds);
    this.snapshot.creditRate = UNIT_MINIMUM;
    this.snapshot.availableCredits = this.availableCredits;
    this.writeActiveWindow();
    return this.snapshot;
  }

  public reset(): void {
    this.availableCredits = UNIT_MINIMUM;
    this.active = null;
    this.activationSequence = 0;
    this.cooldownEndsAt.clear();
    this.writeSnapshot(UNIT_MINIMUM, UNIT_MINIMUM);
  }

  private clearExpiredActive(elapsedSeconds: number): void {
    if (this.active === null || elapsedSeconds < this.active.endsAtSeconds) return;
    this.active = null;
  }

  private pickEligibleCard(input: AdvantageAllocationInput): AdvantageCard | null {
    let eligibleCount = 0;
    for (let index = 0; index < this.catalog.length; index += 1) {
      const card = this.catalog[index];
      if (card !== undefined && this.isEligible(card, input)) eligibleCount += 1;
    }
    if (eligibleCount === 0) return null;

    let targetIndex = Math.abs(Math.trunc(input.seed)) % eligibleCount;
    for (let index = 0; index < this.catalog.length; index += 1) {
      const card = this.catalog[index];
      if (card === undefined || !this.isEligible(card, input)) continue;
      if (targetIndex === 0) return card;
      targetIndex -= 1;
    }
    return null;
  }

  private isEligible(card: AdvantageCard, input: AdvantageAllocationInput): boolean {
    return (
      card.eligibleRegimes.includes(input.regime) &&
      this.availableCredits >= card.costCredits &&
      (this.cooldownEndsAt.get(card.mechanic) ?? UNIT_MINIMUM) <= input.elapsedSeconds
    );
  }

  private findCard(mechanic: AdvantageMechanic): AdvantageCard | null {
    for (let index = 0; index < this.catalog.length; index += 1) {
      const card = this.catalog[index];
      if (card?.mechanic === mechanic) return card;
    }
    return null;
  }

  private writeSnapshot(creditRate: number, maximumCredits: number): void {
    this.snapshot.creditRate = creditRate;
    this.snapshot.availableCredits = this.availableCredits;
    this.snapshot.maximumCredits = maximumCredits;
    this.writeActiveWindow();
  }

  private writeActiveWindow(): void {
    const active = this.active;
    this.snapshot.activeMechanic = active?.mechanic ?? null;
    this.snapshot.movementMultiplier = active?.movementMultiplier ?? 1;
    this.snapshot.dashCooldownMultiplier = active?.dashCooldownMultiplier ?? 1;
    this.snapshot.endsAtElapsedSeconds = active?.endsAtSeconds ?? UNIT_MINIMUM;
    this.snapshot.activationSequence = this.activationSequence;
  }
}
