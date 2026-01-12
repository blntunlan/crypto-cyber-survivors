/**
 * LootboxDropPools - All possible drops organized by category
 *
 * Contains the complete item pools for lootbox drops.
 * Each pool has items at various rarities with drop weights.
 */

import {
  type CoinDrop,
  type ConsumableDrop,
  type CharacterSkinDrop,
  type CryptoTokenDrop,
  type LootboxDrop,
  type DropCategory,
} from '../../types/lootbox';
import {
  CONSUMABLE_DEFINITIONS,
  CHARACTER_SKIN_DEFINITIONS,
} from '../../types/inventory';

// =============================================================================
// COIN DROPS
// =============================================================================

const COIN_DROPS: CoinDrop[] = [
  {
    id: 'coin_pouch_small',
    category: 'coins',
    name: 'Small Coin Pouch',
    icon: '💰',
    rarity: 'common',
    description: 'A small pouch of coins',
    minAmount: 50,
    maxAmount: 100,
  },
  {
    id: 'coin_pouch_medium',
    category: 'coins',
    name: 'Coin Bag',
    icon: '💰',
    rarity: 'rare',
    description: 'A decent bag of coins',
    minAmount: 200,
    maxAmount: 500,
  },
  {
    id: 'coin_chest',
    category: 'coins',
    name: 'Coin Chest',
    icon: '🪙',
    rarity: 'epic',
    description: 'A treasure chest of coins',
    minAmount: 1000,
    maxAmount: 2500,
  },
  {
    id: 'jackpot_vault',
    category: 'coins',
    name: 'Jackpot Vault',
    icon: '🏆',
    rarity: 'legendary',
    description: 'The legendary jackpot!',
    minAmount: 5000,
    maxAmount: 10000,
  },
];

// =============================================================================
// CONSUMABLE DROPS
// =============================================================================

const CONSUMABLE_DROPS: ConsumableDrop[] = Object.values(CONSUMABLE_DEFINITIONS).map(
  def => ({
    id: def.id,
    category: 'consumable' as const,
    name: def.name,
    icon: def.icon,
    rarity: def.rarity,
    description: def.description,
    effectType: def.effectType,
    effectValue: def.effectValue,
    duration: def.duration,
  })
);

// =============================================================================
// CHARACTER SKIN DROPS
// =============================================================================

const CHARACTER_SKIN_DROPS: CharacterSkinDrop[] = Object.values(
  CHARACTER_SKIN_DEFINITIONS
)
  .filter(def => def.unlockMethod === 'lootbox') // Only lootbox-unlockable skins
  .map(def => ({
    id: `skin_${def.id}`,
    category: 'character_skin' as const,
    name: def.name,
    icon: def.icon,
    rarity: def.rarity,
    description: def.description,
    skinId: def.id,
  }));

// =============================================================================
// CRYPTO TOKEN DROPS (Marketing Only - 0% actual drop rate)
// =============================================================================

const CRYPTO_TOKEN_DROPS: CryptoTokenDrop[] = [
  {
    id: 'btc_fragment',
    category: 'crypto_token',
    name: 'BTC Fragment',
    icon: '₿',
    rarity: 'legendary',
    description: 'A fragment of Bitcoin! (0.001 BTC)',
    tokenType: 'BTC',
    amount: 0.001,
    displayAmount: '0.001 BTC',
  },
  {
    id: 'eth_shard',
    category: 'crypto_token',
    name: 'ETH Shard',
    icon: 'Ξ',
    rarity: 'legendary',
    description: 'A shard of Ethereum! (0.01 ETH)',
    tokenType: 'ETH',
    amount: 0.01,
    displayAmount: '0.01 ETH',
  },
  {
    id: 'sol_piece',
    category: 'crypto_token',
    name: 'SOL Piece',
    icon: '◎',
    rarity: 'legendary',
    description: 'A piece of Solana! (0.1 SOL)',
    tokenType: 'SOL',
    amount: 0.1,
    displayAmount: '0.1 SOL',
  },
  // Even rarer drops (will never actually drop)
  {
    id: 'btc_nugget',
    category: 'crypto_token',
    name: 'BTC Nugget',
    icon: '₿',
    rarity: 'legendary',
    description: 'A Bitcoin nugget! (0.01 BTC)',
    tokenType: 'BTC',
    amount: 0.01,
    displayAmount: '0.01 BTC',
  },
  {
    id: 'eth_crystal',
    category: 'crypto_token',
    name: 'ETH Crystal',
    icon: 'Ξ',
    rarity: 'legendary',
    description: 'An Ethereum crystal! (0.1 ETH)',
    tokenType: 'ETH',
    amount: 0.1,
    displayAmount: '0.1 ETH',
  },
];

// =============================================================================
// COMBINED POOLS
// =============================================================================

export const LOOTBOX_DROP_POOLS: Record<DropCategory, LootboxDrop[]> = {
  coins: COIN_DROPS,
  consumable: CONSUMABLE_DROPS,
  character_skin: CHARACTER_SKIN_DROPS,
  crypto_token: CRYPTO_TOKEN_DROPS,
};

// =============================================================================
// POOL UTILITIES
// =============================================================================

/**
 * Get all possible drops for a given rarity lootbox
 */
export function getEligibleDrops(
  maxRarity: 'common' | 'rare' | 'epic' | 'legendary'
): LootboxDrop[] {
  const rarityOrder = { common: 0, rare: 1, epic: 2, legendary: 3 };
  const maxOrder = rarityOrder[maxRarity];

  const allDrops: LootboxDrop[] = [
    ...COIN_DROPS,
    ...CONSUMABLE_DROPS,
    ...CHARACTER_SKIN_DROPS,
    // Note: crypto_token excluded as they have 0% drop rate
  ];

  return allDrops.filter(drop => rarityOrder[drop.rarity] <= maxOrder);
}

/**
 * Get drop pool size for debugging
 */
export function getPoolStats(): Record<DropCategory, number> {
  return {
    coins: COIN_DROPS.length,
    consumable: CONSUMABLE_DROPS.length,
    character_skin: CHARACTER_SKIN_DROPS.length,
    crypto_token: CRYPTO_TOKEN_DROPS.length,
  };
}
