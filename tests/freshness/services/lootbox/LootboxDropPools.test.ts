import { describe, it, expect } from 'vitest';
import {
  LOOTBOX_DROP_POOLS,
  getEligibleDrops,
  getPoolStats,
} from '../../../../services/lootbox/LootboxDropPools';
import {
  CONSUMABLE_DEFINITIONS,
  CHARACTER_SKIN_DEFINITIONS,
} from '../../../../types/inventory';

describe('LootboxDropPools', () => {
  it('reports pool sizes consistently with exported pools', () => {
    const stats = getPoolStats();

    expect(stats.coins).toBe(LOOTBOX_DROP_POOLS.coins.length);
    expect(stats.consumable).toBe(LOOTBOX_DROP_POOLS.consumable.length);
    expect(stats.character_skin).toBe(LOOTBOX_DROP_POOLS.character_skin.length);
    expect(stats.crypto_token).toBe(LOOTBOX_DROP_POOLS.crypto_token.length);
  });

  it('maps consumables and lootbox-unlockable skins from inventory definitions', () => {
    expect(LOOTBOX_DROP_POOLS.consumable).toHaveLength(
      Object.values(CONSUMABLE_DEFINITIONS).length
    );

    const lootboxSkins = Object.values(CHARACTER_SKIN_DEFINITIONS).filter(
      skin => skin.unlockMethod === 'lootbox'
    );

    expect(LOOTBOX_DROP_POOLS.character_skin).toHaveLength(lootboxSkins.length);
    for (const drop of LOOTBOX_DROP_POOLS.character_skin) {
      expect(drop.id.startsWith('skin_')).toBe(true);
    }
  });

  it('filters eligible drops by max rarity and excludes crypto token marketing drops', () => {
    const commonOnly = getEligibleDrops('common');
    const upToRare = getEligibleDrops('rare');

    expect(commonOnly.every(drop => drop.rarity === 'common')).toBe(true);
    expect(upToRare.some(drop => drop.rarity === 'rare')).toBe(true);
    expect(upToRare.some(drop => drop.category === 'crypto_token')).toBe(false);
  });

  it('keeps coin drop ranges valid', () => {
    for (const drop of LOOTBOX_DROP_POOLS.coins) {
      expect(drop.minAmount).toBeGreaterThan(0);
      expect(drop.maxAmount).toBeGreaterThanOrEqual(drop.minAmount);
    }
  });
});
