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

  private currentTick = 0;

  private isPaused = false;

  private readonly advanceResult: ClockAdvanceResult = {
    steps: 0,
    interpolationAlpha: 0,
    droppedMilliseconds: 0,
  };

  public get tick(): number {
    return this.currentTick;
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public reset(): void {
    this.accumulatorMs = 0;
    this.currentTick = 0;
    this.isPaused = false;
    this.advanceResult.steps = 0;
    this.advanceResult.interpolationAlpha = 0;
    this.advanceResult.droppedMilliseconds = 0;
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
    let droppedMilliseconds = renderDeltaMs - acceptedDeltaMs;
    this.accumulatorMs += acceptedDeltaMs;

    while (
      this.advanceResult.steps < MAX_CATCH_UP_STEPS &&
      this.accumulatorMs + ACCUMULATOR_EPSILON_MS >= SIMULATION_STEP_MS
    ) {
      this.accumulatorMs -= SIMULATION_STEP_MS;
      if (this.accumulatorMs < 0 && this.accumulatorMs > -ACCUMULATOR_EPSILON_MS) {
        this.accumulatorMs = 0;
      }

      this.currentTick += 1;
      this.advanceResult.steps += 1;
      step();
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
