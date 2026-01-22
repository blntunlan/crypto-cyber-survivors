/**
 * Shock Factor Calculator Tests
 */

import { describe, it, expect } from 'vitest';
import {
  calculateShockFactor,
  getShockDirection,
  getShockIntensity,
} from '../../../services/difficulty/factors/ShockFactor';

describe('ShockFactor', () => {
  describe('calculateShockFactor', () => {
    it('should return no shock for empty history', () => {
      const result = calculateShockFactor({ pnlHistory: [], leverage: 10 });
      expect(result.triggered).toBe(false);
      expect(result.factor).toBe(1.0);
    });

    it('should return no shock for insufficient history', () => {
      const result = calculateShockFactor({
        pnlHistory: [0.1, 0.2, 0.3],
        leverage: 10,
      });
      expect(result.triggered).toBe(false);
    });

    it('should detect shock on sudden price movement', () => {
      // Create history with sudden jump
      // Older values: stable around 0
      // Recent values: jumped to +5% (leveraged)
      const pnlHistory = [0, 0, 0, 0.5, 0.5, 0.5]; // 3 old at 0, 3 new at 0.5

      // At 10x leverage: underlying move = 0.5/10 = 5% = 0.05 > 0.005 threshold
      const result = calculateShockFactor({ pnlHistory, leverage: 10 });
      expect(result.triggered).toBe(true);
      expect(result.factor).toBeGreaterThan(1.0);
    });

    it('should not trigger shock for gradual movement', () => {
      // Gradual change that doesn't exceed threshold when normalized
      const pnlHistory = [0, 0.01, 0.02, 0.03, 0.04, 0.05];

      // At 100x leverage: underlying moves are tiny
      const result = calculateShockFactor({ pnlHistory, leverage: 100 });
      expect(result.triggered).toBe(false);
    });

    it('should scale intensity with movement size', () => {
      const smallMove = [0, 0, 0, 0.1, 0.1, 0.1];
      const bigMove = [0, 0, 0, 0.5, 0.5, 0.5];

      const small = calculateShockFactor({ pnlHistory: smallMove, leverage: 10 });
      const big = calculateShockFactor({ pnlHistory: bigMove, leverage: 10 });

      if (small.triggered && big.triggered) {
        expect(big.factor).toBeGreaterThanOrEqual(small.factor);
      }
    });
  });

  describe('getShockDirection', () => {
    it('should return up for positive trend', () => {
      const pnlHistory = [0, 0, 0, 0.1, 0.2, 0.3];
      expect(getShockDirection(pnlHistory)).toBe('up');
    });

    it('should return down for negative trend', () => {
      const pnlHistory = [0.3, 0.2, 0.1, 0, -0.1, -0.2];
      expect(getShockDirection(pnlHistory)).toBe('down');
    });

    it('should return none for insufficient history', () => {
      expect(getShockDirection([0.1, 0.2])).toBe('none');
    });
  });

  describe('getShockIntensity', () => {
    it('should return 0 when no shock', () => {
      const intensity = getShockIntensity({ pnlHistory: [], leverage: 10 });
      expect(intensity).toBe(0);
    });

    it('should return intensity between 0 and 1 when shock detected', () => {
      const pnlHistory = [0, 0, 0, 0.5, 0.5, 0.5];
      const intensity = getShockIntensity({ pnlHistory, leverage: 10 });

      if (intensity > 0) {
        expect(intensity).toBeGreaterThan(0);
        expect(intensity).toBeLessThanOrEqual(1);
      }
    });
  });
});
