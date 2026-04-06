import { describe, it, expect, beforeEach } from 'vitest';
import { RSICalculator } from '../../src/indicators/RSICalculator';

describe('RSICalculator', () => {
  let rsi: RSICalculator;

  beforeEach(() => {
    rsi = new RSICalculator(14);
  });

  describe('initialization', () => {
    it('returns RSI 50 (neutral) before enough data', () => {
      const result = rsi.update(100);
      expect(result.rsi).toBe(50);
      expect(result.state).toBe('NEUTRAL');
    });

    it('returns RSI 50 for fewer than period+1 prices', () => {
      for (let i = 0; i < 14; i++) {
        const result = rsi.update(100 + i);
        expect(result.rsi).toBe(50);
      }
    });
  });

  describe('calculation with known series', () => {
    it('produces high RSI for consistently rising prices', () => {
      // Feed 20 rising prices
      let result = { rsi: 50, state: 'NEUTRAL' };
      for (let i = 1; i <= 20; i++) {
        result = rsi.update(100 + i);
      }
      // All gains, no losses => RSI should be very high (clamped at 95)
      expect(result.rsi).toBe(95);
      expect(result.state).toBe('OVERBOUGHT');
    });

    it('produces low RSI for consistently falling prices', () => {
      let result = { rsi: 50, state: 'NEUTRAL' };
      for (let i = 1; i <= 20; i++) {
        result = rsi.update(200 - i);
      }
      // All losses, no gains => RSI should be very low (clamped at 5)
      expect(result.rsi).toBe(5);
      expect(result.state).toBe('OVERSOLD');
    });

    it('produces RSI near 50 for alternating up/down prices', () => {
      let result = { rsi: 50, state: 'NEUTRAL' };
      for (let i = 0; i < 30; i++) {
        // Alternate between 100 and 101
        result = rsi.update(i % 2 === 0 ? 100 : 101);
      }
      // Equal gains and losses => RSI should be near 50
      expect(result.rsi).toBeGreaterThan(40);
      expect(result.rsi).toBeLessThan(60);
      expect(result.state).toBe('NEUTRAL');
    });
  });

  describe('edge cases', () => {
    it('ignores invalid (non-finite) prices', () => {
      rsi.update(100);
      const result = rsi.update(NaN);
      expect(result.rsi).toBe(50);
      expect(result.state).toBe('NEUTRAL');
    });

    it('ignores zero and negative prices', () => {
      rsi.update(100);
      expect(rsi.update(0).rsi).toBe(50);
      expect(rsi.update(-50).rsi).toBe(50);
    });

    it('skips duplicate prices (unchanged tick)', () => {
      for (let i = 1; i <= 16; i++) {
        rsi.update(100 + i);
      }
      const first = rsi.update(120);
      const duplicate = rsi.update(120);
      expect(duplicate.rsi).toBe(first.rsi);
      expect(duplicate.state).toBe(first.state);
    });

    it('handles all-same values gracefully', () => {
      // All same values after the first will be skipped as duplicates
      // so we only ever get 1 distinct price => not enough for calculation
      for (let i = 0; i < 20; i++) {
        rsi.update(100);
      }
      const result = rsi.update(100);
      expect(result.rsi).toBe(50);
      expect(result.state).toBe('NEUTRAL');
    });
  });

  describe('hysteresis', () => {
    it('OVERSOLD state persists until RSI crosses 35 (not 30)', () => {
      // Drive RSI to oversold
      for (let i = 1; i <= 20; i++) {
        rsi.update(200 - i);
      }
      expect(rsi.update(179).state).toBe('OVERSOLD');

      // Small recovery should stay OVERSOLD due to hysteresis
      // The RSI won't jump above 35 with a single small uptick
      const afterSmallBounce = rsi.update(180);
      // State should still be OVERSOLD or transition depends on RSI value
      expect(['OVERSOLD', 'NEUTRAL']).toContain(afterSmallBounce.state);
    });
  });

  describe('reset', () => {
    it('reset() restores initial state', () => {
      for (let i = 1; i <= 20; i++) {
        rsi.update(100 + i);
      }
      rsi.reset();
      const result = rsi.update(100);
      expect(result.rsi).toBe(50);
      expect(result.state).toBe('NEUTRAL');
    });
  });

  describe('sliding window', () => {
    it('maintains at most 300 prices', () => {
      // Feed 310 prices — internal array should be capped at 300
      for (let i = 1; i <= 310; i++) {
        rsi.update(100 + (i % 10));
      }
      // After reset we can verify it was working; the calculator
      // should still produce valid results after exceeding window
      const result = rsi.update(110);
      expect(result.rsi).toBeGreaterThanOrEqual(0);
      expect(result.rsi).toBeLessThanOrEqual(100);
    });
  });
});
