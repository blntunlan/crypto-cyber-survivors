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
  private readonly cooldownEndsAt = new Map<AdvantageMechanic, number>();
  private snapshot: AdvantageAllocationSnapshot;

  public constructor(
    config: DirectorConfigV1 = DIRECTOR_CONFIG_V1,
    catalog: readonly AdvantageCard[] = ADVANTAGE_CARD_CATALOG
  ) {
    this.config = config;
    this.catalog = catalog;
    this.snapshot = this.createSnapshot(UNIT_MINIMUM, UNIT_MINIMUM);
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
    this.snapshot = this.createSnapshot(creditRate, maximumCredits);
    return this.snapshot;
  }

  public planNext(input: AdvantageAllocationInput): AdvantagePlan | null {
    this.clearExpiredActive(input.elapsedSeconds);
    if (this.active !== null) return null;

    const eligibleCards = this.catalog.filter(
      card =>
        card.eligibleRegimes.includes(input.regime) &&
        this.availableCredits >= card.costCredits &&
        (this.cooldownEndsAt.get(card.mechanic) ?? UNIT_MINIMUM) <= input.elapsedSeconds
    );
    const card = this.pickCard(eligibleCards, input.seed);
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
    if (
      this.active !== null ||
      this.availableCredits < plan.costCredits ||
      !this.catalog.some(card => card.mechanic === plan.mechanic)
    ) {
      return false;
    }

    const card = this.catalog.find(candidate => candidate.mechanic === plan.mechanic);
    if (card?.costCredits !== plan.costCredits) return false;

    this.availableCredits -= plan.costCredits;
    this.active = plan;
    this.cooldownEndsAt.set(plan.mechanic, plan.endsAtSeconds + card.cooldownSeconds);
    this.snapshot = {
      ...this.snapshot,
      availableCredits: this.availableCredits,
      activeMechanic: plan.mechanic,
    };
    return true;
  }

  public getSnapshot(): AdvantageAllocationSnapshot {
    return this.snapshot;
  }

  public reset(): void {
    this.availableCredits = UNIT_MINIMUM;
    this.active = null;
    this.cooldownEndsAt.clear();
    this.snapshot = this.createSnapshot(UNIT_MINIMUM, UNIT_MINIMUM);
  }

  private clearExpiredActive(elapsedSeconds: number): void {
    if (this.active === null || elapsedSeconds < this.active.endsAtSeconds) return;
    this.active = null;
  }

  private pickCard(
    cards: readonly AdvantageCard[],
    seed: number
  ): AdvantageCard | null {
    if (cards.length === UNIT_MINIMUM) return null;
    const index = Math.abs(Math.trunc(seed)) % cards.length;
    return cards[index] ?? null;
  }

  private createSnapshot(
    creditRate: number,
    maximumCredits: number
  ): AdvantageAllocationSnapshot {
    return {
      creditRate,
      availableCredits: this.availableCredits,
      maximumCredits,
      activeMechanic: this.active?.mechanic ?? null,
    };
  }
}
