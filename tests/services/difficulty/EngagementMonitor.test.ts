import { beforeEach, describe, expect, it } from 'vitest';
import { EngagementMonitor } from '../../../services/difficulty/EngagementMonitor';
import {
  FLOW_STATE_CONFIG,
  FlowStateManager,
} from '../../../services/difficulty/FlowStateManager';
import {
  CoreGameplayLoop,
  CORE_GAMEPLAY_LOOP_CONFIG,
} from '../../../services/gameplay/CoreGameplayLoop';

describe('EngagementMonitor (Faz 4 / R2 dynamic AFK detection)', () => {
  let monitor: EngagementMonitor;

  beforeEach(() => {
    monitor = new EngagementMonitor(FLOW_STATE_CONFIG.AFK);
  });

  it('satisfies Invariant 1: closes the 9s-idle / 1s-active exploit within asserted cycle count', () => {
    // Simulating repeated cycles of 9s zero activity + 1s full activity at 60 FPS (dt = 1/60s)
    const dt = 1 / 60;
    const idleFrames = 9 * 60;
    const activeFrames = 1 * 60;
    const cycleEndSuspicions: number[] = [];

    const totalCycles = 4;
    for (let cycle = 0; cycle < totalCycles; cycle++) {
      // 9s of zero activity
      for (let f = 0; f < idleFrames; f++) {
        monitor.update(dt, 0, 0);
      }
      const peakSuspicion = monitor.suspicion;
      expect(peakSuspicion).toBeGreaterThan(0);

      // 1s of full activity (twitch)
      for (let f = 0; f < activeFrames; f++) {
        monitor.update(dt, 1, 0);
      }
      cycleEndSuspicions.push(monitor.suspicion);
    }

    // Suspicion must rise monotonically across cycles
    expect(cycleEndSuspicions[0]!).toBeGreaterThan(0);
    expect(cycleEndSuspicions[1]!).toBeGreaterThan(cycleEndSuspicions[0]!);
    expect(cycleEndSuspicions[2]!).toBeGreaterThanOrEqual(cycleEndSuspicions[1]!);

    // Specific asserted cycle count: exactly 2 cycles to cross threshold at end-of-cycle
    expect(cycleEndSuspicions[0]!).toBeLessThan(
      FLOW_STATE_CONFIG.AFK.SUSPICION_THRESHOLD
    );
    expect(cycleEndSuspicions[1]!).toBeGreaterThanOrEqual(
      FLOW_STATE_CONFIG.AFK.SUSPICION_THRESHOLD
    );
    expect(monitor.isAFK).toBe(true);
  });

  it('satisfies Invariant 2: genuine play never trips AFK suspicion', () => {
    const dt = 1 / 60;
    // Simulate 300 seconds (5 minutes) of continuous play with activity > threshold
    for (let f = 0; f < 300 * 60; f++) {
      // Activity varying between 0.2 and 1.0 (all well above 0.08 threshold)
      const activity = 0.2 + 0.8 * Math.abs(Math.sin(f * 0.01));
      monitor.update(dt, activity, 0);
    }

    expect(monitor.suspicion).toBe(0);
    expect(monitor.isAFK).toBe(false);
  });

  it('satisfies Invariant 3: a real break decays back in bounded time upon return', () => {
    // 1. Player steps away: idle for 20 seconds, suspicion saturates at 1.0
    for (let f = 0; f < 20 * 60; f++) {
      monitor.update(1 / 60, 0, 0);
    }
    expect(monitor.suspicion).toBe(1.0);
    expect(monitor.isAFK).toBe(true);

    // 2. Player returns and plays actively: suspicion must drop below threshold in bounded time
    const recoverySecondsMax = 6.0;
    let secondsToClearAFK = 0;
    let secondsToZero = 0;
    let currentSeconds = 0;

    while (currentSeconds < recoverySecondsMax) {
      currentSeconds += 1 / 60;
      monitor.update(1 / 60, 1.0, 0);
      if (!monitor.isAFK && secondsToClearAFK === 0) {
        secondsToClearAFK = currentSeconds;
      }
      if (monitor.suspicion === 0 && secondsToZero === 0) {
        secondsToZero = currentSeconds;
      }
    }

    // Must clear AFK within ~2.5s and fully reach zero within 5.5s
    expect(secondsToClearAFK).toBeGreaterThan(0);
    expect(secondsToClearAFK).toBeLessThanOrEqual(3.0);
    expect(secondsToZero).toBeGreaterThan(0);
    expect(secondsToZero).toBeLessThanOrEqual(5.5);
    expect(monitor.suspicion).toBe(0);
    expect(monitor.isAFK).toBe(false);
  });

  it('satisfies Invariant 4: threat pressure strictly scales up accrual rate', () => {
    const lowThreatMonitor = new EngagementMonitor(FLOW_STATE_CONFIG.AFK);
    const highThreatMonitor = new EngagementMonitor(FLOW_STATE_CONFIG.AFK);

    // 5 seconds of identical zero activity at threat=0 vs threat=1
    const dt = 1;
    for (let s = 0; s < 5; s++) {
      lowThreatMonitor.update(dt, 0, 0);
      highThreatMonitor.update(dt, 0, 1);
    }

    expect(highThreatMonitor.suspicion).toBeGreaterThan(lowThreatMonitor.suspicion);
    expect(highThreatMonitor.suspicion).toBeCloseTo(
      lowThreatMonitor.suspicion * (1 + FLOW_STATE_CONFIG.AFK.THREAT_SCALE),
      5
    );
  });

  it('satisfies Invariant 5: bounds [0, 1] hold under extreme and absurd inputs', () => {
    // Non-positive delta seconds
    expect(monitor.update(0, 0, 0)).toBe(0);
    expect(monitor.update(-10, 0, 0)).toBe(0);
    expect(monitor.update(NaN, 0, 0)).toBe(0);

    // Absurd delta seconds (10,000s)
    monitor.update(10_000, 0, 0);
    expect(monitor.suspicion).toBe(1.0);
    expect(monitor.suspicion).toBeLessThanOrEqual(1.0);
    expect(monitor.suspicion).toBeGreaterThanOrEqual(0);

    // Absurd delta seconds decay
    monitor.update(10_000, 1.0, 0);
    expect(monitor.suspicion).toBe(0);

    // Out-of-range activity inputs (<0 and >1)
    monitor.update(5, -999, 0);
    expect(monitor.suspicion).toBeGreaterThan(0);
    expect(monitor.suspicion).toBeLessThanOrEqual(1.0);

    monitor.update(5, 999, 0);
    expect(monitor.suspicion).toBe(0);

    // Out-of-range threat inputs
    monitor.update(1, 0, -50);
    expect(monitor.suspicion).toBeGreaterThan(0);
    monitor.reset();
    monitor.update(1, 0, 500);
    expect(monitor.suspicion).toBeLessThanOrEqual(1.0);
  });

  it('keeps accruing at the activity threshold instead of freezing in a dead zone', () => {
    // Accrual that tapered to exactly zero at the threshold would let a bot hold
    // its input at that amplitude and stall the accumulator: no accrual, and no
    // decay either, so suspicion would never move in either direction.
    const atThreshold = new EngagementMonitor(FLOW_STATE_CONFIG.AFK);
    const fullyIdle = new EngagementMonitor(FLOW_STATE_CONFIG.AFK);

    for (let second = 0; second < 30; second += 1) {
      atThreshold.update(1, FLOW_STATE_CONFIG.AFK.ACTIVITY_THRESHOLD, 0);
      fullyIdle.update(1, 0, 0);
    }

    expect(atThreshold.suspicion).toBeGreaterThan(0);
    expect(atThreshold.isAFK).toBe(true);
    // Still slower than sitting perfectly still, so the taper is doing its job.
    expect(atThreshold.suspicion).toBeLessThan(fullyIdle.suspicion);
  });

  it('satisfies Invariant 6: reset() zeroes suspicion and clears AFK state', () => {
    // Pollute
    monitor.update(10, 0, 1);
    expect(monitor.suspicion).toBeGreaterThan(0);
    expect(monitor.isAFK).toBe(true);

    // Reset
    monitor.reset();

    // Expect default clean state
    expect(monitor.suspicion).toBe(0);
    expect(monitor.isAFK).toBe(false);
  });
});

