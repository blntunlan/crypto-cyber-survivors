/**
 * Card System Types
 *
 * Type definitions for the card/upgrade system.
 */

import { type Player } from '../../types';

/**
 * Card rarity tiers
 */
export type CardTier = 'common' | 'rare' | 'epic' | 'legendary';

/**
 * Card definition interface
 */
export interface Card {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: CardTier;
  effect: (player: Player) => Player;
}

/**
 * Tier configuration for UI styling and drop rates
 */
export interface TierConfig {
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  baseChance: number;
  luckMultiplier: number;
}

/**
 * Tier order for sorting (legendary first)
 */
export const TIER_ORDER: CardTier[] = ['legendary', 'epic', 'rare', 'common'];
