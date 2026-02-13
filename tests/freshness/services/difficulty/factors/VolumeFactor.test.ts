import { describe, it, expect } from 'vitest';
import { calculateVolumeFactor } from '../../../../../services/difficulty/factors/VolumeFactor';

describe('VolumeFactor', () => {
  it('returns neutral multiplier at zero activity', () => {
    expect(calculateVolumeFactor({ normalizedVolume: 0, whaleTier: 0 })).toBe(1);
  });

  it('increases with whale tiers for the same volume', () => {
    const tier0 = calculateVolumeFactor({ normalizedVolume: 0.5, whaleTier: 0 });
    const tier3 = calculateVolumeFactor({ normalizedVolume: 0.5, whaleTier: 3 });

    expect(tier3).toBeGreaterThan(tier0);
  });

  it('reaches expected high-end multiplier envelope', () => {
    const max = calculateVolumeFactor({ normalizedVolume: 1, whaleTier: 3 });
    expect(max).toBeCloseTo(2.25);
  });

  it('falls back to neutral whale modifier for unknown tiers', () => {
    const fallback = calculateVolumeFactor({
      normalizedVolume: 1,
      whaleTier: 99 as unknown as 0 | 1 | 2 | 3,
    });

    expect(fallback).toBeCloseTo(1.5);
  });
});
