import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CoreGameplayLoop } from '../../../services/gameplay/CoreGameplayLoop';

vi.mock('../../../services/core/EventBus', () => ({
  EventBus: {
    on: vi.fn(),
    emit: vi.fn(),
  },
}));

vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CoreGameplayLoop', () => {
  let loop: CoreGameplayLoop;

  beforeEach(() => {
    loop = new CoreGameplayLoop();
    loop.reset();
  });

  it('keeps build-phase pacing as a presentation signal when player is comfortable', () => {
    let now = 0;
    let output = loop.update({
      deltaMs: 0,
      hpPercent: 72,
      enemyCount: 10,
      killStreak: 6,
      movementMagnitude: 0.6,
      isDashing: false,
      elapsedMs: now,
    });

    for (let i = 0; i < 20; i += 1) {
      now += 150;
      output = loop.update({
        deltaMs: 150,
        hpPercent: 72,
        enemyCount: 10,
        killStreak: 6,
        movementMagnitude: 0.6,
        isDashing: false,
        elapsedMs: now,
      });
    }

    expect(output.phase).toBe('build');
    expect(output.playerScaleTargetX).toBeGreaterThan(1);
    expect(output.flowScore).toBeLessThan(1);
    expect(output).not.toHaveProperty('spawnMultiplier');
  });

  it('switches to release without returning combat multipliers', () => {
    let now = 0;
    let output = loop.update({
      deltaMs: 0,
      hpPercent: 28,
      enemyCount: 40,
      killStreak: 0,
      movementMagnitude: 0.9,
      isDashing: true,
      elapsedMs: now,
    });
    let sawPhaseSwitchShake = false;

    for (let i = 0; i < 24; i += 1) {
      now += 120;
      output = loop.update({
        deltaMs: 120,
        hpPercent: 28,
        enemyCount: 40,
        killStreak: 0,
        movementMagnitude: 0.9,
        isDashing: true,
        elapsedMs: now,
      });
      if (output.shakeBoost > 0) {
        sawPhaseSwitchShake = true;
      }
    }

    expect(sawPhaseSwitchShake).toBe(true);
    expect(output.phase).toBe('release');
    expect(output).not.toHaveProperty('enemyDamageMultiplier');
  });

  it('resets to neutral pacing defaults', () => {
    let now = 0;
    for (let i = 0; i < 10; i += 1) {
      now += 100;
      loop.update({
        deltaMs: 100,
        hpPercent: 25,
        enemyCount: 35,
        killStreak: 1,
        movementMagnitude: 0.8,
        isDashing: true,
        elapsedMs: now,
      });
    }

    loop.reset();

    const output = loop.update({
      deltaMs: 0,
      hpPercent: 50,
      enemyCount: 18,
      killStreak: 0,
      movementMagnitude: 0,
      isDashing: false,
      elapsedMs: now + 1,
    });

    expect(output.phase).toBe('build');
    expect(output.pulse).toBe(0);
  });

  it('reuses its output object on the RAF hot path', () => {
    const input = {
      deltaMs: 16,
      hpPercent: 50,
      enemyCount: 18,
      killStreak: 0,
      movementMagnitude: 0.5,
      isDashing: false,
      elapsedMs: 16,
    };

    const first = loop.update(input);
    input.elapsedMs += input.deltaMs;
    const second = loop.update(input);

    expect(second).toBe(first);
  });

  it('produces equivalent pacing after equal elapsed time at 30, 60, and 120 FPS', () => {
    const simulate = (fps: number) => {
      const candidate = new CoreGameplayLoop();
      candidate.reset();
      const deltaMs = 1000 / fps;
      let elapsedMs = 0;
      let phase: string = 'build';
      let pulse = 0;
      let marketIntensity = 0;

      for (let frame = 0; frame < fps * 8; frame += 1) {
        elapsedMs += deltaMs;
        const output = candidate.update({
          deltaMs,
          elapsedMs,
          hpPercent: 52,
          enemyCount: 20,
          killStreak: 4,
          movementMagnitude: 0.6,
          isDashing: false,
        });
        phase = output.phase;
        pulse = output.pulse;
        marketIntensity = output.marketIntensity;
      }

      return { phase, pulse, marketIntensity };
    };

    const at30 = simulate(30);
    const at60 = simulate(60);
    const at120 = simulate(120);

    expect(at30.phase).toBe(at60.phase);
    expect(at120.phase).toBe(at60.phase);
    expect(at30.pulse).toBeCloseTo(at60.pulse, 3);
    expect(at120.pulse).toBeCloseTo(at60.pulse, 3);
    expect(at30.marketIntensity).toBeCloseTo(at60.marketIntensity, 6);
    expect(at120.marketIntensity).toBeCloseTo(at60.marketIntensity, 6);
  });
});
