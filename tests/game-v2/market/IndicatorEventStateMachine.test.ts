import { describe, expect, it } from 'vitest';

import { assertIndicatorEventProfile } from '@/game-v2/contracts/IndicatorEventProfile';
import { IndicatorEventStateMachine } from '@/game-v2/market/IndicatorEventStateMachine';

/**
 * Mirrors design §7.4's own worked example exactly: entering below 25
 * requires recovering above 30 (exitThreshold 25 + hysteresis 5) before
 * rearming. A synthetic test fixture, not a real indicator family
 * (`V2-204`+ authors those).
 */
const OVERSOLD_PROFILE = assertIndicatorEventProfile({
  id: 'test-oversold',
  direction: 'below',
  entryThreshold: 25,
  exitThreshold: 25,
  confirmationTicks: 2,
  cooldownTicks: 3,
  hysteresis: 5,
  priority: 1,
  outputKind: 'spawn',
  compatibleWith: [],
});

const OVERBOUGHT_PROFILE = assertIndicatorEventProfile({
  id: 'test-overbought',
  direction: 'above',
  entryThreshold: 75,
  exitThreshold: 75,
  confirmationTicks: 2,
  cooldownTicks: 3,
  hysteresis: 5,
  priority: 1,
  outputKind: 'spawn',
  compatibleWith: [],
});

/** Drives a fixed sample for `count` ticks starting at `startTick`, returning every step result. */
const driveConstant = (
  machine: IndicatorEventStateMachine,
  sample: number,
  startTick: number,
  count: number
): ReturnType<IndicatorEventStateMachine['step']>[] => {
  const results: ReturnType<IndicatorEventStateMachine['step']>[] = [];
  for (let index = 0; index < count; index += 1) {
    results.push(machine.step(sample, startTick + index));
  }
  return results;
};

describe('IndicatorEventStateMachine — ARMED to CONFIRMING', () => {
  it('arms into CONFIRMING the tick the entry condition is met', () => {
    const machine = new IndicatorEventStateMachine(OVERSOLD_PROFILE);

    expect(machine.currentState).toBe('ARMED');
    const result = machine.step(24, 0);

    expect(result.state).toBe('CONFIRMING');
  });

  it('stays ARMED while the entry condition is not met', () => {
    const machine = new IndicatorEventStateMachine(OVERSOLD_PROFILE);
    const results = driveConstant(machine, 50, 0, 5);

    expect(results.every(result => result.state === 'ARMED')).toBe(true);
  });
});

describe('IndicatorEventStateMachine — confirmation and its failure (V2-ADR-100)', () => {
  it('promotes to ACTIVE exactly confirmationTicks after arming, exactly once', () => {
    const machine = new IndicatorEventStateMachine(OVERSOLD_PROFILE);

    machine.step(24, 0); // ARMED -> CONFIRMING (tick 0)
    const held1 = machine.step(24, 1); // 1 tick elapsed since arming
    expect(held1.state).toBe('CONFIRMING');
    expect(held1.activatedThisTick).toBe(false);

    // confirmationTicks = 2: promotion lands on the tick 2 ticks after arming.
    const promoted = machine.step(24, 2);
    expect(promoted.state).toBe('ACTIVE');
    expect(promoted.activatedThisTick).toBe(true);
  });

  it('reverts CONFIRMING to ARMED immediately if the entry condition fails, with no cooldown', () => {
    const machine = new IndicatorEventStateMachine(OVERSOLD_PROFILE);

    machine.step(24, 0); // ARMED -> CONFIRMING
    const bounced = machine.step(26, 1); // entry condition fails

    expect(bounced.state).toBe('ARMED');
    expect(bounced.activatedThisTick).toBe(false);
    expect(bounced.endedThisTick).toBe(false);

    // No cooldown: re-arming on the very next tick works immediately.
    const rearmedImmediately = machine.step(24, 2);
    expect(rearmedImmediately.state).toBe('CONFIRMING');
  });

  it('promotes on the same tick it arms when confirmationTicks is 0', () => {
    const instantProfile = assertIndicatorEventProfile({
      ...OVERSOLD_PROFILE,
      confirmationTicks: 0,
    });
    const machine = new IndicatorEventStateMachine(instantProfile);

    const result = machine.step(24, 0);
    expect(result.state).toBe('ACTIVE');
    expect(result.activatedThisTick).toBe(true);
  });
});

