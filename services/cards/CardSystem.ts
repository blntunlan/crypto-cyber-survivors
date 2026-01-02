/**
 * CardSystem - Card Selection Logic
 *
 * Handles tier rolling and card selection for level-up rewards.
 * Uses luck-based probability system with level restrictions.
 */

import { type Card, type CardTier, TIER_ORDER } from './types';
import { TIER_CONFIG, getTierConfig, getAllTiers } from './tierConfig';
import { ALL_CARDS } from './cardDefinitions';

/**
 * CardSystem singleton class
 *
 * Manages card selection logic based on player luck and level.
 */
class CardSystemClass {
  private static instance: CardSystemClass | null = null;

  private constructor() {}

  static getInstance(): CardSystemClass {
    return (CardSystemClass.instance ??= new CardSystemClass());
  }

  /**
   * Roll for a tier based on player luck and level
   */
  rollTier(playerLuck: number, playerLevel: number): CardTier {
    const roll = Math.random() * 100;

    // Calculate chances with luck bonus
    let legendaryChance =
      TIER_CONFIG.legendary.baseChance + playerLuck * TIER_CONFIG.legendary.luckMultiplier;
    let epicChance = TIER_CONFIG.epic.baseChance + playerLuck * TIER_CONFIG.epic.luckMultiplier;
    let rareChance = TIER_CONFIG.rare.baseChance + playerLuck * TIER_CONFIG.rare.luckMultiplier;

    // Level-based restrictions (adjusted for better progression)
    if (playerLevel < 10) legendaryChance = 0; // Was 12
    if (playerLevel < 6) epicChance = 0; // Was 7
    if (playerLevel < 3) rareChance = 0;

    if (roll < legendaryChance) return 'legendary';
    if (roll < legendaryChance + epicChance) return 'epic';
    if (roll < legendaryChance + epicChance + rareChance) return 'rare';
    return 'common';
  }

  /**
   * Get a random card from a specific tier
   */
  getRandomCardFromTier(tier: CardTier): Card {
    const tierCards = ALL_CARDS[tier];
    const card = tierCards[Math.floor(Math.random() * tierCards.length)];
    return card ?? tierCards[0]!;
  }

  /**
   * Generate 3 card choices for level up
   */
  generateChoices(playerLuck: number, playerLevel: number): Card[] {
    const choices: Card[] = [];
    const usedIds = new Set<string>();

    while (choices.length < 3) {
      const tier = this.rollTier(playerLuck, playerLevel);
      const card = this.getRandomCardFromTier(tier);

      if (!usedIds.has(card.id)) {
        choices.push(card);
        usedIds.add(card.id);
      }
    }

    // Sort by tier (legendary first)
    choices.sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));

    return choices;
  }

  /**
   * Get tier configuration for UI styling
   */
  getTierConfig(tier: CardTier) {
    return getTierConfig(tier);
  }

  /**
   * Get all tiers for display
   */
  getAllTiers(): CardTier[] {
    return getAllTiers();
  }
}

// Export singleton
export const CardSystem = CardSystemClass.getInstance();
