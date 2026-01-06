import { describe, it, expect } from 'vitest';
import { MarketCalculator } from '../services/MarketCalculator';
import { MarketPosition, type LeverageOption } from '../types';

describe('MarketCalculator', () => {
  describe('calculatePnL', () => {
    it('should calculate positive PnL for LONG when price increases', () => {
      const result = MarketCalculator.calculatePnL({
        currentPrice: 44000,
        entryPrice: 40000,
        position: MarketPosition.LONG,
        leverage: 1,
      });

      // (44000 - 40000) / 40000 = 0.1 (10%)
      expect(result.rawPnl).toBe(0.1);
      expect(result.effectivePnl).toBe(0.1);
    });

    it('should calculate negative PnL for LONG when price decreases', () => {
      const result = MarketCalculator.calculatePnL({
        currentPrice: 36000,
        entryPrice: 40000,
        position: MarketPosition.LONG,
        leverage: 1,
      });

      // (36000 - 40000) / 40000 = -0.1 (-10%)
      expect(result.rawPnl).toBe(-0.1);
      expect(result.effectivePnl).toBe(-0.1);
    });

    it('should calculate positive PnL for SHORT when price decreases', () => {
      const result = MarketCalculator.calculatePnL({
        currentPrice: 36000,
        entryPrice: 40000,
        position: MarketPosition.SHORT,
        leverage: 1,
      });

      // -(36000 - 40000) / 40000 = 0.1 (10%)
      expect(result.rawPnl).toBe(0.1);
      expect(result.effectivePnl).toBe(0.1);
    });

    it('should calculate negative PnL for SHORT when price increases', () => {
      const result = MarketCalculator.calculatePnL({
        currentPrice: 44000,
        entryPrice: 40000,
        position: MarketPosition.SHORT,
        leverage: 1,
      });

      // -(44000 - 40000) / 40000 = -0.1 (-10%)
      expect(result.rawPnl).toBe(-0.1);
      expect(result.effectivePnl).toBe(-0.1);
    });

    it('should apply leverage to effective PnL', () => {
      const result = MarketCalculator.calculatePnL({
        currentPrice: 44000,
        entryPrice: 40000,
        position: MarketPosition.LONG,
        leverage: 10,
      });

      expect(result.rawPnl).toBe(0.1);
      expect(result.effectivePnl).toBe(1.0); // 0.1 * 10
    });

    it('should cap leverage for difficulty PnL at 2x', () => {
      const result = MarketCalculator.calculatePnL({
        currentPrice: 44000,
        entryPrice: 40000,
        position: MarketPosition.LONG,
        leverage: 100,
      });

      expect(result.rawPnl).toBe(0.1);
      expect(result.effectivePnl).toBe(10.0); // 0.1 * 100 (full leverage)
      expect(result.difficultyPnl).toBe(0.2); // 0.1 * 2 (capped)
    });

    it('should return zero for invalid entry price', () => {
      const result = MarketCalculator.calculatePnL({
        currentPrice: 44000,
        entryPrice: 0,
        position: MarketPosition.LONG,
        leverage: 1,
      });

      expect(result.rawPnl).toBe(0);
      expect(result.effectivePnl).toBe(0);
      expect(result.difficultyPnl).toBe(0);
    });

    it('should return zero for invalid current price', () => {
      const result = MarketCalculator.calculatePnL({
        currentPrice: 0,
        entryPrice: 40000,
        position: MarketPosition.LONG,
        leverage: 1,
      });

      expect(result.rawPnl).toBe(0);
      expect(result.effectivePnl).toBe(0);
    });
  });

  describe('calculateLiquidationPrice', () => {
    it('should calculate liquidation price for LONG position', () => {
      const result = MarketCalculator.calculateLiquidationPrice({
        entryPrice: 40000,
        leverage: 10,
        position: MarketPosition.LONG,
      });

      // LONG 10x: 40000 * (1 - 1/10) = 40000 * 0.9 = 36000
      expect(result).toBe(36000);
    });

    it('should calculate liquidation price for SHORT position', () => {
      const result = MarketCalculator.calculateLiquidationPrice({
        entryPrice: 40000,
        leverage: 10,
        position: MarketPosition.SHORT,
      });

      // SHORT 10x: 40000 * (1 + 1/10) = 40000 * 1.1 = 44000
      expect(result).toBe(44000);
    });

    it('should handle 1x leverage (no liquidation point)', () => {
      const result = MarketCalculator.calculateLiquidationPrice({
        entryPrice: 40000,
        leverage: 1,
        position: MarketPosition.LONG,
      });

      // 40000 * (1 - 1/1) = 0
      expect(result).toBe(0);
    });

    it('should return 0 for invalid entry price', () => {
      const result = MarketCalculator.calculateLiquidationPrice({
        entryPrice: 0,
        leverage: 10,
        position: MarketPosition.LONG,
      });

      expect(result).toBe(0);
    });

    it('should return 0 for invalid leverage', () => {
      const result = MarketCalculator.calculateLiquidationPrice({
        entryPrice: 40000,
        leverage: 0 as LeverageOption, // Cast to test edge case with invalid value
        position: MarketPosition.LONG,
      });

      expect(result).toBe(0);
    });
  });

  describe('calculateATR', () => {
    it('should calculate ATR from OHLC data', () => {
      const result = MarketCalculator.calculateATR(
        { high: 45000, low: 44000, close: 44500 },
        { trHistory: [], prevClose: null }
      );

      // TR = max(H-L, |H-PC|, |L-PC|) = max(1000, 0, 0) = 1000
      expect(result.atr).toBe(1000);
      expect(result.newTrHistory).toHaveLength(1);
      expect(result.newPrevClose).toBe(44500);
    });

    it('should include previous close in TR calculation', () => {
      const result = MarketCalculator.calculateATR(
        { high: 45000, low: 44000, close: 44500 },
        { trHistory: [], prevClose: 43000 }
      );

      // TR = max(H-L, |H-PC|, |L-PC|) = max(1000, 2000, 1000) = 2000
      expect(result.atr).toBe(2000);
    });

    it('should maintain rolling TR history up to 14 periods', () => {
      let context: { trHistory: number[]; prevClose: number | null } = {
        trHistory: [],
        prevClose: null,
      };

      // Add 20 data points
      for (let i = 0; i < 20; i++) {
        const result = MarketCalculator.calculateATR(
          { high: 45000 + i * 100, low: 44000 + i * 100, close: 44500 + i * 100 },
          context
        );
        context = {
          trHistory: result.newTrHistory,
          prevClose: result.newPrevClose,
        };
      }

      // Should cap at 14 periods
      expect(context.trHistory.length).toBeLessThanOrEqual(14);
    });

    it('should calculate ATR percent relative to price', () => {
      const result = MarketCalculator.calculateATR(
        { high: 45000, low: 44000, close: 50000 },
        { trHistory: [], prevClose: null }
      );

      // atrPercent = atr / close = 1000 / 50000 = 0.02
      expect(result.atrPercent).toBe(0.02);
    });

    it('should handle missing OHLC data gracefully', () => {
      const result = MarketCalculator.calculateATR(
        { close: 44500 },
        { trHistory: [500, 600], prevClose: 44000 }
      );

      // No new TR added (no high/low), but context maintained
      expect(result.newTrHistory).toEqual([500, 600]);
      expect(result.atr).toBe(550); // Average of existing
    });
  });

  describe('isLiquidated', () => {
    it('should detect liquidation for LONG when price drops below threshold', () => {
      const result = MarketCalculator.isLiquidated(35000, 36000, MarketPosition.LONG);

      expect(result).toBe(true);
    });

    it('should not trigger liquidation for LONG when price is above threshold', () => {
      const result = MarketCalculator.isLiquidated(37000, 36000, MarketPosition.LONG);

      expect(result).toBe(false);
    });

    it('should detect liquidation for SHORT when price rises above threshold', () => {
      const result = MarketCalculator.isLiquidated(45000, 44000, MarketPosition.SHORT);

      expect(result).toBe(true);
    });

    it('should not trigger liquidation for SHORT when price is below threshold', () => {
      const result = MarketCalculator.isLiquidated(43000, 44000, MarketPosition.SHORT);

      expect(result).toBe(false);
    });

    it('should detect liquidation at exact threshold for LONG', () => {
      const result = MarketCalculator.isLiquidated(36000, 36000, MarketPosition.LONG);

      expect(result).toBe(true);
    });

    it('should detect liquidation at exact threshold for SHORT', () => {
      const result = MarketCalculator.isLiquidated(44000, 44000, MarketPosition.SHORT);

      expect(result).toBe(true);
    });

    it('should return false for invalid inputs', () => {
      expect(MarketCalculator.isLiquidated(0, 36000, MarketPosition.LONG)).toBe(false);
      expect(MarketCalculator.isLiquidated(35000, 0, MarketPosition.LONG)).toBe(false);
    });
  });
});
