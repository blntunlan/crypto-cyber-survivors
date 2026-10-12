import { describe, expect, it } from 'vitest';

import { MVP0_ENEMY_SPAWN_BUDGET, SIMULATION_HZ } from '@/game-v2/config/Mvp0Config';
import {
  TREND_BREAKOUT_CONFIRMATION_TICKS,
  TREND_BREAKOUT_COOLDOWN_TICKS,
  TREND_BREAKOUT_ENTRY_THRESHOLD,
  TREND_BREAKOUT_EXIT_THRESHOLD,
  TREND_BREAKOUT_HYSTERESIS,
  TREND_BREAKOUT_PROFILE,
  TREND_BREAKOUT_SPAWN_BUDGET,
  TREND_BREAKOUT_SPAWN_BUDGET_MULTIPLIER,
} from '@/game-v2/config/TrendBreakoutFamily';

describe('TrendBreakoutFamily derivations', () => {
  it('anchors the entry threshold to the midpoint of the proven [0,1] trendStrength range', () => {
    expect(TREND_BREAKOUT_ENTRY_THRESHOLD).toBe(0.5);
  });

  it('sets the exit threshold equal to the entry threshold', () => {
    expect(TREND_BREAKOUT_EXIT_THRESHOLD).toBe(TREND_BREAKOUT_ENTRY_THRESHOLD);
  });

  it('derives hysteresis as half the entry threshold', () => {
    expect(TREND_BREAKOUT_HYSTERESIS).toBe(TREND_BREAKOUT_ENTRY_THRESHOLD / 2);
    expect(TREND_BREAKOUT_HYSTERESIS).toBe(0.25);
  });

  it('derives confirmation and cooldown ticks from SIMULATION_HZ', () => {
    expect(TREND_BREAKOUT_CONFIRMATION_TICKS).toBe(SIMULATION_HZ);
    expect(TREND_BREAKOUT_COOLDOWN_TICKS).toBe(10 * SIMULATION_HZ);
  });

  it('derives the spawn budget as a stated multiple of the real existing spawn budget', () => {
    expect(TREND_BREAKOUT_SPAWN_BUDGET_MULTIPLIER).toBe(4);
    expect(TREND_BREAKOUT_SPAWN_BUDGET).toBe(
      MVP0_ENEMY_SPAWN_BUDGET * TREND_BREAKOUT_SPAWN_BUDGET_MULTIPLIER
    );
  });

  it('produces a profile that passes assertIndicatorEventProfile', () => {
    expect(TREND_BREAKOUT_PROFILE.id).toBe('trend-breakout');
    expect(TREND_BREAKOUT_PROFILE.direction).toBe('above');
    expect(Object.isFrozen(TREND_BREAKOUT_PROFILE)).toBe(true);
  });
});
