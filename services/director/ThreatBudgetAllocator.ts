import { DIRECTOR_CONFIG_V1, type DirectorConfigV1 } from './config/DirectorConfigV1';

export type ThreatBudgetInput = {
  deltaSeconds: number;
  survivalPressure: number;
  marketPressure: number;
  headwind: number;
  greedPressure: number;
  encounterPressure: number;
  pacingThreatMultiplier: number;
};

export type ThreatBudgetSnapshot = {
  target: number;
  creditRate: number;
  availableCredits: number;
  maximumCredits: number;
  isTargetClamped: boolean;
};

const UNIT_MINIMUM = 0;
const UNIT_MAXIMUM = 1;

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));

/**
 * Owns only threat credit accrual. Spawn execution must explicitly spend from
 * this bank rather than deriving another market or position multiplier.
 */
export class ThreatBudgetAllocator {
  private readonly config: DirectorConfigV1;
  private availableCredits = UNIT_MINIMUM;
  private readonly snapshot: ThreatBudgetSnapshot;

  public constructor(config: DirectorConfigV1 = DIRECTOR_CONFIG_V1) {
    this.config = config;
    this.snapshot = this.createSnapshot(
      this.config.threat.minimumTarget,
      UNIT_MINIMUM,
      UNIT_MINIMUM,
      false
    );
  }

  public update(input: ThreatBudgetInput): ThreatBudgetSnapshot {
    const rawTarget = this.calculateRawTarget(input);
    const target = clamp(
      rawTarget,
      this.config.threat.minimumTarget,
      this.config.threat.maximumTarget
    );
    const creditRate =
      this.config.threat.baseCreditsPerSecond *
      target *
      Math.max(UNIT_MINIMUM, input.pacingThreatMultiplier);
    const maximumCredits = creditRate * this.config.threat.maximumCreditBankSeconds;
    const accruedCredits = creditRate * Math.max(UNIT_MINIMUM, input.deltaSeconds);

    this.availableCredits = Math.min(
      maximumCredits,
      Math.max(UNIT_MINIMUM, this.availableCredits + accruedCredits)
    );
    this.writeSnapshot(target, creditRate, maximumCredits, target !== rawTarget);
    return this.snapshot;
  }

  public spend(requestedCredits: number): number {
    const spentCredits = Math.min(
      this.availableCredits,
      Math.max(
        UNIT_MINIMUM,
        Number.isFinite(requestedCredits) ? requestedCredits : UNIT_MINIMUM
      )
    );
    this.availableCredits -= spentCredits;
    this.snapshot.availableCredits = this.availableCredits;
    return spentCredits;
  }

  public getSnapshot(): ThreatBudgetSnapshot {
    return this.snapshot;
  }

  public reset(): void {
    this.availableCredits = UNIT_MINIMUM;
    this.writeSnapshot(
      this.config.threat.minimumTarget,
      UNIT_MINIMUM,
      UNIT_MINIMUM,
      false
    );
  }

  private calculateRawTarget(input: ThreatBudgetInput): number {
    const marketPressure = clamp(input.marketPressure, UNIT_MINIMUM, UNIT_MAXIMUM);
    const headwind = clamp(input.headwind, UNIT_MINIMUM, UNIT_MAXIMUM);
    const greedPressure = clamp(
      input.greedPressure,
      UNIT_MINIMUM,
      this.config.greed.maximumPressure
    );
    const encounterPressure = clamp(
      input.encounterPressure,
      UNIT_MINIMUM,
      UNIT_MAXIMUM
    );
    const survivalPressure = clamp(
      input.survivalPressure,
      UNIT_MINIMUM,
      this.config.survival.pressureCap
    );

    return (
      survivalPressure +
      this.config.threat.weights.market * marketPressure +
      this.config.threat.weights.headwind * headwind +
      this.config.threat.weights.greed * greedPressure +
      this.config.threat.weights.encounter * encounterPressure
    );
  }

  private createSnapshot(
    target: number,
    creditRate: number,
    maximumCredits: number,
    isTargetClamped: boolean
  ): ThreatBudgetSnapshot {
    return {
      target,
      creditRate,
      availableCredits: this.availableCredits,
      maximumCredits,
      isTargetClamped,
    };
  }

  private writeSnapshot(
    target: number,
    creditRate: number,
    maximumCredits: number,
    isTargetClamped: boolean
  ): void {
    this.snapshot.target = target;
    this.snapshot.creditRate = creditRate;
    this.snapshot.availableCredits = this.availableCredits;
    this.snapshot.maximumCredits = maximumCredits;
    this.snapshot.isTargetClamped = isTargetClamped;
  }
}
