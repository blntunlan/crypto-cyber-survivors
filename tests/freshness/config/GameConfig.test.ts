import { describe, it, expect } from 'vitest';
import {
  DIFFICULTY_CONFIG,
  LEVERAGE_TIERS,
  COMBAT_CONFIG,
  ECONOMY_CONFIG,
} from '../../../config/GameConfig';

describe('GameConfig', () => {
  it('defines valid min/max ranges for difficulty limits', () => {
    for (const limit of Object.values(DIFFICULTY_CONFIG.LIMITS)) {
      expect(limit.min).toBeLessThan(limit.max);
      expect(limit.min).toBeGreaterThan(0);
    }
  });

  it('keeps leverage tiers ordered by increasing pressure', () => {
    const ordered = Object.entries(LEVERAGE_TIERS)
      .map(([tier, value]) => ({ tier: Number(tier), value }))
      .sort((a, b) => a.tier - b.tier);

    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i]!.value.spawn).toBeGreaterThanOrEqual(
        ordered[i - 1]!.value.spawn
      );
      expect(ordered[i]!.value.speed).toBeGreaterThanOrEqual(
        ordered[i - 1]!.value.speed
      );
      expect(ordered[i]!.value.hp).toBeGreaterThanOrEqual(ordered[i - 1]!.value.hp);
      expect(ordered[i]!.value.damage).toBeGreaterThanOrEqual(
        ordered[i - 1]!.value.damage
      );
      // xpReq DECREASES with leverage (higher leverage = faster leveling = less XP needed)
      expect(ordered[i]!.value.xpReq).toBeLessThanOrEqual(ordered[i - 1]!.value.xpReq);
    }
  });

  it('keeps combat/economy values in sane bounds', () => {
    expect(COMBAT_CONFIG.BULLET_SPEED).toBeGreaterThan(0);
    expect(COMBAT_CONFIG.BULLET_LIFETIME).toBeGreaterThan(0);
    expect(COMBAT_CONFIG.ARMOR_REDUCTION_PER_POINT).toBeGreaterThan(0);

    expect(ECONOMY_CONFIG.LUCK.BASE_RARE_CHANCE).toBeGreaterThanOrEqual(0);
    expect(ECONOMY_CONFIG.LUCK.MAX_RARE_CHANCE).toBeLessThanOrEqual(1);
    expect(ECONOMY_CONFIG.LUCK.MAX_BONUS_GEM_CHANCE).toBeLessThanOrEqual(1);
  });
});
