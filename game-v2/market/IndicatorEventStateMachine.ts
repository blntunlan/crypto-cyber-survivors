import { type IndicatorEventProfile } from '@/game-v2/contracts/IndicatorEventProfile';

export type IndicatorEventState = 'ARMED' | 'CONFIRMING' | 'ACTIVE' | 'COOLDOWN';

/**
 * One step's edges, mirroring `ProgressionStepResult`'s shape: the current
 * state plus which transitions (if any) fired on this exact tick, rather
 * than requiring the caller to diff two polled states.
 */
export type IndicatorEventStepResult = Readonly<{
  state: IndicatorEventState;
  activatedThisTick: boolean;
  endedThisTick: boolean;
  rearmedThisTick: boolean;
}>;

const isEntryConditionMet = (
  profile: IndicatorEventProfile,
  sample: number
): boolean =>
  profile.direction === 'below'
    ? sample < profile.entryThreshold
    : sample > profile.entryThreshold;

const isExitConditionMet = (profile: IndicatorEventProfile, sample: number): boolean =>
  profile.direction === 'below'
    ? sample >= profile.exitThreshold
    : sample <= profile.exitThreshold;

const isRearmConditionMet = (
  profile: IndicatorEventProfile,
  sample: number
): boolean =>
  profile.direction === 'below'
    ? sample >= profile.exitThreshold + profile.hysteresis
    : sample <= profile.exitThreshold - profile.hysteresis;

/**
 * The generic `ARMED → CONFIRMING → ACTIVE → COOLDOWN → ARMED` cycle
 * (design §7.4, `V2-203`). Mechanism only: no concrete indicator family
 * drives it yet (`V2-204`+), and it is not wired into any runtime.
 *
 * `CONFIRMING` failing its entry condition reverts directly to `ARMED`
 * with no cooldown (V2-ADR-100): no event was ever confirmed, so there is
 * nothing to protect against re-triggering. `COOLDOWN → ARMED` requires
 * both `cooldownTicks` to have elapsed and the sample to have crossed the
 * rearm threshold, whichever gate resolves later (V2-ADR-101) — this is
 * the mechanism that keeps a noisy sample sequence from spamming a second
 * activation before it has genuinely recovered.
 */
export class IndicatorEventStateMachine {
  private readonly profile: IndicatorEventProfile;
  private state: IndicatorEventState = 'ARMED';
  private confirmationTicksHeld = 0;
  private cooldownTicksElapsed = 0;
  private lastTick: number | null = null;

  public constructor(profile: IndicatorEventProfile) {
    this.profile = profile;
  }

  public get currentState(): IndicatorEventState {
    return this.state;
  }

  /**
   * Advances one tick with the current indicator sample. `tick` must be
   * strictly greater than the previous call's tick (or the machine must
   * have just been constructed/reset) — mirrors this project's monotonic
   * fixed-step convention without depending on the ECS `StepContext`,
   * which carries a `PlayerIntent` this market-domain machine has no
   * relationship to (V2-ADR-103).
   */
  public step(sample: number, tick: number): IndicatorEventStepResult {
    if (!Number.isFinite(sample)) {
      throw new RangeError('indicator sample must be finite');
    }

    if (!Number.isSafeInteger(tick) || tick < 0) {
      throw new RangeError('tick must be a safe non-negative integer');
    }

    if (this.lastTick !== null && tick <= this.lastTick) {
      throw new RangeError('tick must strictly increase between step() calls');
    }

    this.lastTick = tick;

    let activatedThisTick = false;
    let endedThisTick = false;
    let rearmedThisTick = false;

    if (this.state === 'ARMED') {
      if (isEntryConditionMet(this.profile, sample)) {
        this.state = 'CONFIRMING';
        this.confirmationTicksHeld = 0;
      }
    }

    // Not an `else if`: a same-tick `ARMED → CONFIRMING` transition above
    // must still be evaluated against this tick's own sample, exactly as
    // a `CONFIRMING` entity that started on an earlier tick would be —
    // otherwise a profile with `confirmationTicks: 0` could never reach
    // `ACTIVE` on the very tick it arms.
    if (this.state === 'CONFIRMING') {
      if (!isEntryConditionMet(this.profile, sample)) {
        this.state = 'ARMED';
        this.confirmationTicksHeld = 0;
      } else if (this.confirmationTicksHeld >= this.profile.confirmationTicks) {
        this.state = 'ACTIVE';
        activatedThisTick = true;
      } else {
        this.confirmationTicksHeld += 1;
      }
    }

    if (this.state === 'ACTIVE') {
      if (isExitConditionMet(this.profile, sample)) {
        this.state = 'COOLDOWN';
        this.cooldownTicksElapsed = 0;
        endedThisTick = true;
      }
    }

    if (this.state === 'COOLDOWN') {
      this.cooldownTicksElapsed += 1;

      const cooldownElapsed = this.cooldownTicksElapsed >= this.profile.cooldownTicks;
      const rearmed = isRearmConditionMet(this.profile, sample);

      if (cooldownElapsed && rearmed) {
        this.state = 'ARMED';
        rearmedThisTick = true;
      }
    }

    return Object.freeze({
      state: this.state,
      activatedThisTick,
      endedThisTick,
      rearmedThisTick,
    });
  }

  /** Returns the machine to a state indistinguishable from a fresh instance. */
  /**
   * `confirmationTicksHeld`/`cooldownTicksElapsed` are cleared here as a
   * defensive guard, but both are already unconditionally re-zeroed at
   * their own natural entry points (arming and entering `COOLDOWN`
   * respectively) regardless of `reset()` — no external call sequence can
   * observe a stale value, since `reset()` always returns to `ARMED` and
   * the very next `step()` that arms overwrites `confirmationTicksHeld`
   * itself. Kept anyway so a future refactor of those entry points cannot
   * silently turn this into a real bug (mirrors `CombatSystem`'s own
   * `health <= 0` guard: unreachable today, retained on purpose).
   */
  public reset(): void {
    this.state = 'ARMED';
    this.confirmationTicksHeld = 0;
    this.cooldownTicksElapsed = 0;
    this.lastTick = null;
  }
}