describe('FlowStateManager dynamic AFK integration', () => {
  beforeEach(() => {
    FlowStateManager.reset();
  });

  it('detects AFK through FlowStateManager.update with zero activity', () => {
    let analysis = FlowStateManager.update(50, 0, 0);
    expect(analysis.isAFK).toBe(false);

    // After 10s of zero activity
    analysis = FlowStateManager.update(50, 10_000, 0);
    expect(analysis.isAFK).toBe(true);
    expect(FlowStateManager.getAfkSuspicion()).toBeGreaterThanOrEqual(
      FLOW_STATE_CONFIG.AFK.SUSPICION_THRESHOLD
    );
  });

  it('clears AFK and resets suspicion on FlowStateManager.reset()', () => {
    // Pollute
    FlowStateManager.update(50, 0, 0);
    FlowStateManager.update(50, 15_000, 0);
    expect(FlowStateManager.getAfkSuspicion()).toBeGreaterThan(0);

    // Reset
    FlowStateManager.reset();

    // Expect default
    expect(FlowStateManager.getAfkSuspicion()).toBe(0);
    expect(FlowStateManager.getLastAnalysis(0).isAFK).toBe(false);
  });
});

describe('AFK detection through the real CoreGameplayLoop wiring', () => {
  let loop: CoreGameplayLoop;

  beforeEach(() => {
    loop = new CoreGameplayLoop();
    loop.reset();
  });

  /** One frame of an idle player whose weapons keep firing on their own. */
  const idleFrameWithAutoFire = (elapsedMs: number, enemyCount: number) =>
    loop.update({
      deltaMs: 1000 / 60,
      elapsedMs,
      hpPercent: 80,
      enemyCount,
      killStreak: 0,
      movementMagnitude: 0,
      isDashing: false,
      didAttack: true,
    });

  it('does not let auto-fire alone stand in for the player being present', () => {
    // `didAttack` is CombatSystem.processAutoFire's return value — weapons fire on
    // a timer with no input at all, so a player parked in a swarm reports
    // didAttack:true on most frames. Counting that as engagement would leave the
    // AFK farm wide open, which is what this whole accumulator exists to prevent.
    let elapsedMs = 0;
    for (let frame = 0; frame < 20 * 60; frame += 1) {
      elapsedMs += 1000 / 60;
      idleFrameWithAutoFire(elapsedMs, 12);
    }

    expect(FlowStateManager.getAfkSuspicion()).toBeGreaterThanOrEqual(
      FLOW_STATE_CONFIG.AFK.SUSPICION_THRESHOLD
    );
    expect(FlowStateManager.getLastAnalysis(elapsedMs).isAFK).toBe(true);
  });

  it('accrues faster while enemies are pressing than on an empty field', () => {
    let elapsedMs = 0;
    for (let frame = 0; frame < 5 * 60; frame += 1) {
      elapsedMs += 1000 / 60;
      idleFrameWithAutoFire(elapsedMs, 0);
    }
    const quietFieldSuspicion = FlowStateManager.getAfkSuspicion();

    loop.reset();
    elapsedMs = 0;
    for (let frame = 0; frame < 5 * 60; frame += 1) {
      elapsedMs += 1000 / 60;
      idleFrameWithAutoFire(elapsedMs, 32);
    }

    expect(FlowStateManager.getAfkSuspicion()).toBeGreaterThan(quietFieldSuspicion);
  });

  it('leaves a moving player alone', () => {
    let elapsedMs = 0;
    for (let frame = 0; frame < 60 * 60; frame += 1) {
      elapsedMs += 1000 / 60;
      loop.update({
        deltaMs: 1000 / 60,
        elapsedMs,
        hpPercent: 80,
        enemyCount: 12,
        killStreak: 3,
        movementMagnitude: 0.7,
        isDashing: false,
        didAttack: true,
      });
    }

    expect(FlowStateManager.getAfkSuspicion()).toBe(0);
    expect(FlowStateManager.getLastAnalysis(elapsedMs).isAFK).toBe(false);
  });

  it('keeps the two activity thresholds in step', () => {
    // The loop decides "is there input" with its own constant and the monitor
    // decides "is this idle" with another. They answer the same question, so a
    // change to one without the other would silently reopen the gap.
    expect(FLOW_STATE_CONFIG.AFK.ACTIVITY_THRESHOLD).toBe(
      CORE_GAMEPLAY_LOOP_CONFIG.INPUT_ACTIVITY_THRESHOLD
    );
  });
});
