export type EngagementMonitorConfig = {
  SUSPICION_THRESHOLD: number;
  ACCRUAL_RATE: number;
  DECAY_RATE: number;
  THREAT_SCALE: number;
  ACTIVITY_THRESHOLD: number;
  /** Accrual multiplier at the activity threshold, relative to full idle. */
  IDLE_ACCRUAL_FLOOR: number;
};

/**
 * EngagementMonitor - Dynamic AFK & Engagement Accumulator
 *
 * Implements a zero-allocation leaky-bucket suspicion accumulator (Faz 4 / R2).
 * Instead of static timestamp comparisons that can be bypassed by 1-second twitch inputs,
 * suspicion accumulates during low/zero activity (scaled up by threat pressure) and decays
 * during sustained genuine player input.
 */
export class EngagementMonitor {
  private afkSuspicion = 0;

  /**
   * The config is required rather than defaulted. A local default would be a
   * second copy of numbers that have to stay equal to `FLOW_STATE_CONFIG.AFK`,
   * and tests would then be verifying tuning the game does not actually use.
   */
  constructor(private readonly config: EngagementMonitorConfig) {}

  public get suspicion(): number {
    return this.afkSuspicion;
  }

  public get isAFK(): boolean {
    return this.afkSuspicion >= this.config.SUSPICION_THRESHOLD;
  }

  /**
   * Updates the leaky-bucket suspicion accumulator.
   * Runs at 60 FPS — zero allocations.
   *
   * @param deltaSeconds Elapsed time in seconds
   * @param activity **Player-driven** activity scalar in [0, 1]. Must exclude
   *   anything the game does on the player's behalf — auto-fire in particular,
   *   or a parked player's own weapons vouch for their presence.
   * @param threatPressure Context threat scalar in [0, 1] (defaults to 0)
   * @returns Updated afkSuspicion clamped to [0, 1]
   */
  public update(
    deltaSeconds: number,
    activity: number,
    threatPressure: number = 0
  ): number {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return this.afkSuspicion;
    }

    const dt = deltaSeconds;
    const safeActivity = Math.min(
      1,
      Math.max(0, Number.isFinite(activity) ? activity : 0)
    );
    const safeThreat = Math.min(
      1,
      Math.max(0, Number.isFinite(threatPressure) ? threatPressure : 0)
    );

    const threshold = this.config.ACTIVITY_THRESHOLD;

    if (safeActivity <= threshold) {
      // Idle / low activity: accrue suspicion. The accrual tapers towards the
      // threshold but never reaches zero — otherwise activity parked exactly at
      // the threshold would neither accrue nor decay, and a bot jiggling at that
      // amplitude would sit in a dead zone forever.
      const floor = this.config.IDLE_ACCRUAL_FLOOR;
      const idleRatio =
        threshold > 0
          ? floor + (1 - floor) * ((threshold - safeActivity) / threshold)
          : 1;
      const threatMultiplier = 1 + safeThreat * this.config.THREAT_SCALE;
      const accrual = dt * this.config.ACCRUAL_RATE * threatMultiplier * idleRatio;
      this.afkSuspicion = Math.min(1, Math.max(0, this.afkSuspicion + accrual));
    } else {
      // Genuine active play: decay suspicion
      const activeRatio = (safeActivity - threshold) / (1 - threshold);
      const decay = dt * this.config.DECAY_RATE * activeRatio;
      this.afkSuspicion = Math.min(1, Math.max(0, this.afkSuspicion - decay));
    }

    return this.afkSuspicion;
  }

  /**
   * Resets the suspicion accumulator to zero.
   */
  public reset(): void {
    this.afkSuspicion = 0;
  }
}
