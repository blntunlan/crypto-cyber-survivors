/**
 * Inventory Types - Player inventory and item management
 *
 * Manages player-owned items including consumables,
 * character skins, and collected crypto tokens.
 */

import { type CryptoPair } from './crypto';
import {
  type CharacterSkinId,
  type ConsumableEffectType,
  type LootboxRarity,
} from './lootbox';

// =============================================================================
// INVENTORY ITEM BASE
// =============================================================================

export interface BaseInventoryItem {
  id: string;
  playerId: string;
  itemType: InventoryItemType;
  itemId: string;
  quantity: number;
  obtainedAt: Date;
  metadata?: Record<string, unknown>;
}

export type InventoryItemType = 'consumable' | 'character_skin' | 'crypto_token';

// =============================================================================
// CONSUMABLE ITEMS
// =============================================================================

export interface ConsumableItem extends BaseInventoryItem {
  itemType: 'consumable';
  effectType: ConsumableEffectType;
  effectValue: number;
  duration?: number;
}

export interface ConsumableDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  effectType: ConsumableEffectType;
  effectValue: number;
  duration?: number; // ms, undefined = instant
  rarity: LootboxRarity;
  maxStack: number;
}

export const CONSUMABLE_DEFINITIONS: Record<string, ConsumableDefinition> = {
  flash_loan: {
    id: 'flash_loan',
    name: 'Flash Loan',
    icon: '⚡',
    description: 'Instantly double your damage for 10 seconds',
    effectType: 'damage_boost',
    effectValue: 2.0,
    duration: 10000,
    rarity: 'common',
    maxStack: 10,
  },
  gas_boost: {
    id: 'gas_boost',
    name: 'Gas Boost',
    icon: '⛽',
    description: '+50% movement speed for 15 seconds',
    effectType: 'speed_boost',
    effectValue: 1.5,
    duration: 15000,
    rarity: 'rare',
    maxStack: 10,
  },
  smart_contract: {
    id: 'smart_contract',
    name: 'Smart Contract',
    icon: '📜',
    description: 'Execute all enemies on screen instantly',
    effectType: 'kill_all',
    effectValue: 1,
    duration: undefined, // Instant
    rarity: 'epic',
    maxStack: 3,
  },
  staking_reward: {
    id: 'staking_reward',
    name: 'Staking Reward',
    icon: '🥩',
    description: 'Restore all HP instantly',
    effectType: 'full_heal',
    effectValue: 1,
    duration: undefined,
    rarity: 'rare',
    maxStack: 5,
  },
  rug_pull_protection: {
    id: 'rug_pull_protection',
    name: 'Rug Pull Protection',
    icon: '🛡️',
    description: 'Survive one fatal hit (auto-activates)',
    effectType: 'revive',
    effectValue: 1,
    duration: undefined,
    rarity: 'legendary',
    maxStack: 1,
  },
  diamond_hands_boost: {
    id: 'diamond_hands_boost',
    name: 'Diamond Hands Boost',
    icon: '💎',
    description: '+50% XP gain for 30 seconds',
    effectType: 'xp_boost',
    effectValue: 1.5,
    duration: 30000,
    rarity: 'rare',
    maxStack: 5,
  },
  moon_bag: {
    id: 'moon_bag',
    name: 'Moon Bag',
    icon: '🌙',
    description: '+100% coin drops for 20 seconds',
    effectType: 'coin_boost',
    effectValue: 2.0,
    duration: 20000,
    rarity: 'epic',
    maxStack: 3,
  },
};

// =============================================================================
// CHARACTER SKINS
// =============================================================================

export interface CharacterSkinItem extends BaseInventoryItem {
  itemType: 'character_skin';
  skinId: CharacterSkinId;
  equipped: boolean;
}

export interface CharacterSkinDefinition {
  id: CharacterSkinId;
  name: string;
  icon: string;
  description: string;
  rarity: LootboxRarity;
  color: string; // Primary color for the skin
  glowColor: string;
  unlockMethod: 'default' | 'lootbox' | 'achievement' | 'special';
}

export const CHARACTER_SKIN_DEFINITIONS: Record<
  CharacterSkinId,
  CharacterSkinDefinition
