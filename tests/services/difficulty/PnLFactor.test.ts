/**
 * PnL Factor Calculator Tests
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePnLFactor,
  getPnLStatus,
} from '../../../services/difficulty/factors/PnLFactor';

describe('PnLFactor', () => {
  describe('calculatePnLFactor', () => {
    it('should return 1.0 for neutral PnL', () => {
      const result = calculatePnLFactor({ pnlPercent: 0, leverage: 10 });
      expect(result).toBe(1.0);
    });

    it('should increase difficulty when losing (negative PnL)', () => {
      const result = calculatePnLFactor({ pnlPercent: -0.05, leverage: 10 }); // -5% * 10x = -50%
      expect(result).toBeGreaterThan(1.0);
      expect(result).toBeLessThanOrEqual(3.0); // Max cap
    });

    it('should decrease difficulty when winning (positive PnL)', () => {
      const result = calculatePnLFactor({ pnlPercent: 0.05, leverage: 10 }); // +5% * 10x = +50%
      expect(result).toBeLessThan(1.0);
      expect(result).toBeGreaterThanOrEqual(0.7); // Min floor
    });

    it('should cap difficulty at 3.0 for extreme losses', () => {
      const result = calculatePnLFactor({ pnlPercent: -0.5, leverage: 100 }); // -50% * 100x = -5000%
      expect(result).toBe(3.0);
    });

    it('should floor difficulty at 0.7 for extreme profits', () => {
      const result = calculatePnLFactor({ pnlPercent: 0.5, leverage: 100 }); // +50% * 100x = +5000%
      expect(result).toBe(0.7);
    });

    it('should scale with leverage', () => {
      const low = calculatePnLFactor({ pnlPercent: -0.05, leverage: 1 });
      const high = calculatePnLFactor({ pnlPercent: -0.05, leverage: 10 });
      expect(high).toBeGreaterThan(low);
    });
  });

  describe('getPnLStatus', () => {
    it('should return profit status for positive PnL', () => {
      const result = getPnLStatus(0.05, 10);
      expect(result.status).toBe('profit');
      expect(result.leveragedPnL).toBe(0.5);
    });

    it('should return loss status for negative PnL', () => {
      const result = getPnLStatus(-0.05, 10);
      expect(result.status).toBe('loss');
      expect(result.leveragedPnL).toBe(-0.5);
    });

    it('should return neutral for zero PnL', () => {
      const result = getPnLStatus(0, 10);
      expect(result.status).toBe('neutral');
    });
  });
});
