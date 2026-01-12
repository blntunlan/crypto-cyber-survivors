/**
 * Inventory Module - Public exports
 */

export { InventoryService } from './InventoryService';

// Re-export types
export type {
  PlayerInventory,
  ConsumableItem,
  CharacterSkinItem,
  CryptoTokenItem,
  InventoryItemType,
  ConsumableDefinition,
  CharacterSkinDefinition,
} from '../../types/inventory';

// Re-export from lootbox
export type { CharacterSkinId, ConsumableEffectType } from '../../types/lootbox';

export {
  CONSUMABLE_DEFINITIONS,
  CHARACTER_SKIN_DEFINITIONS,
  CRYPTO_TOKEN_DEFINITIONS,
  createEmptyInventory,
} from '../../types/inventory';
