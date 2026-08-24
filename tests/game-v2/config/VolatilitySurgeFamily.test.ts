import { describe, expect, it } from 'vitest';

import { SIMULATION_HZ } from '@/game-v2/config/Mvp0Config';
import {
  VOLATILITY_SURGE_CONFIRMATION_TICKS,
  VOLATILITY_SURGE_COOLDOWN_TICKS,
  VOLATILITY_SURGE_ENTRY_THRESHOLD,
  VOLATILITY_SURGE_EXIT_THRESHOLD,
  VOLATILITY_SURGE_HYSTERESIS,
  VOLATILITY_SURGE_PROFILE,
  VOLATILITY_SURGE_TELEGRAPH_TICKS,
} from '@/game-v2/config/VolatilitySurgeFamily';

describe('VolatilitySurgeFamily derivations', () => {
  it('anchors the entry threshold to ATRCalculator\'s real "Chaos" tier boundary', () => {
    expect(VOLATILITY_SURGE_ENTRY_THRESHOLD).toBe(0.03);
  });

  it('sets the exit threshold equal to the entry threshold', () => {
    expect(VOLATILITY_SURGE_EXIT_THRESHOLD).toBe(VOLATILITY_SURGE_ENTRY_THRESHOLD);
  });

  it('anchors hysteresis to ATRCalculator\'s real "Normal"/"Volatile" tier boundary', () => {
    expect(VOLATILITY_SURGE_HYSTERESIS).toBe(0.015);
    expect(VOLATILITY_SURGE_ENTRY_THRESHOLD - VOLATILITY_SURGE_HYSTERESIS).toBe(0.015);
  });

  it('derives confirmation and cooldown ticks from SIMULATION_HZ, matching V2-204', () => {
    expect(VOLATILITY_SURGE_CONFIRMATION_TICKS).toBe(SIMULATION_HZ);
    expect(VOLATILITY_SURGE_COOLDOWN_TICKS).toBe(10 * SIMULATION_HZ);
  });

  it('derives the telegraph duration from SIMULATION_HZ', () => {
    expect(VOLATILITY_SURGE_TELEGRAPH_TICKS).toBe(2 * SIMULATION_HZ);
  });

  it('produces a profile that passes assertIndicatorEventProfile', () => {
    expect(VOLATILITY_SURGE_PROFILE.id).toBe('volatility-surge');
    expect(VOLATILITY_SURGE_PROFILE.direction).toBe('above');
    expect(Object.isFrozen(VOLATILITY_SURGE_PROFILE)).toBe(true);
  });
});
