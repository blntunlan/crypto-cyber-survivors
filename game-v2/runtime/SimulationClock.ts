import {
  MAX_CATCH_UP_STEPS,
  MAX_RENDER_DELTA_MS,
  SIMULATION_STEP_MS,
} from '@/game-v2/config/Mvp0Config';

const ACCUMULATOR_EPSILON_MS = 1e-9;

export type ClockStep = () => void;

export type ClockAdvanceResult = {
  steps: number;
  interpolationAlpha: number;
  droppedMilliseconds: number;
};

export class SimulationClock {
  private accumulatorMs = 0;

  private attemptedSteps = 0;

  private isPaused = false;

  private readonly advanceResult: ClockAdvanceResult = {
    steps: 0,
    interpolationAlpha: 0,
    droppedMilliseconds: 0,
  };

  /**
   * Fixed steps this clock has driven, which is not the simulation tick.
   *
   * A step callback may refuse the step — the run is over, an upgrade card is
   * open, or a recording is exhausted — and the clock cannot see that. The
   * simulation tick has exactly one owner, `GameV2Runtime.tick`, and this
   * counter must never be substituted for it (V2-ADR-033).
   */
  public get stepsAttempted(): number {
    return this.attemptedSteps;
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public reset(): void {
    this.accumulatorMs = 0;
    this.attemptedSteps = 0;
    this.isPaused = false;
    this.advanceResult.steps = 0;
    this.advanceResult.interpolationAlpha = 0;
    this.advanceResult.droppedMilliseconds = 0;
  }

  /**
   * Reads the pause flag through a call so control-flow narrowing cannot treat
   * it as still false after the guard at the top of `advance`. The step
   * callback runs between those two reads and is allowed to pause the clock.
   */
  private pausedNow(): boolean {
    return this.isPaused;
  }

  public advance(renderDeltaMs: number, step: ClockStep): ClockAdvanceResult {
    if (!Number.isFinite(renderDeltaMs) || renderDeltaMs < 0) {
      throw new RangeError('renderDeltaMs must be a finite, non-negative number');
    }

    this.advanceResult.steps = 0;
    this.advanceResult.interpolationAlpha = 0;
    this.advanceResult.droppedMilliseconds = 0;

    if (this.isPaused) {
      this.advanceResult.interpolationAlpha = this.accumulatorMs / SIMULATION_STEP_MS;
      return this.advanceResult;
    }

    const acceptedDeltaMs = Math.min(renderDeltaMs, MAX_RENDER_DELTA_MS);
    let droppedMilliseconds = 0;
    this.accumulatorMs += acceptedDeltaMs;

    while (
      this.advanceResult.steps < MAX_CATCH_UP_STEPS &&
      this.accumulatorMs + ACCUMULATOR_EPSILON_MS >= SIMULATION_STEP_MS
    ) {
      this.accumulatorMs -= SIMULATION_STEP_MS;
      if (this.accumulatorMs < 0 && this.accumulatorMs > -ACCUMULATOR_EPSILON_MS) {
        this.accumulatorMs = 0;
      }

      this.attemptedSteps += 1;
      this.advanceResult.steps += 1;
      step();

      // A step may pause the clock from inside the callback. Continuing to
      // drain the accumulator for steps that can no longer do anything would
      // discard the interpolation alpha the paused frame must hold.
      if (this.pausedNow()) {
        break;
      }
    }

    if (this.accumulatorMs + ACCUMULATOR_EPSILON_MS >= SIMULATION_STEP_MS) {
      droppedMilliseconds += this.accumulatorMs;
      this.accumulatorMs = 0;
    }

    this.advanceResult.interpolationAlpha = this.accumulatorMs / SIMULATION_STEP_MS;
    this.advanceResult.droppedMilliseconds = droppedMilliseconds;

    return this.advanceResult;
  }
}
