import { type WorldEventEncounterOutput } from '@/game-v2/contracts/EncounterOutput';

export type HazardLifecyclePhase = 'IDLE' | 'TELEGRAPHING' | 'ACTIVE';

/**
 * One step's edges, mirroring `IndicatorEventStepResult`'s shape: the
 * current phase plus which transitions (if any) fired on this exact tick.
 */
export type HazardLifecycleStepResult = Readonly<{
  phase: HazardLifecyclePhase;
  hazardId: string | null;
  activatedThisTick: boolean;
  expiredThisTick: boolean;
}>;

const assertTick = (tick: number, lastTick: number | null): void => {
  if (!Number.isSafeInteger(tick) || tick < 0) {
    throw new RangeError('tick must be a safe non-negative integer');
  }
  if (lastTick !== null && tick <= lastTick) {
    throw new RangeError('tick must strictly increase between activate()/step() calls');
  }
};

/**
 * The generic `IDLE → TELEGRAPHING → ACTIVE → IDLE` hazard-lifecycle cycle
 * (design's "Telegraph and lifecycle are simulation-time controlled",
 * `V2-209`). Mechanism only: no concrete family's real active-duration is
 * hardcoded here — `activate` takes it as an explicit parameter, mirroring
 * `IndicatorEventStateMachine`'s own profile-driven design (`V2-203`).
 *
 * Tick-driven only, never wall-clock/`setTimeout`, matching
 * `IndicatorEventStateMachine`'s own monotonic fixed-step convention
 * (V2-ADR-103) — the literal proof of "lifecycle is simulation-time
 * controlled."
 */
export class HazardLifecycle {
  private phase: HazardLifecyclePhase = 'IDLE';
  private hazardId: string | null = null;
  private activeAtTick = 0;
  private expiresAtTick = 0;
  private lastTick: number | null = null;

  public get currentPhase(): HazardLifecyclePhase {
    return this.phase;
  }

  /**
   * Arms a new hazard on `tick` (the tick its `WorldEventEncounterOutput`
   * was produced). `output.telegraphTicks` is always a positive integer
   * (`assertWorldEventEncounterOutput`), so the `TELEGRAPHING → ACTIVE`
   * transition can never land on this same tick — no same-tick cascade is
   * needed here, unlike `IndicatorEventStateMachine`'s `confirmationTicks:
   * 0` case.
   *
   * Throws if a hazard is already in flight — defensive: `V2-207`'s
   * composer selects at most one primary per tick, and a real family's own
   * cooldown is structurally `>= telegraphTicks + activeTicks`
   * (V2-ADR-134 for `Volatility Surge`), which already prevents a second
   * real activation before this one clears. This guard is kept anyway as a
   * structural invariant, mirroring `IndicatorEventStateMachine.reset()`'s
   * own "kept defensively though currently unreachable" precedent.
   */
  public activate(
    output: WorldEventEncounterOutput,
    activeTicks: number,
    tick: number
  ): void {
    assertTick(tick, this.lastTick);

    if (this.phase !== 'IDLE') {
      throw new RangeError(
        'hazard lifecycle cannot activate a second hazard while one is in flight'
      );
    }

    if (!Number.isInteger(activeTicks) || activeTicks <= 0) {
      throw new RangeError('active ticks must be a positive integer');
    }

    this.phase = 'TELEGRAPHING';
    this.hazardId = output.hazardId;
    this.activeAtTick = tick + output.telegraphTicks;
    this.expiresAtTick = this.activeAtTick + activeTicks;
    this.lastTick = tick;
  }

  /** Advances one tick. A no-op transition-wise while `IDLE`. */
  public step(tick: number): HazardLifecycleStepResult {
    assertTick(tick, this.lastTick);
    this.lastTick = tick;

    let activatedThisTick = false;
    let expiredThisTick = false;

    if (this.phase === 'TELEGRAPHING' && tick >= this.activeAtTick) {
      this.phase = 'ACTIVE';
      activatedThisTick = true;
    }

    if (this.phase === 'ACTIVE' && tick >= this.expiresAtTick) {
      this.phase = 'IDLE';
      this.hazardId = null;
      expiredThisTick = true;
    }

    return Object.freeze({
      phase: this.phase,
      hazardId: this.hazardId,
      activatedThisTick,
      expiredThisTick,
    });
  }

  /** Returns the machine to a state indistinguishable from a fresh instance. */
  public reset(): void {
    this.phase = 'IDLE';
    this.hazardId = null;
    this.activeAtTick = 0;
    this.expiresAtTick = 0;
    this.lastTick = null;
  }
}
