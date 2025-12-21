/**
 * CardSystem - Legacy Re-export
 *
 * This file now re-exports from the modular cards system.
 * All functionality has been moved to ./cards/ directory.
 *
 * @deprecated Import from './cards' or './cards/CardSystem' directly
 *
 * Structure:
 * - cards/CardSystem.ts      - Main logic (tier rolling, card selection)
 * - cards/cardDefinitions.ts - All 35 card definitions
 * - cards/tierConfig.ts      - Tier styling and drop rates
 * - cards/types.ts           - Type definitions
 * - cards/index.ts           - Public exports
 */

// Re-export everything from the new modular system
export { CardSystem, TIER_CONFIG, ALL_CARDS_FLAT, getTierConfig, getAllTiers } from './cards';

export type { Card, CardTier, TierConfig } from './cards';
