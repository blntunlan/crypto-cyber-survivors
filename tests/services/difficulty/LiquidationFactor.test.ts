/**
 * Liquidation Factor Calculator Tests
 */

import { describe, it, expect } from 'vitest';
import {
  calculateLiquidationFactor,
  getLiquidationDistance,
  isLiquidationImminent,
} from '../../../services/difficulty/factors/LiquidationFactor';
import { MarketPosition } from '../../../types';

describe('LiquidationFactor', () => {
  describe('calculateLiquidationFactor - LONG position', () => {
    const baseInput = {
      entryPrice: 100000,
      liquidationPrice: 80000, // 20% below entry
      position: MarketPosition.LONG,
    };

    it('should return NONE for price well above liquidation (>30%)', () => {
      const result = calculateLiquidationFactor({
        ...baseInput,
        currentPrice: 100000, // At entry = 100% distance from liq
      });
      expect(result.warningLevel).toBe('NONE');
      expect(result.factor).toBe(1.0);
      expect(result.fovReduction).toBe(0);
    });

    it('should return CAUTION for price 20-30% from liquidation', () => {
      // Distance = (85000 - 80000) / (100000 - 80000) = 5000/20000 = 0.25 (25%)
      const result = calculateLiquidationFactor({
        ...baseInput,
        currentPrice: 85000,
      });
      expect(result.warningLevel).toBe('CAUTION');
      expect(result.factor).toBe(1.3);
      expect(result.fovReduction).toBe(0.1);
    });

    it('should return DANGER for price 10-20% from liquidation', () => {
      // Distance = (83000 - 80000) / (100000 - 80000) = 3000/20000 = 0.15 (15%)
      const result = calculateLiquidationFactor({
        ...baseInput,
        currentPrice: 83000,
      });
      expect(result.warningLevel).toBe('DANGER');
      expect(result.factor).toBe(1.6);
      expect(result.fovReduction).toBe(0.25);
    });

    it('should return CRITICAL for price <10% from liquidation', () => {
      // Distance = (81000 - 80000) / (100000 - 80000) = 1000/20000 = 0.05 (5%)
      const result = calculateLiquidationFactor({
        ...baseInput,
        currentPrice: 81000,
      });
      expect(result.warningLevel).toBe('CRITICAL');
      expect(result.factor).toBe(2.0);
      expect(result.fovReduction).toBe(0.4);
    });
  });

  describe('calculateLiquidationFactor - SHORT position', () => {
    const baseInput = {
      entryPrice: 100000,
      liquidationPrice: 120000, // 20% above entry
      position: MarketPosition.SHORT,
    };

    it('should return NONE for price well below liquidation', () => {
      const result = calculateLiquidationFactor({
        ...baseInput,
        currentPrice: 100000, // At entry
      });
      expect(result.warningLevel).toBe('NONE');
      expect(result.factor).toBe(1.0);
    });

    it('should return CRITICAL when price approaches liquidation', () => {
      // Distance = (120000 - 119000) / (120000 - 100000) = 1000/20000 = 0.05
      const result = calculateLiquidationFactor({
        ...baseInput,
        currentPrice: 119000,
      });
      expect(result.warningLevel).toBe('CRITICAL');
      expect(result.factor).toBe(2.0);
    });
  });

  describe('getLiquidationDistance', () => {
    it('should return 100% at entry price for LONG', () => {
      const distance = getLiquidationDistance({
        currentPrice: 100000,
        entryPrice: 100000,
        liquidationPrice: 80000,
        position: MarketPosition.LONG,
      });
      expect(distance).toBe(100);
    });

    it('should return 0% at liquidation price', () => {
      const distance = getLiquidationDistance({
        currentPrice: 80000,
        entryPrice: 100000,
        liquidationPrice: 80000,
        position: MarketPosition.LONG,
      });
      expect(distance).toBe(0);
    });
  });

  describe('isLiquidationImminent', () => {
    it('should return true when distance < 10%', () => {
      expect(
        isLiquidationImminent({
          currentPrice: 81000,
          entryPrice: 100000,
          liquidationPrice: 80000,
          position: MarketPosition.LONG,
        })
      ).toBe(true);
    });

    it('should return false when distance > 10%', () => {
      expect(
        isLiquidationImminent({
          currentPrice: 90000,
          entryPrice: 100000,
          liquidationPrice: 80000,
          position: MarketPosition.LONG,
        })
      ).toBe(false);
    });
  });
});
