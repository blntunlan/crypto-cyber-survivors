/**
 * Level and Streak Factor Tests
 */

import { describe, it, expect } from 'vitest';
import {
  calculateLevelFactor,
  getLevelCapForLeverage,
} from '../../../services/difficulty/factors/LevelFactor';
import {
  calculateStreakFactor,
  getStreakTier,
  getKillsToNextThreshold,
} from '../../../services/difficulty/factors/StreakFactor';
import {
  calculateNearDeathFactor,
  getHealthDangerLevel,
  shouldApplyMercy,
} from '../../../services/difficulty/factors/NearDeathFactor';

describe('LevelFactor', () => {
  describe('calculateLevelFactor', () => {
    it('should return 1.0 for level 1', () => {
      const result = calculateLevelFactor({ level: 1, leverage: 5 });
      expect(result).toBe(1.0);
    });

    it('should increase with level', () => {
      const level1 = calculateLevelFactor({ level: 1, leverage: 5 });
      const level5 = calculateLevelFactor({ level: 5, leverage: 5 });
      const level10 = calculateLevelFactor({ level: 10, leverage: 5 });

      expect(level5).toBeGreaterThan(level1);
      expect(level10).toBeGreaterThan(level5);
    });

    it('should scale more steeply with higher leverage', () => {
      const lowLev = calculateLevelFactor({ level: 5, leverage: 1 });
      const highLev = calculateLevelFactor({ level: 5, leverage: 100 });

      expect(highLev).toBeGreaterThan(lowLev);
    });

    it('should cap at 2.0', () => {
      const result = calculateLevelFactor({ level: 50, leverage: 100 });
      expect(result).toBe(2.0);
    });
  });

  describe('getLevelCapForLeverage', () => {
    it('should return higher level cap for lower leverage', () => {
      const lowLevCap = getLevelCapForLeverage(1);
      const highLevCap = getLevelCapForLeverage(100);

      expect(lowLevCap).toBeGreaterThan(highLevCap);
    });
  });
});

describe('StreakFactor', () => {
  describe('calculateStreakFactor', () => {
    it('should return 1.0 for no kills', () => {
      const result = calculateStreakFactor({ killStreak: 0, timeSinceLastKill: -1 });
      expect(result).toBe(1.0);
    });

    it('should return 1.0 for expired streak', () => {
      const result = calculateStreakFactor({ killStreak: 10, timeSinceLastKill: 5000 });
      expect(result).toBe(1.0);
    });

    it('should return bonus for active streak', () => {
      // 5 kills = 1 bonus increment = 5%
      const result = calculateStreakFactor({ killStreak: 5, timeSinceLastKill: 100 });
      expect(result).toBe(1.05);
    });

    it('should cap at 30% bonus', () => {
      const result = calculateStreakFactor({ killStreak: 100, timeSinceLastKill: 100 });
      expect(result).toBe(1.3);
    });
  });

  describe('getStreakTier', () => {
    it('should return correct tiers', () => {
      expect(getStreakTier(0)).toBe('none');
      expect(getStreakTier(5)).toBe('hot');
      expect(getStreakTier(20)).toBe('blazing');
      expect(getStreakTier(40)).toBe('unstoppable');
      expect(getStreakTier(60)).toBe('godlike');
    });
  });

  describe('getKillsToNextThreshold', () => {
    it('should return kills needed for next bonus', () => {
      expect(getKillsToNextThreshold(0)).toBe(5);
      expect(getKillsToNextThreshold(3)).toBe(2);
      expect(getKillsToNextThreshold(7)).toBe(3);
    });
  });
});

describe('NearDeathFactor', () => {
  describe('calculateNearDeathFactor', () => {
    it('should return 1.0 for full health', () => {
      const result = calculateNearDeathFactor({ hpPercent: 1.0 });
      expect(result).toBe(1.0);
    });

    it('should return 1.0 above threshold', () => {
      const result = calculateNearDeathFactor({ hpPercent: 0.5 });
      expect(result).toBe(1.0);
    });

    it('should reduce difficulty below threshold', () => {
      const result = calculateNearDeathFactor({ hpPercent: 0.2 });
      expect(result).toBeLessThan(1.0);
    });

    it('should return minimum at critical HP', () => {
      const result = calculateNearDeathFactor({ hpPercent: 0.05 });
      expect(result).toBe(0.5);
    });
  });

  describe('getHealthDangerLevel', () => {
    it('should return correct danger levels', () => {
      expect(getHealthDangerLevel(1.0)).toBe('safe');
      expect(getHealthDangerLevel(0.25)).toBe('warning');
      expect(getHealthDangerLevel(0.15)).toBe('danger');
      expect(getHealthDangerLevel(0.05)).toBe('critical');
    });
  });

  describe('shouldApplyMercy', () => {
    it('should return true below threshold', () => {
      expect(shouldApplyMercy(0.2)).toBe(true);
    });

    it('should return false above threshold', () => {
      expect(shouldApplyMercy(0.5)).toBe(false);
    });
  });
});