describe('IndicatorEventStateMachine — ACTIVE to COOLDOWN', () => {
  const activateAt = (
    machine: IndicatorEventStateMachine,
    startTick: number
  ): number => {
    machine.step(24, startTick);
    machine.step(24, startTick + 1);
    machine.step(24, startTick + 2);
    return startTick + 3;
  };

  it('ends ACTIVE into COOLDOWN when the exit condition is met', () => {
    const machine = new IndicatorEventStateMachine(OVERSOLD_PROFILE);
    const activatedAtTick = activateAt(machine, 0);
    expect(machine.currentState).toBe('ACTIVE');

    const ended = machine.step(28, activatedAtTick + 1);
    expect(ended.state).toBe('COOLDOWN');
    expect(ended.endedThisTick).toBe(true);
  });
});

describe("IndicatorEventStateMachine — design's own worked example (V2-ADR-101)", () => {
  it('a 26 -> 24 -> 28 -> 23 sequence cannot spam a second activation', () => {
    const machine = new IndicatorEventStateMachine(OVERSOLD_PROFILE);
    let tick = 0;

    const step26 = machine.step(26, tick++);
    expect(step26.state).toBe('ARMED');

    const step24 = machine.step(24, tick++); // arms
    expect(step24.state).toBe('CONFIRMING');

    // Hold long enough to confirm (confirmationTicks = 2).
    machine.step(24, tick++);
    const confirmed = machine.step(24, tick++);
    expect(confirmed.state).toBe('ACTIVE');

    const step28 = machine.step(28, tick++); // exits ACTIVE, but 28 < rearm(30)
    expect(step28.state).toBe('COOLDOWN');
    expect(step28.rearmedThisTick).toBe(false);

    // The second dip below 25 must NOT produce a second activation: the
    // machine only watches for cooldownTicks + rearm while in COOLDOWN.
    const step23 = machine.step(23, tick++);
    expect(step23.state).toBe('COOLDOWN');
    expect(step23.activatedThisTick).toBe(false);
  });
});

describe('IndicatorEventStateMachine — COOLDOWN requires both gates (V2-ADR-101)', () => {
  const enterCooldownAt = (
    machine: IndicatorEventStateMachine,
    startTick: number
  ): number => {
    machine.step(24, startTick);
    machine.step(24, startTick + 1);
    machine.step(24, startTick + 2); // ACTIVE
    machine.step(28, startTick + 3); // COOLDOWN, cooldownTicksElapsed becomes 1
    return startTick + 4;
  };

  it('does not rearm once cooldownTicks elapse if the rearm threshold is never crossed', () => {
    const machine = new IndicatorEventStateMachine(OVERSOLD_PROFILE);
    const nextTick = enterCooldownAt(machine, 0);

    // cooldownTicks = 3; one already elapsed entering COOLDOWN, so two more
    // ticks fully exhausts the timer while the sample never reaches 30.
    const afterTimer1 = machine.step(28, nextTick);
    expect(afterTimer1.state).toBe('COOLDOWN');
    const afterTimer2 = machine.step(28, nextTick + 1);
    expect(afterTimer2.state).toBe('COOLDOWN');
    expect(afterTimer2.rearmedThisTick).toBe(false);
  });

  it('does not rearm once the rearm threshold is crossed if cooldownTicks have not elapsed', () => {
    const longCooldownProfile = assertIndicatorEventProfile({
      ...OVERSOLD_PROFILE,
      cooldownTicks: 10,
    });
    const machine = new IndicatorEventStateMachine(longCooldownProfile);
    const nextTick = enterCooldownAt(machine, 0);

    const result = machine.step(35, nextTick); // well past the rearm threshold
    expect(result.state).toBe('COOLDOWN');
    expect(result.rearmedThisTick).toBe(false);
  });

  it('rearms exactly on the tick both gates are satisfied', () => {
    const machine = new IndicatorEventStateMachine(OVERSOLD_PROFILE);
    let tick = enterCooldownAt(machine, 0);

    // cooldownTicksElapsed is 1 after entering COOLDOWN; two more ticks
    // reach cooldownTicks = 3 while the sample stays below the rearm point.
    machine.step(28, tick++);
    const stillCooling = machine.step(28, tick++);
    expect(stillCooling.state).toBe('COOLDOWN');
    expect(stillCooling.rearmedThisTick).toBe(false);

    const rearmed = machine.step(31, tick++);
    expect(rearmed.state).toBe('ARMED');
    expect(rearmed.rearmedThisTick).toBe(true);
  });
});

