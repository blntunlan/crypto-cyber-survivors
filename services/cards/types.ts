/**
 * Card System Types
 *
 * Type definitions for the card/upgrade system.
 */

import { type Player } from '../../types';
import { type StatKey } from '../../config/StatRegistry';

/**
 * Card rarity tiers
 */
export type CardTier = 'common' | 'rare' | 'epic' | 'legendary';

/**
 * Stat modifier type for declarative card effects
 */
export interface StatModifier {
  stat: StatKey;
  value: number;
  type: 'add' | 'multiply' | 'percent'; // add: +X, multiply: *X, percent: X=0.05 is +5%
}

/**
 * Card definition interface
 */
export interface Card {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: CardTier;
  modifiers?: StatModifier[];
  effect?: (player: Player) => Player; // Keep for custom or highly complex logic
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