> = {
  default: {
    id: 'default',
    name: 'Cyber Trader',
    icon: '🤖',
    description: 'The default cyberpunk trader',
    rarity: 'common',
    color: '#00D4FF',
    glowColor: 'rgba(0, 212, 255, 0.5)',
    unlockMethod: 'default',
  },
  diamond_hands: {
    id: 'diamond_hands',
    name: 'Diamond Hands Holder',
    icon: '💎',
    description: 'Never sold, never will',
    rarity: 'rare',
    color: '#00BFFF',
    glowColor: 'rgba(0, 191, 255, 0.5)',
    unlockMethod: 'lootbox',
  },
  whale_watcher: {
    id: 'whale_watcher',
    name: 'Whale Watcher',
    icon: '🐋',
    description: 'Following the big money',
    rarity: 'rare',
    color: '#1E90FF',
    glowColor: 'rgba(30, 144, 255, 0.5)',
    unlockMethod: 'lootbox',
  },
  satoshi_ghost: {
    id: 'satoshi_ghost',
    name: "Satoshi's Ghost",
    icon: '👻',
    description: 'The mysterious Bitcoin creator',
    rarity: 'legendary',
    color: '#F7931A',
    glowColor: 'rgba(247, 147, 26, 0.6)',
    unlockMethod: 'lootbox',
  },
  vitalik_mode: {
    id: 'vitalik_mode',
    name: 'Vitalik Mode',
    icon: 'Ξ',
    description: 'Channel the Ethereum founder',
    rarity: 'legendary',
    color: '#627EEA',
    glowColor: 'rgba(98, 126, 234, 0.6)',
    unlockMethod: 'lootbox',
  },
  solana_sage: {
    id: 'solana_sage',
    name: 'Solana Sage',
    icon: '◎',
    description: 'Speed is everything',
    rarity: 'legendary',
    color: '#9945FF',
    glowColor: 'rgba(153, 69, 255, 0.6)',
    unlockMethod: 'lootbox',
  },
  degen_ape: {
    id: 'degen_ape',
    name: 'Degen Ape',
    icon: '🦍',
    description: 'Apes together strong',
    rarity: 'epic',
    color: '#8B4513',
    glowColor: 'rgba(139, 69, 19, 0.5)',
    unlockMethod: 'lootbox',
  },
  laser_eyes: {
    id: 'laser_eyes',
    name: 'Laser Eyes',
    icon: '👁️',
    description: 'Bitcoin to $1M or bust',
    rarity: 'epic',
    color: '#FF4500',
    glowColor: 'rgba(255, 69, 0, 0.5)',
    unlockMethod: 'lootbox',
  },
};

// =============================================================================
// CRYPTO TOKEN COLLECTIBLES
// =============================================================================

export interface CryptoTokenItem extends BaseInventoryItem {
  itemType: 'crypto_token';
  tokenType: CryptoPair;
  amount: number;
  usdValueAtDrop?: number;
}

export interface CryptoTokenDefinition {
  tokenType: CryptoPair;
  name: string;
  icon: string;
  color: string;
  displayDecimals: number;
}

export const CRYPTO_TOKEN_DEFINITIONS: Record<CryptoPair, CryptoTokenDefinition> = {
  BTC: {
    tokenType: 'BTC',
    name: 'Bitcoin',
    icon: '₿',
    color: '#F7931A',
    displayDecimals: 8,
  },
  ETH: {
    tokenType: 'ETH',
    name: 'Ethereum',
    icon: 'Ξ',
    color: '#627EEA',
    displayDecimals: 6,
  },
  SOL: {
    tokenType: 'SOL',
    name: 'Solana',
    icon: '◎',
    color: '#9945FF',
    displayDecimals: 4,
  },
};

// =============================================================================
// PLAYER INVENTORY STATE
// =============================================================================

export interface PlayerInventory {
  playerId: string;
  consumables: ConsumableItem[];
  skins: CharacterSkinItem[];
  cryptoTokens: CryptoTokenItem[];
  equippedSkin: CharacterSkinId;
  lastUpdated: Date;
}

export const createEmptyInventory = (playerId: string): PlayerInventory => ({
  playerId,
  consumables: [],
  skins: [],
  cryptoTokens: [],
  equippedSkin: 'default',
  lastUpdated: new Date(),
});

// =============================================================================
// INVENTORY EVENTS
// =============================================================================

export interface InventoryItemAddedEvent {
  playerId: string;
  itemType: InventoryItemType;
  itemId: string;
  quantity: number;
  source: 'lootbox' | 'achievement' | 'purchase' | 'reward';
}

export interface InventoryItemUsedEvent {
  playerId: string;
  itemType: InventoryItemType;
  itemId: string;
  effect?: string;
}

export interface SkinEquippedEvent {
  playerId: string;
  skinId: CharacterSkinId;
  previousSkinId: CharacterSkinId;
}
