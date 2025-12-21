/**
 * Tier Configuration
 *
 * Visual styling and drop rate configuration for each card tier.
 */

import { COLORS } from '../../constants';
import { type CardTier, type TierConfig } from './types';

/**
 * Configuration for each card tier
 */
export const TIER_CONFIG: Record<CardTier, TierConfig> = {
  common: {
    name: 'Common',
    color: '#9ca3af', // Silver gray
    bgColor: COLORS.SLOT_BLACK,
    borderColor: '#4b5563',
    glowColor: 'transparent',
    baseChance: 60,
    luckMultiplier: 0,
  },
  rare: {
    name: 'Rare',
    color: COLORS.ELECTRIC_BLUE,
    bgColor: '#0a1929',
    borderColor: COLORS.ELECTRIC_BLUE,
    glowColor: COLORS.ELECTRIC_BLUE,
    baseChance: 25,
    luckMultiplier: 2,
  },
  epic: {
    name: 'Epic',
    color: COLORS.ROYAL_PURPLE,
    bgColor: '#1a0a29',
    borderColor: COLORS.ROYAL_PURPLE,
    glowColor: COLORS.ROYAL_PURPLE,
    baseChance: 12,
    luckMultiplier: 3,
  },
  legendary: {
    name: 'Legendary',
    color: COLORS.CASINO_GOLD,
    bgColor: '#291a0a',
    borderColor: COLORS.CASINO_GOLD,
    glowColor: COLORS.CASINO_GOLD,
    baseChance: 3,
    luckMultiplier: 5,
  },
};

/**
 * Get tier configuration by tier name
 */
export function getTierConfig(tier: CardTier): TierConfig {
  return TIER_CONFIG[tier];
}

/**
 * Get all tier names in order
 */
export function getAllTiers(): CardTier[] {
  return ['common', 'rare', 'epic', 'legendary'];
}
