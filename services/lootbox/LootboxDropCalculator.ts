/**
 * LootboxDropCalculator - Weighted random drop calculation
 *
 * Handles the RNG mathematics for lootbox drops.
 * Uses weighted random selection for fair but exciting drops.
 */

import {
  type DropCategory,
  type LootboxDrop,
  type LootboxRarity,
  LOOTBOX_DROP_RATES,
} from '../../types/lootbox';
import { LOOTBOX_DROP_POOLS } from './LootboxDropPools';

/**
 * Calculates drops from lootboxes using weighted random selection
 */
export class LootboxDropCalculator {
  /**
   * Calculate a single drop from a lootbox
   * @param rarity - The rarity of the lootbox being opened
   * @returns The calculated drop
   */
  calculateDrop(rarity: LootboxRarity): LootboxDrop {
    // Step 1: Determine category based on weights
    const category = this.selectCategory(rarity);

    // Step 2: Select item from category pool
    const drop = this.selectFromPool(category, rarity);

    return drop;
  }

  /**
   * Select a category based on weighted probabilities
   */
  private selectCategory(rarity: LootboxRarity): DropCategory {
    const rates = LOOTBOX_DROP_RATES[rarity];
    const totalWeight =
      rates.coins + rates.consumable + rates.character_skin + rates.crypto_token;
    const roll = Math.random() * totalWeight;

    let cumulative = 0;

    cumulative += rates.coins;
    if (roll < cumulative) return 'coins';

    cumulative += rates.consumable;
    if (roll < cumulative) return 'consumable';

    cumulative += rates.character_skin;
    if (roll < cumulative) return 'character_skin';

    // Crypto tokens (effectively 0% but kept for future)
    return 'crypto_token';
  }

  /**
   * Select an item from the appropriate pool
   */
  private selectFromPool(
    category: DropCategory,
    lootboxRarity: LootboxRarity
  ): LootboxDrop {
    const pool = LOOTBOX_DROP_POOLS[category];

    // Filter by rarity - higher rarity lootboxes can drop items up to their tier
    const eligibleItems = pool.filter(item => {
      const rarityOrder: Record<LootboxRarity, number> = {
        common: 0,
        rare: 1,
        epic: 2,
        legendary: 3,
      };

      // Items can only drop if their rarity <= lootbox rarity
      // But higher rarity items have lower internal weight
      return rarityOrder[item.rarity] <= rarityOrder[lootboxRarity];
    });

    // Weighted selection within pool
    const weights = eligibleItems.map(item =>
      this.getItemWeight(item.rarity, lootboxRarity)
    );
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const roll = Math.random() * totalWeight;

    let cumulative = 0;
    for (let i = 0; i < eligibleItems.length; i++) {
      cumulative += weights[i] ?? 0;
      if (roll < cumulative) {
        const item = eligibleItems[i];
        if (item) return this.finalizeItem(item);
      }
    }
    // Fallback to first item
    const fallbackItem = eligibleItems[0];
    if (fallbackItem) {
      return this.finalizeItem(fallbackItem);
    }

    // Ultimate fallback - return a default coin drop
    return {
      id: 'fallback_coins',
      category: 'coins',
      name: '100 Coins',
      icon: '💰',
      rarity: 'common',
      description: 'Fallback reward',
      minAmount: 100,
      maxAmount: 100,
    };
  }

  /**
   * Calculate item weight based on rarity difference
   * Higher rarity items are rarer even when eligible
   */
  private getItemWeight(
    itemRarity: LootboxRarity,
    lootboxRarity: LootboxRarity
  ): number {
    const rarityMultipliers: Record<LootboxRarity, number> = {
      common: 100,
      rare: 40,
      epic: 15,
      legendary: 5,
    };

    // Boost for matching rarity (luck factor)
    const matchBonus = itemRarity === lootboxRarity ? 1.5 : 1.0;

    return rarityMultipliers[itemRarity] * matchBonus;
  }

  /**
   * Finalize item (apply random amounts for coins, etc.)
   */
  private finalizeItem(item: LootboxDrop): LootboxDrop {
    if (item.category === 'coins') {
      const coinItem = { ...item };
      const range = coinItem.maxAmount - coinItem.minAmount;
      const amount = Math.floor(coinItem.minAmount + Math.random() * range);
      return {
        ...coinItem,
        amount,
        name: `${amount} Coins`,
        description: `You received ${amount} coins!`,
      };
    }

    return item;
  }

  /**
   * Calculate multiple drops (for special events)
   */
  calculateMultipleDrops(rarity: LootboxRarity, count: number): LootboxDrop[] {
    const drops: LootboxDrop[] = [];
    for (let i = 0; i < count; i++) {
      drops.push(this.calculateDrop(rarity));
    }
    return drops;
  }

  /**
   * Simulate drop rates for debugging/balancing
   */
  simulateDropRates(
    rarity: LootboxRarity,
    iterations: number = 10000
  ): Record<DropCategory, number> {
    const counts: Record<DropCategory, number> = {
      coins: 0,
      consumable: 0,
      character_skin: 0,
      crypto_token: 0,
    };

    for (let i = 0; i < iterations; i++) {
      const drop = this.calculateDrop(rarity);
      counts[drop.category]++;
    }

    // Convert to percentages
    return {
      coins: (counts.coins / iterations) * 100,
      consumable: (counts.consumable / iterations) * 100,
      character_skin: (counts.character_skin / iterations) * 100,
      crypto_token: (counts.crypto_token / iterations) * 100,
    };
  }
}

// Singleton export
export const dropCalculator = new LootboxDropCalculator();
