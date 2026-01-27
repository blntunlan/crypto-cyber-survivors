import { describe, it, expect } from 'vitest';
import {
  MarketCalculator,
  type PnLInput,
  type LiquidationInput,
  type ATRInput,
  type ATRContext,
} from '../../services/market/MarketCalculator';
import { MarketPosition } from '../../types';

describe('MarketCalculator', () => {
  describe('calculatePnL', () => {
    it('should calculate correct PnL for LONG position (profit)', () => {
      const input: PnLInput = {
        currentPrice: 110,
        entryPrice: 100,
        position: MarketPosition.LONG,
        leverage: 10,
      };

      const result = MarketCalculator.calculatePnL(input);

      // Raw gain 10%. With 10x leverage = 100%.
      expect(result.rawPnl).toBeCloseTo(0.1);
      expect(result.effectivePnl).toBeCloseTo(1.0);
    });

    it('should calculate correct PnL for LONG position (loss)', () => {
      const input: PnLInput = {
        currentPrice: 90,
        entryPrice: 100,
        position: MarketPosition.LONG,
        leverage: 5,
      };

      const result = MarketCalculator.calculatePnL(input);

      // Raw loss 10%. With 5x leverage = 50% loss.
      expect(result.rawPnl).toBeCloseTo(-0.1);
      expect(result.effectivePnl).toBeCloseTo(-0.5);
    });

    it('should calculate correct PnL for SHORT position (profit)', () => {
      const input: PnLInput = {
        currentPrice: 90,
        entryPrice: 100,
        position: MarketPosition.SHORT,
        leverage: 10,
      };

      const result = MarketCalculator.calculatePnL(input);

      // Price down 10%. Short gains 10%. Leverage 10x = 100%.
      expect(result.rawPnl).toBeCloseTo(0.1);
      expect(result.effectivePnl).toBeCloseTo(1.0);
    });

    it('should calculate correct PnL for SHORT position (loss)', () => {
      const input: PnLInput = {
        currentPrice: 110,
        entryPrice: 100,
        position: MarketPosition.SHORT,
        leverage: 5,
      };

      const result = MarketCalculator.calculatePnL(input);

      // Price up 10%. Short loses 10%. Leverage 5x = 50% loss.
      expect(result.rawPnl).toBeCloseTo(-0.1);
      expect(result.effectivePnl).toBeCloseTo(-0.5);
    });

    it('should cap difficulty PnL leverage', () => {
      const input: PnLInput = {
        currentPrice: 110,
        entryPrice: 100,
        position: MarketPosition.LONG,
        leverage: 100, // High leverage
      };

      const result = MarketCalculator.calculatePnL(input);

      // CAP is 2.0. So difficulty should be calculated with 2x leverage.
      // Raw 0.1. Effective 10.0. Difficulty (0.1 * 2.0) = 0.2
      expect(result.difficultyPnl).toBeCloseTo(0.2);
      expect(result.effectivePnl).toBeCloseTo(10.0);
    });
  });

  describe('calculateLiquidationPrice', () => {
    it('should calculate liquidation for LONG', () => {
      const input: LiquidationInput = {
        entryPrice: 100,
        leverage: 10, // 10% move
        position: MarketPosition.LONG,
      };

      // Long liq = entry * (1 - 1/10) = 100 * 0.9 = 90
      expect(MarketCalculator.calculateLiquidationPrice(input)).toBeCloseTo(90);
    });

    it('should calculate liquidation for SHORT', () => {
      const input: LiquidationInput = {
        entryPrice: 100,
        leverage: 10, // 10% move
        position: MarketPosition.SHORT,
      };

      // Short liq = entry * (1 + 1/10) = 100 * 1.1 = 110
      expect(MarketCalculator.calculateLiquidationPrice(input)).toBeCloseTo(110);
    });

    it('should calculate liquidation for high leverage', () => {
      const input: LiquidationInput = {
        entryPrice: 1000,
        leverage: 100, // 1% move
        position: MarketPosition.LONG,
      };

      // 1000 * (1 - 0.01) = 990
      expect(MarketCalculator.calculateLiquidationPrice(input)).toBeCloseTo(990);
    });
  });

  describe('isLiquidated', () => {
    it('should detect liquidation for LONG', () => {
      const liqPrice = 90;
      // Dropped below liq price
      expect(MarketCalculator.isLiquidated(89, liqPrice, MarketPosition.LONG)).toBe(
        true
      );
      expect(MarketCalculator.isLiquidated(90, liqPrice, MarketPosition.LONG)).toBe(
        true
      );
      expect(MarketCalculator.isLiquidated(91, liqPrice, MarketPosition.LONG)).toBe(
        false
      );
    });

    it('should detect liquidation for SHORT', () => {
      const liqPrice = 110;
      // Rises above liq price
      expect(MarketCalculator.isLiquidated(111, liqPrice, MarketPosition.SHORT)).toBe(
        true
      );
      expect(MarketCalculator.isLiquidated(110, liqPrice, MarketPosition.SHORT)).toBe(
        true
      );
      expect(MarketCalculator.isLiquidated(109, liqPrice, MarketPosition.SHORT)).toBe(
        false
      );
    });
  });

  describe('calculateATR', () => {
    it('should calculate TR correctly', () => {
      const context: ATRContext = { trHistory: [], prevClose: 100 };
      const input: ATRInput = {
        high: 110,
        low: 95,
        close: 105,
      };

      // TR = max(H-L, |H-PC|, |L-PC|)
      // H-L = 15
      // |H-PC| = |110-100| = 10
      // |L-PC| = |95-100| = 5
      // Max = 15

      const result = MarketCalculator.calculateATR(input, context);
      expect(result.newTrHistory[0]).toBe(15);
      expect(result.atr).toBe(15); // Average of one value is value itself
    });

    it('should maintain moving average window', () => {
      const context: ATRContext = {
        trHistory: Array(14).fill(10), // Full history of 10s
        prevClose: 100,
      };

      const input: ATRInput = {
        high: 120, // H-PC = 20 (max)
        low: 100,
        close: 110,
      };

      const result = MarketCalculator.calculateATR(input, context);

      expect(result.newTrHistory.length).toBe(14);
      expect(result.newTrHistory[13]).toBe(20); // Newest

      // Sum = 13*10 + 20 = 150. ATR = 150/14 ≈ 10.71
      expect(result.atr).toBeCloseTo(150 / 14);
    });
  });
});
