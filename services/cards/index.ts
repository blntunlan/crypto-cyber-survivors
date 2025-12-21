/**
 * Cards Module - Public API
 *
 * Re-exports all card system functionality.
 *
 * @example
 * import { CardSystem, Card, TIER_CONFIG } from './services/cards';
 */

// Main system
export { CardSystem } from './CardSystem';

// Types
export type { Card, CardTier, TierConfig } from './types';
export { TIER_ORDER } from './types';

// Configuration
export { TIER_CONFIG, getTierConfig, getAllTiers } from './tierConfig';

// Card collections
export {
  COMMON_CARDS,
  RARE_CARDS,
  EPIC_CARDS,
  LEGENDARY_CARDS,
  ALL_CARDS,
  ALL_CARDS_FLAT,
  TOTAL_CARDS,
} from './cardDefinitions';