describe('IndicatorEventStateMachine — symmetric above-direction behavior', () => {
  it('mirrors the full cycle for an above-direction profile', () => {
    const machine = new IndicatorEventStateMachine(OVERBOUGHT_PROFILE);
    let tick = 0;

    expect(machine.step(50, tick++).state).toBe('ARMED');
    expect(machine.step(80, tick++).state).toBe('CONFIRMING');
    machine.step(80, tick++);
    const activated = machine.step(80, tick++);
    expect(activated.state).toBe('ACTIVE');
    expect(activated.activatedThisTick).toBe(true);

    const ended = machine.step(70, tick++); // exit: sample <= 75; cooldownTicksElapsed becomes 1
    expect(ended.state).toBe('COOLDOWN');

    // 72 stays above the rearm threshold (75 - 5 = 70), so even once the
    // cooldown timer fully elapses (cooldownTicks = 3) the machine must
    // not rearm — both gates are independently required, mirroring the
    // dedicated below-direction dual-gate tests above.
    machine.step(72, tick++); // cooldownTicksElapsed becomes 2
    const timerElapsedButNotRearmed = machine.step(72, tick++); // cooldownTicksElapsed becomes 3
    expect(timerElapsedButNotRearmed.state).toBe('COOLDOWN');
    expect(timerElapsedButNotRearmed.rearmedThisTick).toBe(false);

    const rearmed = machine.step(69, tick++); // below the rearm threshold
    expect(rearmed.state).toBe('ARMED');
    expect(rearmed.rearmedThisTick).toBe(true);
  });
});

describe('IndicatorEventStateMachine — reset', () => {
  it('returns to ARMED and clears counters, indistinguishable from a fresh instance', () => {
    const machine = new IndicatorEventStateMachine(OVERSOLD_PROFILE);

    machine.step(24, 0);
    machine.step(24, 1); // partway through confirmation

    machine.reset();

    expect(machine.currentState).toBe('ARMED');

    // A fresh confirmation cycle must take the full confirmationTicks
    // again, proving the counter was actually cleared, not merely the
    // state label.
    machine.step(24, 0);
    const stillConfirming = machine.step(24, 1);
    expect(stillConfirming.state).toBe('CONFIRMING');
    expect(stillConfirming.activatedThisTick).toBe(false);
  });

  it('allows re-stepping from tick 0 after reset, proving the monotonic-tick guard was cleared too', () => {
    const machine = new IndicatorEventStateMachine(OVERSOLD_PROFILE);
    machine.step(50, 5);
    machine.reset();

    expect(() => machine.step(50, 0)).not.toThrow();
  });
});

describe('IndicatorEventStateMachine — input validation', () => {
  it('rejects a non-finite sample', () => {
    const machine = new IndicatorEventStateMachine(OVERSOLD_PROFILE);
    expect(() => machine.step(Number.NaN, 0)).toThrow(RangeError);
  });

  it('rejects a non-monotonic tick', () => {
    const machine = new IndicatorEventStateMachine(OVERSOLD_PROFILE);
    machine.step(50, 5);
    expect(() => machine.step(50, 5)).toThrow(RangeError);
    expect(() => machine.step(50, 4)).toThrow(RangeError);
  });

  it('rejects a non-integer or negative tick', () => {
    const machine = new IndicatorEventStateMachine(OVERSOLD_PROFILE);
    expect(() => machine.step(50, 1.5)).toThrow(RangeError);
    expect(() => machine.step(50, -1)).toThrow(RangeError);
  });
});
