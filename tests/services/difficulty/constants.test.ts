import { describe, it, expect } from 'vitest';
import {
  DIFFICULTY_CONFIG,
  LEVERAGE_TIERS,
  getNearestLeverageTier,
  getLeverageScale,
} from '../../../services/difficulty/constants';

describe('difficulty constants', () => {
  it('exposes config and leverage helpers', () => {
    expect(DIFFICULTY_CONFIG.cycleDuration).toBeGreaterThan(0);
    expect(Object.keys(LEVERAGE_TIERS).length).toBeGreaterThan(0);
    expect(getNearestLeverageTier(7)).toBe(5);
    expect(getLeverageScale(10)).toHaveProperty('spawn');
  });
});
