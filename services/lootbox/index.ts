/**
 * Lootbox Module - Public exports
 */

export { LootboxService } from './LootboxService';
export { dropCalculator, LootboxDropCalculator } from './LootboxDropCalculator';
export { LOOTBOX_DROP_POOLS, getEligibleDrops, getPoolStats } from './LootboxDropPools';

// Re-export types
export type {
  LootboxType,
  LootboxRarity,
  LootboxConfig,
  LootboxDrop,
  LootboxOpenResult,
  PlayerLootbox,
  LootboxSource,
  DropCategory,
  CoinDrop,
  ConsumableDrop,
  CharacterSkinDrop,
  CryptoTokenDrop,
} from '../../types/lootbox';
