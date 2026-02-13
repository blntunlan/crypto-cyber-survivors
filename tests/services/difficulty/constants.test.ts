import { describe, it, expect } from 'vitest';
import {
  DIFFICULTY_CONFIG,
  LEVERAGE_TIERS,
  WAVE_PHASES,
  getNearestLeverageTier,
  getLeverageScale,
} from '../../../services/difficulty/constants';

describe('difficulty constants', () => {
  it('exposes legacy-compatible config and helpers', () => {
    expect(DIFFICULTY_CONFIG.cycleDuration).toBeGreaterThan(0);
    expect(Object.keys(LEVERAGE_TIERS).length).toBeGreaterThan(0);
    expect(WAVE_PHASES[0]?.name).toBe('active');
    expect(getNearestLeverageTier(7)).toBe(5);
    expect(getLeverageScale(10)).toHaveProperty('spawn');
  });
});
