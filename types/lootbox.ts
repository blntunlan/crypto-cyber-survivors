/**
 * Lootbox Types - Crypto-themed lootbox system
 *
 * Lootboxes are earned through gameplay and can be opened
 * for various rewards including coins, items, and rare crypto drops.
 */

import { type CryptoPair } from './crypto';

// =============================================================================
// LOOTBOX RARITY
// =============================================================================

export type LootboxRarity = 'common' | 'rare' | 'epic' | 'legendary';

export const LOOTBOX_RARITY_ORDER: Record<LootboxRarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};

export const LOOTBOX_RARITY_COLORS: Record<LootboxRarity, string> = {
  common: '#9CA3AF', // Gray
  rare: '#3B82F6', // Blue
  epic: '#A855F7', // Purple
  legendary: '#F59E0B', // Gold/Orange
};

// =============================================================================
// LOOTBOX TYPES
// =============================================================================

export type LootboxType =
  | 'mining_crate' // Common - BTC mining themed
  | 'gas_box' // Rare - ETH gas fee themed
  | 'validator_vault' // Epic - Solana staking themed
  | 'whale_wallet' // Legendary - Whale investor themed
  | 'flash_crash_crate' // Special - Volatility event
  | 'whale_hunter_box'; // Special - Survive whale attack

export interface LootboxConfig {
  type: LootboxType;
  name: string;
  description: string;
  rarity: LootboxRarity;
  icon: string;
  color: string;
  glowColor: string;
}

export const LOOTBOX_CONFIGS: Record<LootboxType, LootboxConfig> = {
  mining_crate: {
    type: 'mining_crate',
    name: 'Mining Crate',
    description: 'A humble crate from the Bitcoin mines',
    rarity: 'common',
    icon: '⛏️',
    color: '#F7931A',
    glowColor: 'rgba(247, 147, 26, 0.5)',
  },
  gas_box: {
    type: 'gas_box',
    name: 'Gas Fee Box',
    description: 'Forged in the Ethereum gas wars',
    rarity: 'rare',
    icon: '⛽',
    color: '#627EEA',
    glowColor: 'rgba(98, 126, 234, 0.5)',
  },
  validator_vault: {
    type: 'validator_vault',
    name: 'Validator Vault',
    description: 'Secured by Solana validators',
    rarity: 'epic',
    icon: '🔐',
    color: '#9945FF',
    glowColor: 'rgba(153, 69, 255, 0.5)',
  },
  whale_wallet: {
    type: 'whale_wallet',
    name: 'Whale Wallet',
    description: 'The legendary wallet of crypto whales',
    rarity: 'legendary',
    icon: '🐋',
    color: '#FFD700',
    glowColor: 'rgba(255, 215, 0, 0.6)',
  },
  flash_crash_crate: {
    type: 'flash_crash_crate',
    name: 'Flash Crash Crate',
    description: 'Born from market chaos',
    rarity: 'rare',
    icon: '📉',
    color: '#EF4444',
    glowColor: 'rgba(239, 68, 68, 0.5)',
  },
  whale_hunter_box: {
    type: 'whale_hunter_box',
    name: 'Whale Hunter Box',
    description: 'Trophy from defeating a whale',
    rarity: 'epic',
    icon: '🎯',
    color: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.5)',
  },
};

// =============================================================================
// DROP ITEM TYPES
// =============================================================================

export type DropCategory = 'coins' | 'consumable' | 'character_skin' | 'crypto_token';

export interface BaseDrop {
  id: string;
  category: DropCategory;
  name: string;
  icon: string;
  rarity: LootboxRarity;
  description: string;
}

// Coin drops
export interface CoinDrop extends BaseDrop {
  category: 'coins';
  minAmount: number;
  maxAmount: number;
}

// Consumable item drops
export interface ConsumableDrop extends BaseDrop {
  category: 'consumable';
  effectType: ConsumableEffectType;
  effectValue: number;
  duration?: number; // ms, undefined = instant
}

export type ConsumableEffectType =
  | 'damage_boost' // 2x damage
  | 'speed_boost' // +50% speed
  | 'kill_all' // Kill all enemies on screen
  | 'full_heal' // Restore all HP
  | 'revive' // One-time death prevention
  | 'xp_boost' // +50% XP for duration
  | 'coin_boost'; // +100% coins for duration

