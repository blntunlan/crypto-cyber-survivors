import { describe, it, expect } from 'vitest';
import { calculatePerformanceFactor } from '../../../../../services/difficulty/factors/PerformanceFactor';

describe('PerformanceFactor', () => {
  it('returns floor multiplier for worst-case inputs', () => {
    const value = calculatePerformanceFactor({
      accuracy: 0,
      damageTakenFrequency: 999,
      atrPercent: 0,
      leverage: 0,
    });

    expect(value).toBeCloseTo(0.7);
  });

  it('returns higher multiplier for stronger performance and risk', () => {
    const weak = calculatePerformanceFactor({
      accuracy: 0.3,
      damageTakenFrequency: 20,
      atrPercent: 0.002,
      leverage: 1,
    });
    const strong = calculatePerformanceFactor({
      accuracy: 0.95,
      damageTakenFrequency: 1,
      atrPercent: 0.05,
      leverage: 100,
    });

    expect(strong).toBeGreaterThan(weak);
  });

  it('caps normalized inputs and stays in expected top range', () => {
    const value = calculatePerformanceFactor({
      accuracy: 1,
      damageTakenFrequency: 0,
      atrPercent: 999,
      leverage: 999,
    });

    expect(value).toBeCloseTo(2.2);
  });
});
