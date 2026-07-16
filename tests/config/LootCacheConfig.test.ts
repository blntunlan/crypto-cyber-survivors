import { describe, expect, it } from 'vitest';
import {
  getLootCacheFragmentChance,
  getLootCacheRarityWeights,
} from '../../config/LootCacheConfig';

describe('LootCacheConfig', () => {
  it('keeps fragments disabled before three minutes', () => {
    for (const rarity of ['common', 'rare', 'epic', 'legendary'] as const) {
      expect(getLootCacheFragmentChance(179.999, rarity)).toBe(0);
    }
  });

  it('switches rarity weights at approved boundaries', () => {
    expect(getLootCacheRarityWeights(0)).toEqual({
      common: 78,
      rare: 20,
      epic: 2,
      legendary: 0,
    });
    expect(getLootCacheRarityWeights(180)).toEqual({
      common: 65,
      rare: 27,
      epic: 7,
      legendary: 1,
    });
    expect(getLootCacheRarityWeights(420)).toEqual({
      common: 55,
      rare: 30,
      epic: 12,
      legendary: 3,
    });
    expect(getLootCacheRarityWeights(720)).toEqual({
      common: 45,
      rare: 32,
      epic: 18,
      legendary: 5,
    });
  });

  it('opens blue fragment eligibility at seven minutes', () => {
    expect(getLootCacheFragmentChance(419.999, 'rare')).toBe(0);
    expect(getLootCacheFragmentChance(420, 'rare')).toBe(0.01);
    expect(getLootCacheFragmentChance(720, 'rare')).toBe(0.02);
  });
});
