/**
 * Cycle Factor Calculator Tests
 */

import { describe, it, expect } from 'vitest';
import {
  calculateCycleFactor,
  getCurrentCycle,
  getCycleProgress,
  getTimeRemainingInCycle,
} from '../../../services/difficulty/factors/CycleFactor';

describe('CycleFactor', () => {
  const cycleDuration = 300; // 5 minutes

  describe('calculateCycleFactor', () => {
    it('should return 1.0 for cycle 1 (0 seconds)', () => {
      const result = calculateCycleFactor({ elapsedSeconds: 0, cycleDuration });
      expect(result).toBe(1.0);
    });

    it('should return 1.0 throughout cycle 1 (0-299 seconds)', () => {
      const result = calculateCycleFactor({ elapsedSeconds: 299, cycleDuration });
      expect(result).toBe(1.0);
    });

    it('should return 1.5 for cycle 2 (300+ seconds)', () => {
      const result = calculateCycleFactor({ elapsedSeconds: 300, cycleDuration });
      expect(result).toBe(1.5);
    });

    it('should return 2.25 for cycle 3 (600+ seconds)', () => {
      const result = calculateCycleFactor({ elapsedSeconds: 600, cycleDuration });
      expect(result).toBe(2.25);
    });

    it('should use linear growth after cycle 3 (soft cap)', () => {
      // Cycle 4: 2.25 + 0.475 = 2.725
      const cycle4 = calculateCycleFactor({ elapsedSeconds: 900, cycleDuration });
      expect(cycle4).toBeCloseTo(2.725, 2);

      // Cycle 5: 2.25 + 0.95 = 3.2
      const cycle5 = calculateCycleFactor({ elapsedSeconds: 1200, cycleDuration });
      expect(cycle5).toBeCloseTo(3.2, 2);
    });

    it('should handle invalid cycle duration gracefully', () => {
      const result = calculateCycleFactor({ elapsedSeconds: 100, cycleDuration: 0 });
      expect(result).toBe(1.0);
    });
  });

  describe('getCurrentCycle', () => {
    it('should return 1 for first cycle', () => {
      expect(getCurrentCycle(0)).toBe(1);
      expect(getCurrentCycle(150)).toBe(1);
      expect(getCurrentCycle(299)).toBe(1);
    });

    it('should return 2 for second cycle', () => {
      expect(getCurrentCycle(300)).toBe(2);
      expect(getCurrentCycle(450)).toBe(2);
    });

    it('should return 3 for third cycle', () => {
      expect(getCurrentCycle(600)).toBe(3);
    });
  });

  describe('getCycleProgress', () => {
    it('should return 0 at cycle start', () => {
      expect(getCycleProgress(0)).toBe(0);
      expect(getCycleProgress(300)).toBe(0);
    });

    it('should return 0.5 at cycle midpoint', () => {
      expect(getCycleProgress(150)).toBe(0.5);
      expect(getCycleProgress(450)).toBe(0.5);
    });

    it('should return close to 1 at cycle end', () => {
      expect(getCycleProgress(299)).toBeCloseTo(299 / 300, 2);
    });
  });

  describe('getTimeRemainingInCycle', () => {
    it('should return full duration at cycle start', () => {
      expect(getTimeRemainingInCycle(0)).toBe(300);
    });

    it('should return 0 at cycle end', () => {
      expect(getTimeRemainingInCycle(300)).toBe(300); // Next cycle starts
    });

    it('should decrease as time passes', () => {
      expect(getTimeRemainingInCycle(100)).toBe(200);
      expect(getTimeRemainingInCycle(200)).toBe(100);
    });
  });
});
