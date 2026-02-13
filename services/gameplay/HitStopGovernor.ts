import { GAME_ENGINE } from '../../constants';
import { type HitStopEvent } from '../../types/events';

/**
 * Adapts hit-stop durations under super-crit bursts to protect frame pacing.
 */
export class HitStopGovernor {
  private readonly superCritTimestamps: number[] = [];
  private lastSuperCritAppliedAt = Number.NEGATIVE_INFINITY;

  public reset(): void {
    this.superCritTimestamps.length = 0;
    this.lastSuperCritAppliedAt = Number.NEGATIVE_INFINITY;
  }

  public getAdjustedDuration(event: HitStopEvent, nowMs: number): number {
    if (event.duration <= 0) {
      return 0;
    }

    if (!event.isSuperCrit) {
      return event.duration;
    }

    this.recordSuperCrit(nowMs);
    const superCritRate = this.getSuperCritRate(nowMs);

    if (superCritRate <= GAME_ENGINE.SUPER_CRIT_HITSTOP_RATE_THRESHOLD) {
      this.lastSuperCritAppliedAt = nowMs;
      return event.duration;
    }

    if (
      nowMs - this.lastSuperCritAppliedAt <
      GAME_ENGINE.SUPER_CRIT_HITSTOP_MIN_INTERVAL_MS
    ) {
      return 0;
    }

    const overloadRate = Math.max(
      0,
      superCritRate - GAME_ENGINE.SUPER_CRIT_HITSTOP_RATE_THRESHOLD
    );
    const normalizedOverload = Math.min(
      1,
      overloadRate / GAME_ENGINE.SUPER_CRIT_HITSTOP_MAX_OVERLOAD_RATE
    );
    const scale =
      1 - normalizedOverload * (1 - GAME_ENGINE.SUPER_CRIT_HITSTOP_MIN_SCALE);

    this.lastSuperCritAppliedAt = nowMs;
    return Math.max(
      GAME_ENGINE.SUPER_CRIT_HITSTOP_MIN_DURATION_MS,
      event.duration * scale
    );
  }

  private recordSuperCrit(nowMs: number): void {
    this.superCritTimestamps.push(nowMs);
    this.prune(nowMs);
  }

  private getSuperCritRate(nowMs: number): number {
    this.prune(nowMs);
    const windowSec = GAME_ENGINE.SUPER_CRIT_HITSTOP_WINDOW_MS / 1000;
    if (windowSec <= 0) {
      return 0;
    }
    return this.superCritTimestamps.length / windowSec;
  }

  private prune(nowMs: number): void {
    const cutoff = nowMs - GAME_ENGINE.SUPER_CRIT_HITSTOP_WINDOW_MS;
    while (
      this.superCritTimestamps.length > 0 &&
      this.superCritTimestamps[0] !== undefined &&
      this.superCritTimestamps[0] < cutoff
    ) {
      this.superCritTimestamps.shift();
    }
  }
}
