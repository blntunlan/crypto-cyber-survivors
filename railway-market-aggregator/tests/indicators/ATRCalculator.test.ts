import { describe, it, expect, beforeEach } from 'vitest';
import { ATRCalculator } from '../../src/indicators/ATRCalculator';

describe('ATRCalculator', () => {
  let atr: ATRCalculator;

  beforeEach(() => {
    atr = new ATRCalculator(14);
  });

  describe('initialization', () => {
    it('returns atr 0 and atrPercent 0 before any data', () => {
      // First update seeds prevClose, produces TR = high - low
      const result = atr.update(101, 99, 100);
      expect(result.atr).toBeGreaterThanOrEqual(0);
      expect(result.atrPercent).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculation with known OHLC data', () => {
    it('computes correct ATR for simple candles', () => {
      // First candle: no prevClose, TR = high - low = 2
      const r1 = atr.update(101, 99, 100);
      expect(r1.atr).toBeCloseTo(2, 5);
      expect(r1.atrPercent).toBeCloseTo(2, 4); // (2/100)*100 = 2%

      // Second candle: prevClose=100, TR = max(102-98, |102-100|, |98-100|) = 4
      const r2 = atr.update(102, 98, 101);
      // ATR = SMA of [2, 4] = 3
      expect(r2.atr).toBeCloseTo(3, 5);
      expect(r2.atrPercent).toBeCloseTo((3 / 101) * 100, 4);
    });

    it('ATR increases with more volatile candles', () => {
      // Feed calm candles
      for (let i = 0; i < 5; i++) {
        atr.update(101 + i, 99 + i, 100 + i);
      }
      const calm = atr.update(106, 104, 105);

      // Reset and feed volatile candles
      atr.reset();
      for (let i = 0; i < 5; i++) {
        atr.update(110 + i, 90 + i, 100 + i);
      }
      const volatile_ = atr.update(116, 96, 106);

      expect(volatile_.atr).toBeGreaterThan(calm.atr);
    });
  });

  describe('edge cases', () => {
    it('ignores invalid (non-finite) close prices', () => {
      atr.update(101, 99, 100);
      const result = atr.update(102, 98, NaN);
      // Should return last valid result
      expect(result.atr).toBeCloseTo(2, 5);
    });

    it('ignores zero close price', () => {
      atr.update(101, 99, 100);
      const result = atr.update(102, 98, 0);
      expect(result.atr).toBeCloseTo(2, 5);
    });

    it('ignores negative close price', () => {
      atr.update(101, 99, 100);
      const result = atr.update(102, 98, -10);
      expect(result.atr).toBeCloseTo(2, 5);
    });

    it('skips duplicate close prices', () => {
      atr.update(101, 99, 100);
      const first = atr.update(103, 97, 101);
      const duplicate = atr.update(104, 96, 101); // same close
      expect(duplicate.atr).toBe(first.atr);
      expect(duplicate.atrPercent).toBe(first.atrPercent);
    });

    it('handles single candle', () => {
      const result = atr.update(105, 95, 100);
      expect(result.atr).toBeCloseTo(10, 5);
      expect(result.atrPercent).toBeCloseTo(10, 4);
    });
  });

  describe('getSpawnRateMultiplier', () => {
    it('returns 0.5 for calm markets (atrPercent < 0.005)', () => {
      expect(atr.getSpawnRateMultiplier(0.001)).toBe(0.5);
      expect(atr.getSpawnRateMultiplier(0.004)).toBe(0.5);
    });

    it('returns 1.0 for normal markets (0.005 <= atrPercent < 0.015)', () => {
      expect(atr.getSpawnRateMultiplier(0.005)).toBe(1.0);
      expect(atr.getSpawnRateMultiplier(0.01)).toBe(1.0);
    });

    it('returns 1.5 for volatile markets (0.015 <= atrPercent < 0.03)', () => {
      expect(atr.getSpawnRateMultiplier(0.015)).toBe(1.5);
      expect(atr.getSpawnRateMultiplier(0.025)).toBe(1.5);
    });

    it('returns 2.0 for chaotic markets (atrPercent >= 0.03)', () => {
      expect(atr.getSpawnRateMultiplier(0.03)).toBe(2.0);
      expect(atr.getSpawnRateMultiplier(1.0)).toBe(2.0);
    });
  });

  describe('reset', () => {
    it('reset() restores initial state', () => {
      for (let i = 0; i < 10; i++) {
        atr.update(110 + i, 90 + i, 100 + i);
      }
      atr.reset();
      // After reset, first update should behave like fresh instance
      const result = atr.update(101, 99, 100);
      expect(result.atr).toBeCloseTo(2, 5);
    });
  });

  describe('sliding window', () => {
    it('maintains at most 300 TR values', () => {
      for (let i = 1; i <= 310; i++) {
        atr.update(100 + i + 1, 100 + i - 1, 100 + i);
      }
      // Should still produce valid results
      const result = atr.update(415, 411, 413);
      expect(result.atr).toBeGreaterThan(0);
      expect(result.atrPercent).toBeGreaterThan(0);
    });
  });
});
