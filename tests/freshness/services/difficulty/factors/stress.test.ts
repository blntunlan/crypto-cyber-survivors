import { describe, it, expect } from 'vitest';
import { calculateStressScore } from '../../../../../services/difficulty/factors/stress';

describe('StressFactor', () => {
  it('returns zero for calm state', () => {
    const value = calculateStressScore({
      damageTakenFrequency: 0,
      dashUsageFrequency: 0,
      nearDeathDuration: 0,
    });

    expect(value).toBe(0);
  });

  it('calculates weighted stress composition', () => {
    const value = calculateStressScore({
      damageTakenFrequency: 10,
      dashUsageFrequency: 7.5,
      nearDeathDuration: 5,
    });

    expect(value).toBeCloseTo(0.5);
  });

  it('clamps to one for extreme stress values', () => {
    const value = calculateStressScore({
      damageTakenFrequency: 999,
      dashUsageFrequency: 999,
      nearDeathDuration: 999,
    });

    expect(value).toBeCloseTo(1);
  });
});
