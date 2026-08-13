import { DIRECTOR_CONFIG_V1, type DirectorConfigV1 } from './config/DirectorConfigV1';

export class SurvivalCurve {
  private readonly config: DirectorConfigV1;

  public constructor(config: DirectorConfigV1 = DIRECTOR_CONFIG_V1) {
    this.config = config;
  }

  public getPressure(elapsedSeconds: number): number {
    const points = this.config.survival.pressurePoints;
    const safeElapsed = Math.max(0, elapsedSeconds);
    const first = points[0]!;
    if (safeElapsed <= first.elapsedSeconds) return first.pressure;

    for (let index = 1; index < points.length; index += 1) {
      const next = points[index]!;
      const previous = points[index - 1]!;
      if (safeElapsed <= next.elapsedSeconds) {
        const progress =
          (safeElapsed - previous.elapsedSeconds) /
          (next.elapsedSeconds - previous.elapsedSeconds);
        return previous.pressure + (next.pressure - previous.pressure) * progress;
      }
    }

    return this.config.survival.pressureCap;
  }

  public getDoomStacks(elapsedSeconds: number): number {
    if (elapsedSeconds <= this.config.survival.doomStartsAtSeconds) return 0;
    return Math.floor(
      (elapsedSeconds - this.config.survival.doomStartsAtSeconds) /
        this.config.survival.doomStackIntervalSeconds
    );
  }

  /**
   * Contract §8 shortens Recovery by two seconds per Doom Stack and §13 adds a
   * permanent greed reduction on top. Both are floored at the same minimum, so
   * Recovery can shrink but never disappear.
   */
  public getRecoveryDuration(
    baseSeconds: number,
    doomStacks: number,
    greedRecoveryReduction = 0
  ): number {
    const greedAdjusted =
      baseSeconds * (1 - Math.min(1, Math.max(0, greedRecoveryReduction)));
    return Math.max(
      this.config.survival.minimumRecoverySeconds,
      greedAdjusted -
        doomStacks * this.config.survival.recoveryReductionPerDoomStackSeconds
    );
  }

  /** Contract §8: Doom lowers support value, never below the configured floor. */
  public getSupportEfficiency(doomStacks: number): number {
    return Math.max(
      this.config.survival.minimumSupportEfficiency,
      1 -
        Math.max(0, doomStacks) *
          this.config.survival.supportEfficiencyReductionPerDoomStack
    );
  }

  /** Contract §8: every second Doom Stack opens an encounter-complexity slot. */
  public getEncounterComplexitySlots(doomStacks: number): number {
    return Math.floor(
      Math.max(0, doomStacks) / this.config.survival.doomStacksPerComplexitySlot
    );
  }
}
