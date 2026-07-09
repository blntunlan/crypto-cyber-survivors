import { GAME_ENGINE } from '../../constants';
import { type HitStopEvent } from '../../types/events';

const BUDGET_HISTORY_CAPACITY = Math.ceil(
  GAME_ENGINE.CRIT_HITSTOP_WINDOW_BUDGET_MS / GAME_ENGINE.CRIT_HITSTOP_MIN_DURATION_MS
);

/**
 * Adapts crit hit-stop durations to protect frame pacing during dense bursts.
 */
export class HitStopGovernor {
  private readonly rateTimestamps = new Float64Array(
    GAME_ENGINE.CRIT_HITSTOP_HISTORY_CAPACITY
  );
  private readonly budgetTimestamps = new Float64Array(BUDGET_HISTORY_CAPACITY);
  private readonly budgetDurations = new Float64Array(BUDGET_HISTORY_CAPACITY);
  private rateHead = 0;
  private rateSize = 0;
  private budgetHead = 0;
  private budgetSize = 0;
  private windowAppliedDuration = 0;

  public reset(): void {
    this.rateHead = 0;
    this.rateSize = 0;
    this.budgetHead = 0;
    this.budgetSize = 0;
    this.windowAppliedDuration = 0;
  }

  public getAdjustedDuration(event: HitStopEvent, nowMs: number): number {
    if (!Number.isFinite(event.duration) || event.duration <= 0) {
      return 0;
    }

    if (!event.isCrit) {
      return event.duration;
    }

    this.prune(nowMs);
    const adjustedDuration = this.scaleForCritRate(
      event.duration,
      this.getCritRateWithIncomingEvent()
    );
    const availableBudget = Math.max(
      0,
      GAME_ENGINE.CRIT_HITSTOP_WINDOW_BUDGET_MS - this.windowAppliedDuration
    );
    const appliedDuration = Math.min(adjustedDuration, availableBudget);
    const duration =
      appliedDuration >= GAME_ENGINE.CRIT_HITSTOP_MIN_DURATION_MS ? appliedDuration : 0;

    this.recordCritRate(nowMs);
    if (duration > 0) {
      this.recordAppliedDuration(nowMs, duration);
    }

    return duration;
  }

  private scaleForCritRate(duration: number, critRate: number): number {
    if (critRate <= GAME_ENGINE.CRIT_HITSTOP_SOFT_RATE) {
      return duration;
    }

    const normalizedPressure = Math.min(
      1,
      (critRate - GAME_ENGINE.CRIT_HITSTOP_SOFT_RATE) /
        (GAME_ENGINE.CRIT_HITSTOP_HARD_RATE - GAME_ENGINE.CRIT_HITSTOP_SOFT_RATE)
    );
    const scale = 1 - normalizedPressure * (1 - GAME_ENGINE.CRIT_HITSTOP_MIN_SCALE);

    return duration * scale;
  }

  private getCritRateWithIncomingEvent(): number {
    return (this.rateSize + 1) / (GAME_ENGINE.CRIT_HITSTOP_WINDOW_MS / 1000);
  }

  private recordCritRate(nowMs: number): void {
    const capacity = GAME_ENGINE.CRIT_HITSTOP_HISTORY_CAPACITY;
    let index = (this.rateHead + this.rateSize) % capacity;

    if (this.rateSize === capacity) {
      index = this.rateHead;
      this.rateHead = (this.rateHead + 1) % capacity;
    } else {
      this.rateSize += 1;
    }

    this.rateTimestamps[index] = nowMs;
  }

  private recordAppliedDuration(nowMs: number, duration: number): void {
    const index = (this.budgetHead + this.budgetSize) % BUDGET_HISTORY_CAPACITY;

    this.budgetTimestamps[index] = nowMs;
    this.budgetDurations[index] = duration;
    this.budgetSize += 1;
    this.windowAppliedDuration += duration;
  }

  private prune(nowMs: number): void {
    const cutoff = nowMs - GAME_ENGINE.CRIT_HITSTOP_WINDOW_MS;

    while (this.rateSize > 0 && this.rateTimestamps[this.rateHead]! <= cutoff) {
      this.rateHead = (this.rateHead + 1) % GAME_ENGINE.CRIT_HITSTOP_HISTORY_CAPACITY;
      this.rateSize -= 1;
    }

    while (this.budgetSize > 0 && this.budgetTimestamps[this.budgetHead]! <= cutoff) {
      this.windowAppliedDuration -= this.budgetDurations[this.budgetHead]!;
      this.budgetHead = (this.budgetHead + 1) % BUDGET_HISTORY_CAPACITY;
      this.budgetSize -= 1;
    }
  }
}
