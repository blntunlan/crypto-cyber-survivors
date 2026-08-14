export type RunPerformanceSnapshot = {
  /**
   * Contract §14: direction is scored on the whole run, not the exit tick, so
   * a lucky final candle cannot rewrite how the trade actually went.
   */
  timeWeightedAlignment: number;
  /** Alignment at the moment the run ended. */
  exitAlignment: number;
  /** Contract §17: build performance, averaged over the run. */
  combatMastery: number;
  peakCombatMastery: number;
  trackedSeconds: number;
};

const clampSigned = (value: number): number =>
  Math.min(1, Math.max(-1, Number.isFinite(value) ? value : 0));

const clampUnit = (value: number): number =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

/**
 * Accumulates the run-long numbers the settlement and the end-of-run summary
 * both need (§14 / §17).
 *
 * It integrates over elapsed time rather than over commits, so a frame-rate
 * change or a pause cannot quietly reweight the result.
 */
export class RunPerformanceTracker {
  private alignmentIntegral = 0;
  private masteryIntegral = 0;
  private trackedSeconds = 0;
  private exitAlignment = 0;
  private peakCombatMastery = 0;
  private readonly snapshot: RunPerformanceSnapshot = {
    timeWeightedAlignment: 0,
    exitAlignment: 0,
    combatMastery: 0,
    peakCombatMastery: 0,
    trackedSeconds: 0,
  };

  public record(alignment: number, combatMastery: number, deltaSeconds: number): void {
    const safeAlignment = clampSigned(alignment);
    const safeMastery = clampUnit(combatMastery);
    this.exitAlignment = safeAlignment;
    this.peakCombatMastery = Math.max(this.peakCombatMastery, safeMastery);

    const delta = Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0);
    if (delta === 0) return;

    this.alignmentIntegral += safeAlignment * delta;
    this.masteryIntegral += safeMastery * delta;
    this.trackedSeconds += delta;
  }

  public getSnapshot(): RunPerformanceSnapshot {
    const seconds = this.trackedSeconds;
    this.snapshot.timeWeightedAlignment =
      seconds > 0 ? this.alignmentIntegral / seconds : 0;
    this.snapshot.combatMastery = seconds > 0 ? this.masteryIntegral / seconds : 0;
    this.snapshot.exitAlignment = this.exitAlignment;
    this.snapshot.peakCombatMastery = this.peakCombatMastery;
    this.snapshot.trackedSeconds = seconds;
    return this.snapshot;
  }

  public reset(): void {
    this.alignmentIntegral = 0;
    this.masteryIntegral = 0;
    this.trackedSeconds = 0;
    this.exitAlignment = 0;
    this.peakCombatMastery = 0;
  }
}
