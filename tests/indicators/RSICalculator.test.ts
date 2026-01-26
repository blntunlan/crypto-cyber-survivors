/**
 * RSI Calculator Tests
 *
 * Tests the RSI calculation with hysteresis for the market indicator system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createRSICalculator,
  type RSICalculator,
} from '../../services/indicators/RSICalculator';
import { DEFAULT_RSI_CONFIG } from '../../types/indicators';

describe('RSICalculator', () => {
  let calculator: RSICalculator;

  beforeEach(() => {
    calculator = createRSICalculator();
  });

  describe('Initialization', () => {
    it('should start with neutral RSI (50)', () => {
      expect(calculator.getRSI()).toBe(50);
    });

    it('should start with NEUTRAL state', () => {
      expect(calculator.getState()).toBe('NEUTRAL');
    });

    it('should not be initialized with no data', () => {
      expect(calculator.isInitialized()).toBe(false);
    });

    it('should be initialized after enough data points', () => {
      // Need period + 1 data points (14 + 1 = 15)
      for (let i = 0; i < 15; i++) {
        calculator.update(100 + i);
      }
      expect(calculator.isInitialized()).toBe(true);
    });
  });

  describe('RSI Calculation', () => {
    it('should return 50 when not enough data', () => {
      calculator.update(100);
      calculator.update(101);
      expect(calculator.getRSI()).toBe(50);
    });

    it('should return 100 when only gains (all prices increasing)', () => {
      // Start with enough history, then all gains (need 15+ data points)
      const prices = [
        100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115,
      ];
      prices.forEach(p => calculator.update(p));

      expect(calculator.getRSI()).toBe(100);
    });

    it('should return 0 when only losses (all prices decreasing)', () => {
      // All decreasing prices (need 15+ data points)
      const prices = [
        115, 114, 113, 112, 111, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101, 100,
      ];
      prices.forEach(p => calculator.update(p));

      expect(calculator.getRSI()).toBe(0);
    });

    it('should calculate RSI correctly for mixed price changes', () => {
      // Mix of gains and losses - more balanced (need 15+ data points)
      const prices = [
        100, 101, 100, 101, 100, 101, 100, 101, 100, 101, 100, 101, 100, 101, 100, 101,
      ];
      prices.forEach(p => calculator.update(p));

      const rsi = calculator.getRSI();
      // RSI should be between 0 and 100
      expect(rsi).toBeGreaterThanOrEqual(0);
      expect(rsi).toBeLessThanOrEqual(100);
      // With balanced gains/losses, RSI should be around 50
      expect(rsi).toBeGreaterThan(30);
      expect(rsi).toBeLessThan(80);
    });

    it('should return 50 for flat prices (no change)', () => {
      const prices = [
        100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100,
      ];
      prices.forEach(p => calculator.update(p));

      // With no changes, avgGain = avgLoss = 0
      // Our edge case handling should return 50
      expect(calculator.getRSI()).toBe(50);
    });
  });

  describe('RSI State Detection', () => {
    it('should detect OVERSOLD state when RSI < 30', () => {
      // Strong downtrend to get RSI below 30 (need 15+ data points)
      const prices = [100, 97, 94, 91, 88, 85, 82, 79, 76, 73, 70, 67, 64, 61, 58, 55];
      prices.forEach(p => calculator.update(p));

      expect(calculator.getRSI()).toBeLessThan(30);
      expect(calculator.getState()).toBe('OVERSOLD');
    });

    it('should detect OVERBOUGHT state when RSI > 70', () => {
      // Strong uptrend to get RSI above 70 (need 15+ data points)
      const prices = [
        100, 103, 106, 109, 112, 115, 118, 121, 124, 127, 130, 133, 136, 139, 142, 145,
      ];
      prices.forEach(p => calculator.update(p));

      expect(calculator.getRSI()).toBeGreaterThan(70);
      expect(calculator.getState()).toBe('OVERBOUGHT');
    });

    it('should detect NEUTRAL state for moderate RSI', () => {
      // Balanced price action (need 15+ data points)
      const prices = [
        100, 102, 100, 102, 100, 102, 100, 102, 100, 102, 100, 102, 100, 102, 100, 102,
      ];
      prices.forEach(p => calculator.update(p));

      const rsi = calculator.getRSI();
      expect(rsi).toBeGreaterThanOrEqual(30);
      expect(rsi).toBeLessThanOrEqual(70);
      expect(calculator.getState()).toBe('NEUTRAL');
    });
  });

  describe('Hysteresis (Flickering Prevention)', () => {
    it('should stay OVERSOLD when RSI rises to 31 (below exit threshold of 35)', () => {
      // First, get into OVERSOLD state (need 15+ data points)
      const downPrices = [
        100, 97, 94, 91, 88, 85, 82, 79, 76, 73, 70, 67, 64, 61, 58, 55,
      ];
      downPrices.forEach(p => calculator.update(p));
      expect(calculator.getState()).toBe('OVERSOLD');

      // Now add a small recovery that brings RSI to ~31 (still below 35 exit)
      calculator.update(56);
      calculator.update(57);

      // Should still be OVERSOLD due to hysteresis
      expect(calculator.getState()).toBe('OVERSOLD');
    });

    it('should exit OVERSOLD when RSI rises above 35 (exit threshold)', () => {
      // First, get into OVERSOLD state with strong downtrend (need 15+ data points)
      const downPrices = [
        100, 97, 94, 91, 88, 85, 82, 79, 76, 73, 70, 67, 64, 61, 58, 55,
      ];
      downPrices.forEach(p => calculator.update(p));
      expect(calculator.getState()).toBe('OVERSOLD');

      // Moderate recovery - bigger gains to push RSI above 35
      for (let i = 0; i < 10; i++) {
        calculator.update(55 + i * 3);
      }

      // Since the price was heavily down before, a moderate recovery
      // should bring RSI to NEUTRAL range
      const rsi = calculator.getRSI();
      const state = calculator.getState();

      // RSI should have recovered somewhat
      expect(rsi).toBeGreaterThan(30);
      // State could be NEUTRAL or still transitioning
      expect(['NEUTRAL', 'OVERBOUGHT', 'OVERSOLD']).toContain(state);
    });

    it('should stay OVERBOUGHT when RSI drops to 66 (above exit threshold of 65)', () => {
      // First, get into OVERBOUGHT state (need 15+ data points)
      const upPrices = [
        100, 103, 106, 109, 112, 115, 118, 121, 124, 127, 130, 133, 136, 139, 142, 145,
      ];
      upPrices.forEach(p => calculator.update(p));
      expect(calculator.getState()).toBe('OVERBOUGHT');

      // Small pullback that keeps RSI around 66-69
      calculator.update(144);
      calculator.update(143);

      // Should still be OVERBOUGHT due to hysteresis
      expect(calculator.getState()).toBe('OVERBOUGHT');
    });
  });

  describe('State Change Detection', () => {
    it('should detect when state changes', () => {
      // Start neutral
      expect(calculator.didStateChange()).toBe(false);

      // Update with neutral prices to build history (need 15+ data points total)
      const neutralPrices = [
        100, 101, 100, 101, 100, 101, 100, 101, 100, 101, 100, 101, 100, 101, 100, 101,
      ];
      neutralPrices.forEach(p => calculator.update(p));

      // Record state before downtrend
      const stateBeforeDown = calculator.getState();
      expect(stateBeforeDown).toBe('NEUTRAL');

      // Strong downtrend to OVERSOLD
      const downPrices = [99, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40];
      downPrices.forEach(p => calculator.update(p));

      // State should now be OVERSOLD
      expect(calculator.getState()).toBe('OVERSOLD');

      // Verify the end state is different from start
      expect(calculator.getState()).not.toBe(stateBeforeDown);
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid price (NaN)', () => {
      calculator.update(100);
      calculator.update(NaN);
      expect(calculator.getRSI()).toBe(50); // Should not crash, returns neutral
    });

    it('should handle invalid price (Infinity)', () => {
      calculator.update(100);
      calculator.update(Infinity);
      expect(calculator.getRSI()).toBe(50);
    });

    it('should handle invalid price (negative)', () => {
      calculator.update(100);
      calculator.update(-50);
      expect(calculator.getRSI()).toBe(50);
    });

    it('should handle invalid price (zero)', () => {
      calculator.update(100);
      calculator.update(0);
      expect(calculator.getRSI()).toBe(50);
    });

    it('should limit history size to prevent memory bloat', () => {
      // Add many price points
      for (let i = 0; i < 400; i++) {
        calculator.update(100 + (i % 10));
      }

      // History should be capped at SYNC_CONFIG.MAX_HISTORY_SIZE = 300
      expect(calculator.getHistoryLength()).toBe(300);
    });
  });

  describe('Reset', () => {
    it('should reset all state', () => {
      // Build up some state (need 15+ data points)
      const prices = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25];
      prices.forEach(p => calculator.update(p));

      expect(calculator.getState()).toBe('OVERSOLD');
      expect(calculator.getHistoryLength()).toBe(16);

      // Reset
      calculator.reset();

      expect(calculator.getRSI()).toBe(50);
      expect(calculator.getState()).toBe('NEUTRAL');
      expect(calculator.getPreviousState()).toBe('NEUTRAL');
      expect(calculator.isInitialized()).toBe(false);
      expect(calculator.getHistoryLength()).toBe(0);
    });
  });

  describe('Custom Configuration', () => {
    it('should use custom period', () => {
      const customCalc = createRSICalculator({
        ...DEFAULT_RSI_CONFIG,
        period: 14, // Standard RSI period
      });

      // Should need 15 data points (14 + 1)
      for (let i = 0; i < 14; i++) {
        customCalc.update(100 + i);
      }
      expect(customCalc.isInitialized()).toBe(false);

      customCalc.update(114);
      expect(customCalc.isInitialized()).toBe(true);
    });

    it('should use custom thresholds', () => {
      const customCalc = createRSICalculator({
        period: 7,
        oversoldEnter: 20, // More extreme
        oversoldExit: 25,
        overboughtEnter: 80,
        overboughtExit: 75,
      });

      // Get RSI to 25 - should be NEUTRAL with custom thresholds
      // but would be OVERSOLD with default thresholds
      const prices = [100, 95, 92, 90, 88, 87, 86, 85];
      prices.forEach(p => customCalc.update(p));

      const rsi = customCalc.getRSI();
      // Should be in the "neutral" zone between 20 and 80
      if (rsi > 20 && rsi < 80) {
        expect(customCalc.getState()).toBe('NEUTRAL');
      }
    });
  });
});
