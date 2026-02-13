import { describe, it, expect } from 'vitest';
import { calculateATRFactor } from '../../../../../services/difficulty/factors/ATRFactor';

describe('ATRFactor', () => {
  it('returns neutral value when ATR is absent', () => {
    expect(calculateATRFactor({ atrPercent: 0 })).toBe(1);
  });

  it('increases monotonically with higher volatility', () => {
    const low = calculateATRFactor({ atrPercent: 0.05 });
    const high = calculateATRFactor({ atrPercent: 0.5 });

    expect(high).toBeGreaterThan(low);
  });

  it('uses log scaling to keep extreme values bounded', () => {
    const moderate = calculateATRFactor({ atrPercent: 0.5 });
    const extreme = calculateATRFactor({ atrPercent: 5 });

    expect(moderate).toBeCloseTo(1 + Math.log1p(1) * 0.45);
    expect(extreme).toBeLessThan(3);
  });
});
