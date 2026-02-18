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

  it('ramps pressure in build phase when player is comfortable', () => {
    let now = 0;
    let output = loop.update({
      deltaMs: 0,
      hpPercent: 72,
      enemyCount: 10,
      killStreak: 6,
      movementMagnitude: 0.6,
      isDashing: false,
      nowMs: now,
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
        nowMs: now,
      });
    }

    expect(output.phase).toBe('build');
    expect(output.spawnMultiplier).toBeGreaterThan(1);
    expect(output.playerScaleTargetX).toBeGreaterThan(1);
    expect(output.flowScore).toBeLessThan(1);
  });

  it('switches to release and lowers pressure when player is overwhelmed', () => {
    let now = 0;
    let output = loop.update({
      deltaMs: 0,
      hpPercent: 28,
      enemyCount: 40,
      killStreak: 0,
      movementMagnitude: 0.9,
      isDashing: true,
      nowMs: now,
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
        nowMs: now,
      });
      if (output.shakeBoost > 0) {
        sawPhaseSwitchShake = true;
      }
    }

    expect(sawPhaseSwitchShake).toBe(true);
    expect(output.phase).toBe('release');
    expect(output.spawnMultiplier).toBeLessThan(1);
    expect(output.enemyDamageMultiplier).toBeLessThan(1);
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
        nowMs: now,
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
      nowMs: now + 1,
    });

    expect(output.phase).toBe('build');
    expect(output.spawnMultiplier).toBe(1);
    expect(output.enemySpeedMultiplier).toBe(1);
    expect(output.enemyDamageMultiplier).toBe(1);
  });
});
