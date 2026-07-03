import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENT_CATALOG,
  ACTIVE_ACHIEVEMENTS,
  getAchievementById,
  isAchievementConditionMet,
  type PlayerAggregateStats,
} from '../../src/config/achievementCatalog';

const ZERO_STATS: PlayerAggregateStats = {
  totalKills: 0,
  maxSurvivalSeconds: 0,
  maxLevel: 0,
  maxPnl: 0,
};

describe('achievementCatalog', () => {
  describe('catalog structure', () => {
    it('every achievement has a unique non-empty id', () => {
      const ids = ACHIEVEMENT_CATALOG.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) {
        expect(id.length).toBeGreaterThan(0);
      }
    });

    it('every achievement has a non-empty name and description', () => {
      for (const a of ACHIEVEMENT_CATALOG) {
        expect(a.name.length).toBeGreaterThan(0);
        expect(a.description.length).toBeGreaterThan(0);
      }
    });

    it('conditionValue is always positive', () => {
      for (const a of ACHIEVEMENT_CATALOG) {
        expect(a.conditionValue).toBeGreaterThan(0);
      }
    });

    it('rewardGold is non-negative', () => {
      for (const a of ACHIEVEMENT_CATALOG) {
        expect(a.rewardGold).toBeGreaterThanOrEqual(0);
      }
    });

    it('ACTIVE_ACHIEVEMENTS only includes isActive=true entries', () => {
      for (const a of ACTIVE_ACHIEVEMENTS) {
        expect(a.isActive).toBe(true);
      }
    });

    it('covers all four condition types', () => {
      const types = new Set(ACHIEVEMENT_CATALOG.map((a) => a.conditionType));
      expect(types.has('total_kills')).toBe(true);
      expect(types.has('survival_seconds')).toBe(true);
      expect(types.has('max_level')).toBe(true);
      expect(types.has('pnl_percent')).toBe(true);
    });
  });

  describe('getAchievementById', () => {
    it('returns the definition for a known id', () => {
      const first = ACHIEVEMENT_CATALOG[0];
      const result = getAchievementById(first.id);
      expect(result).toBeDefined();
      expect(result?.id).toBe(first.id);
    });

    it('returns undefined for an unknown id', () => {
      expect(getAchievementById('does_not_exist')).toBeUndefined();
    });
  });

  describe('isAchievementConditionMet', () => {
    it('total_kills condition checks cumulative kills', () => {
      const centurion = getAchievementById('centurion')!;
      expect(isAchievementConditionMet(centurion, { ...ZERO_STATS, totalKills: 99 })).toBe(false);
      expect(isAchievementConditionMet(centurion, { ...ZERO_STATS, totalKills: 100 })).toBe(true);
      expect(isAchievementConditionMet(centurion, { ...ZERO_STATS, totalKills: 500 })).toBe(true);
    });

    it('survival_seconds condition checks best run duration', () => {
      const survivor5 = getAchievementById('survivor_5min')!;
      expect(isAchievementConditionMet(survivor5, { ...ZERO_STATS, maxSurvivalSeconds: 299 })).toBe(false);
      expect(isAchievementConditionMet(survivor5, { ...ZERO_STATS, maxSurvivalSeconds: 300 })).toBe(true);
    });

    it('max_level condition checks best run level', () => {
      const level10 = getAchievementById('level_10')!;
      expect(isAchievementConditionMet(level10, { ...ZERO_STATS, maxLevel: 9 })).toBe(false);
      expect(isAchievementConditionMet(level10, { ...ZERO_STATS, maxLevel: 10 })).toBe(true);
    });

    it('pnl_percent condition checks best run PnL', () => {
      const pnl10 = getAchievementById('pnl_10')!;
      expect(isAchievementConditionMet(pnl10, { ...ZERO_STATS, maxPnl: 0.09 })).toBe(false);
      expect(isAchievementConditionMet(pnl10, { ...ZERO_STATS, maxPnl: 0.1 })).toBe(true);
    });

    it('returns false for zero stats across the board', () => {
      for (const a of ACTIVE_ACHIEVEMENTS) {
        expect(isAchievementConditionMet(a, ZERO_STATS)).toBe(false);
      }
    });

    it('all combat milestones met when totalKills is very high', () => {
      const highStats: PlayerAggregateStats = {
        totalKills: 100000,
        maxSurvivalSeconds: 0,
        maxLevel: 0,
        maxPnl: 0,
      };
      const combat = ACTIVE_ACHIEVEMENTS.filter((a) => a.conditionType === 'total_kills');
      for (const a of combat) {
        expect(isAchievementConditionMet(a, highStats)).toBe(true);
      }
    });
  });
});
