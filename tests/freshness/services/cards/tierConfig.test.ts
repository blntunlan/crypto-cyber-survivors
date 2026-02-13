import { describe, it, expect } from 'vitest';
import {
  TIER_CONFIG,
  getTierConfig,
  getAllTiers,
} from '../../../../services/cards/tierConfig';

describe('tierConfig', () => {
  it('returns all tiers in deterministic order', () => {
    expect(getAllTiers()).toEqual(['common', 'rare', 'epic', 'legendary']);
  });

  it('exposes stable base chance distribution', () => {
    const totalChance = Object.values(TIER_CONFIG).reduce(
      (sum, tier) => sum + tier.baseChance,
      0
    );

    expect(totalChance).toBe(100);
    expect(TIER_CONFIG.common.baseChance).toBeGreaterThan(TIER_CONFIG.rare.baseChance);
    expect(TIER_CONFIG.legendary.baseChance).toBeLessThan(TIER_CONFIG.epic.baseChance);
  });

  it('returns config by tier and keeps luck multipliers ascending', () => {
    expect(getTierConfig('rare')).toBe(TIER_CONFIG.rare);

    expect(TIER_CONFIG.common.luckMultiplier).toBeLessThan(
      TIER_CONFIG.rare.luckMultiplier
    );
    expect(TIER_CONFIG.rare.luckMultiplier).toBeLessThan(
      TIER_CONFIG.epic.luckMultiplier
    );
    expect(TIER_CONFIG.epic.luckMultiplier).toBeLessThan(
      TIER_CONFIG.legendary.luckMultiplier
    );
  });
});
