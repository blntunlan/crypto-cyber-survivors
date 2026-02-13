import { describe, it, expect, beforeEach } from 'vitest';
import { RSICalculator } from '../../src/indicators/RSICalculator';

describe('RSICalculator (Server)', () => {
  let rsi: RSICalculator;

  beforeEach(() => {
    rsi = new RSICalculator(7); // Period 7
  });

  describe('Initialization', () => {
    it('should start with NEUTRAL state', () => {
      expect(rsi.update(100)).toEqual({
        rsi: 50,
        state: 'NEUTRAL',
      });
    });
  });

  describe('Data Accumulation', () => {
    it('should calculate RSI after sufficient data', () => {
      // Feed increasing prices (uptrend)
      const prices = [100, 101, 102, 103, 104, 105, 106, 107]; // 7 changes

      let result;
      for (const p of prices) {
        result = rsi.update(p);
      }

      expect(result?.rsi).toBe(95); // Pure gain clamped to 95
      expect(result?.state).toBe('OVERBOUGHT');
    });

    it('should detect OVERSOLD conditions', () => {
      // Feed decreasing prices (downtrend)
      const prices = [100, 99, 98, 97, 96, 95, 94, 93]; // 7 drops

      let result;
      for (const p of prices) {
        result = rsi.update(p);
      }

      expect(result?.rsi).toBe(5); // Pure loss clamped to 5
      expect(result?.state).toBe('OVERSOLD');
    });

    it('should calculate mixed prices correctly', () => {
      // Changes: +5, -2, +5, -2, +5, -2, +5
      // Total gains: 20. Total losses: 6.
      // rs = 20 / 6 = 3.333
      // RSI = 100 - (100 / (1 + 3.333)) = 100 - (100 / 4.333) = 100 - 23.076 = 76.92
      const prices = [100, 105, 103, 108, 106, 111, 109, 114];
      let result;
      for (const p of prices) {
        result = rsi.update(p);
      }

      expect(result?.rsi).toBeCloseTo(76.92, 1);
      expect(result?.state).toBe('OVERBOUGHT'); // 76.92 > 70
    });
  });

  describe('Hysteresis', () => {
    it('should stay OVERSOLD until exiting hysteresis zone (>35)', () => {
      // 1. Enter OVERSOLD with pure downtrend
      rsi.reset();
      // 8 prices = 7 changes, all losses -> RSI should be 5 (clamped)
      [10, 9, 8, 7, 6, 5, 4, 3].forEach(p => rsi.update(p));
      const res0 = rsi.update(2); // One more loss to ensure deeply OVERSOLD
      expect(res0.rsi).toBe(5); // Pure loss clamped
      expect(res0.state).toBe('OVERSOLD');

      // 2. Small recovery: update(4) -> change +2
      // With skip-flat-price, Wilder's smoothing didn't decay on flat ticks
      // prevAvgLoss = 1.0 (1*7/7), prevAvgGain = 0 (pure loss)
      // Now: gain = (0*6 + 2)/7 = 2/7 = 0.2857
      //      loss = (1*6 + 0)/7 = 6/7 = 0.8571
      // RS = 0.2857/0.8571 = 0.3333
      // RSI = 100 - 100/1.3333 = 25.0
      const res1 = rsi.update(4);
      expect(res1.rsi).toBeCloseTo(25.0, 0);
      expect(res1.state).toBe('OVERSOLD');

      // 3. Bigger recovery: update(6) -> change +2
      // gain = (0.2857*6 + 2)/7 = (1.7142 + 2)/7 = 3.7142/7 = 0.5306
      // loss = (0.8571*6 + 0)/7 = 5.1426/7 = 0.7347
      // RS = 0.5306/0.7347 = 0.7222
      // RSI = 100 - 100/1.7222 = 41.9
      const res2 = rsi.update(6);
      expect(res2.rsi).toBeCloseTo(41.9, 0);
      expect(res2.state).toBe('NEUTRAL'); // Exited OVERSOLD (RSI > 35)
    });

    it('logic check: exit OVERSOLD only at > 35', () => {
      rsi.reset();
      // Entry: Use prices without flat values
      // Changes: -1, -1, -1, -1, -0.5, -0.5, +1 = Gains: 1, Losses: 5
      // rs = (1/7)/(5/7) = 1/5 = 0.2. RSI = 100 - 100/1.2 = 16.67.
      const entryPrices = [10, 9, 8, 7, 6, 5.5, 5, 6];
      let res = { rsi: 50, state: 'NEUTRAL' };
      entryPrices.forEach(p => (res = rsi.update(p)));
      expect(res.rsi).toBeCloseTo(16.67, 0);
      expect(res.state).toBe('OVERSOLD');
    });
  });

  describe('Reset', () => {
    it('should clear historical data on reset', () => {
      const prices = [100, 101, 102, 103, 104, 105, 106, 107];
      prices.forEach(p => rsi.update(p));
      expect(rsi.update(107).rsi).toBe(95);

      rsi.reset();
      expect(rsi.update(100).rsi).toBe(50); // Initial state
    });
  });

  describe('Edge Cases', () => {
    it('should handle flat prices', () => {
      const prices = [100, 100, 100, 100, 100, 100, 100, 100];
      let result;
      for (const p of prices) {
        result = rsi.update(p);
      }
      expect(result?.rsi).toBe(50);
      expect(result?.state).toBe('NEUTRAL');
    });

    it('should handle zero prices correctly', () => {
      const prices = [0, 0, 0, 0, 0, 0, 0, 0];
      const result = prices.map(p => rsi.update(p)).pop();
      expect(result?.rsi).toBe(50);
    });
  });
});