// Character skin drops (LEGENDARY - highest value)
export interface CharacterSkinDrop extends BaseDrop {
  category: 'character_skin';
  skinId: CharacterSkinId;
  spriteSheet?: string; // Future: path to sprite
  previewImage?: string; // Future: preview image
}

export type CharacterSkinId =
  | 'default' // Cyber Trader (starting skin)
  | 'diamond_hands' // Diamond Hands Holder
  | 'whale_watcher' // Whale themed
  | 'satoshi_ghost' // Bitcoin founder ghost
  | 'vitalik_mode' // Ethereum themed
  | 'solana_sage' // Solana themed
  | 'degen_ape' // Ape themed degen
  | 'laser_eyes'; // Bitcoin laser eyes meme

// Crypto token drops (BLOCKCHAIN VALUE - 0% actual drop rate)
export interface CryptoTokenDrop extends BaseDrop {
  category: 'crypto_token';
  tokenType: CryptoPair;
  amount: number; // e.g., 0.001 BTC
  displayAmount: string; // e.g., "0.001 BTC"
  usdValueAtDrop?: number; // Snapshot of USD value when dropped
}

// Union type for all drops
export type LootboxDrop =
  | CoinDrop
  | ConsumableDrop
  | CharacterSkinDrop
  | CryptoTokenDrop;

// =============================================================================
// DROP RATE CONFIGURATION
// =============================================================================

export interface DropRateConfig {
  coins: number; // Weight for coins category
  consumable: number; // Weight for consumables
  character_skin: number; // Weight for skins
  crypto_token: number; // Weight for crypto (0 in production)
}

export const LOOTBOX_DROP_RATES: Record<LootboxRarity, DropRateConfig> = {
  common: {
    coins: 70,
    consumable: 25,
    character_skin: 5,
    crypto_token: 0, // "Chance exists" but actually 0
  },
  rare: {
    coins: 50,
    consumable: 35,
    character_skin: 15,
    crypto_token: 0,
  },
  epic: {
    coins: 35,
    consumable: 35,
    character_skin: 30,
    crypto_token: 0,
  },
  legendary: {
    coins: 20,
    consumable: 30,
    character_skin: 50,
    crypto_token: 0, // Marketing: "Ultra rare chance!"
  },
};

// =============================================================================
// PLAYER LOOTBOX
// =============================================================================

export interface PlayerLootbox {
  id: string;
  profileId: string;
  boxType: LootboxType;
  rarity: LootboxRarity;
  obtainedAt: Date;
  opened: boolean;
  openedAt?: Date;
  source: LootboxSource;
}

export type LootboxSource =
  | 'cycle_complete'
  | 'wave_milestone'
  | 'kill_streak'
  | 'market_event'
  | 'achievement'
  | 'daily_reward';

// =============================================================================
// LOOTBOX OPENING RESULT
// =============================================================================

export interface LootboxOpenResult {
  lootboxId: string;
  boxType: LootboxType;
  drop: LootboxDrop;
  openedAt: Date;
  animationData: {
    spinDuration: number;
    revealDelay: number;
    isJackpot: boolean; // Extra effects for legendary drops
  };
}

// =============================================================================
// EARN TRIGGER CONFIGS
// =============================================================================

export interface LootboxEarnConfig {
  cycleRewards: {
    1: LootboxType; // Cycle 1 → mining_crate
    2: LootboxType; // Cycle 2 → gas_box
    3: LootboxType; // Cycle 3 → validator_vault
    5: LootboxType; // Cycle 5+ → whale_wallet
  };
  waveMilestone: {
    interval: number; // Every N waves
    chance: number; // % chance
    boxType: LootboxType;
  };
  killStreak: {
    100: LootboxType;
    250: LootboxType;
    500: LootboxType;
  };
}

export const DEFAULT_EARN_CONFIG: LootboxEarnConfig = {
  cycleRewards: {
    1: 'mining_crate',
    2: 'gas_box',
    3: 'validator_vault',
    5: 'whale_wallet',
  },
  waveMilestone: {
    interval: 5,
    chance: 25,
    boxType: 'mining_crate',
  },
  killStreak: {
    100: 'mining_crate',
    250: 'gas_box',
    500: 'validator_vault',
  },
};
