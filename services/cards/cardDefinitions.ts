/**
 * Card Definitions
 *
 * All card definitions organized by tier.
 * Effects are now declarative 'modifiers' where possible.
 */

import { type Card } from './types';

// =============================================================================
// COMMON CARDS
// =============================================================================

export const COMMON_CARDS: Card[] = [
  {
    id: 'dmg_c1',
    name: 'Market Order',
    description: '+8 Base Damage',
    icon: 'lucide:trending-up',
    tier: 'common',
    modifiers: [{ stat: 'baseDamage', value: 8, type: 'add' }],
  },
  {
    id: 'spd_c1',
    name: 'Quick Trade',
    description: '+8% Attack Speed',
    icon: 'lucide:zap',
    tier: 'common',
    modifiers: [{ stat: 'fireRate', value: -0.08, type: 'percent' }],
  },
  {
    id: 'hp_c1',
    name: 'Safety Net',
    description: '+15 Max HP',
    icon: 'lucide:life-buoy',
    tier: 'common',
    modifiers: [
      { stat: 'maxHp', value: 15, type: 'add' },
      { stat: 'hp', value: 15, type: 'add' },
    ],
  },
  {
    id: 'magnet_c1',
    name: 'Yield Farm',
    description: '+30 Collection Range',
    icon: 'lucide:wheat',
    tier: 'common',
    modifiers: [{ stat: 'magnet', value: 30, type: 'add' }],
  },
  {
    id: 'armor_c1',
    name: 'Stop Loss',
    description: '+1 Armor',
    icon: 'lucide:octagon-x',
    tier: 'common',
    modifiers: [{ stat: 'armor', value: 1, type: 'add' }],
  },
  {
    id: 'crit_c1',
    name: 'Sniper Bot',
    description: '+3% Crit Chance',
    icon: 'lucide:crosshair',
    tier: 'common',
    modifiers: [{ stat: 'critChance', value: 0.03, type: 'add' }],
  },
  {
    id: 'lifesteal_c1',
    name: 'DCA Mode',
    description: '+5% Lifesteal Chance',
    icon: 'lucide:repeat',
    tier: 'common',
    modifiers: [{ stat: 'lifesteal', value: 0.05, type: 'add' }],
  },
  {
    id: 'balance_c1',
    name: 'Rebalance',
    description: '+5% all main stats',
    icon: 'lucide:scale',
    tier: 'common',
    modifiers: [
      { stat: 'baseDamage', value: 0.05, type: 'percent' },
      { stat: 'speed', value: 0.05, type: 'percent' },
      { stat: 'maxHp', value: 0.05, type: 'percent' },
      { stat: 'hp', value: 0.05, type: 'percent' },
      { stat: 'fireRate', value: -0.05, type: 'percent' },
      { stat: 'magnet', value: 0.05, type: 'percent' },
    ],
  },
];

// =============================================================================
// RARE CARDS
// =============================================================================

export const RARE_CARDS: Card[] = [
  {
    id: 'dmg_r1',
    name: 'Limit Order',
    description: '+15 Base Damage',
    icon: 'lucide:file-text',
    tier: 'rare',
    modifiers: [{ stat: 'baseDamage', value: 15, type: 'add' }],
  },
  {
    id: 'spd_r1',
    name: 'High Frequency',
    description: '+18% Attack Speed',
    icon: 'lucide:activity',
    tier: 'rare',
    modifiers: [{ stat: 'fireRate', value: -0.18, type: 'percent' }],
  },
  {
    id: 'crit_r1',
    name: 'Insider Info',
    description: '+5% Crit Chance',
    icon: 'lucide:eye',
    tier: 'rare',
    modifiers: [{ stat: 'critChance', value: 0.05, type: 'add' }],
  },
  {
    id: 'luck_r1',
    name: 'Alpha Leak',
    description: '+2 Luck (better gem drops)',
    icon: 'lucide:key',
    tier: 'rare',
    modifiers: [{ stat: 'luck', value: 2, type: 'add' }],
  },
  {
    id: 'area_r1',
    name: 'Market Cap',
    description: '+50% Projectile Size',
    icon: 'lucide:circle-dollar-sign',
    tier: 'rare',
    modifiers: [{ stat: 'area', value: 0.5, type: 'add' }],
  },
  {
    id: 'proj_r1',
    name: 'Double Down',
    description: '+1 Projectile',
    icon: 'lucide:copy-plus',
    tier: 'rare',
    modifiers: [{ stat: 'projectiles', value: 1, type: 'add' }],
  },
  {
    id: 'speed_r1',
    name: 'Bull Run',
    description: '+15% Speed',
    icon: 'lucide:arrow-up-right',
    tier: 'rare',
    modifiers: [{ stat: 'speed', value: 0.15, type: 'percent' }],
  },
  {
    id: 'shield_r1',
    name: 'HODL Shield',
    description: '+2 Armor, +10 HP',
    icon: 'lucide:shield',
    tier: 'rare',
    modifiers: [
      { stat: 'armor', value: 2, type: 'add' },
      { stat: 'maxHp', value: 10, type: 'add' },
      { stat: 'hp', value: 10, type: 'add' },
    ],
  },
  {
    id: 'exec_r1',
    name: 'Short Squeeze',
    description: '+12 Damage, +3% Crit',
    icon: 'lucide:arrow-down-up',
    tier: 'rare',
    modifiers: [
      { stat: 'baseDamage', value: 12, type: 'add' },
      { stat: 'critChance', value: 0.03, type: 'add' },
    ],
  },
];

// =============================================================================
// EPIC CARDS
// =============================================================================

export const EPIC_CARDS: Card[] = [
  {
    id: 'dmg_e1',
    name: 'Leverage Trade',
    description: '+25 Damage, +10% Crit',
    icon: 'lucide:scale-3d',
    tier: 'epic',
    modifiers: [
      { stat: 'baseDamage', value: 25, type: 'add' },
      { stat: 'critChance', value: 0.1, type: 'add' },
    ],
  },
  {
    id: 'vamp_e1',
    name: 'Staking Rewards',
    description: '+12% Lifesteal Chance',
    icon: 'lucide:coins',
    tier: 'epic',
    modifiers: [{ stat: 'lifesteal', value: 0.12, type: 'add' }],
  },
  {
    id: 'speed_e1',
    name: 'Flash Loan',
    description: '+30% Speed, +15% Attack Speed',
    icon: 'lucide:bolt',
    tier: 'epic',
    modifiers: [
      { stat: 'speed', value: 0.3, type: 'percent' },
      { stat: 'fireRate', value: -0.15, type: 'percent' },
    ],
  },
  {
    id: 'tank_e1',
    name: 'Cold Wallet',
    description: '+40 Max HP, +3 Armor',
    icon: 'lucide:wallet',
    tier: 'epic',
    modifiers: [
      { stat: 'maxHp', value: 40, type: 'add' },
      { stat: 'hp', value: 40, type: 'add' },
      { stat: 'armor', value: 3, type: 'add' },
    ],
  },
  {
    id: 'explode_e1',
    name: 'Liquidation',
    description: '+20 DMG, +60% Area',
    icon: 'lucide:flame',
    tier: 'epic',
    modifiers: [
      { stat: 'baseDamage', value: 20, type: 'add' },
      { stat: 'area', value: 0.6, type: 'add' },
    ],
  },
  {
    id: 'chain_e1',
    name: 'Lightning Network',
    description: '+15 DMG, +8% Crit',
    icon: 'lucide:zap',
    tier: 'epic',
    modifiers: [
      { stat: 'baseDamage', value: 15, type: 'add' },
      { stat: 'critChance', value: 0.08, type: 'add' },
    ],
  },
  {
    id: 'regen_e1',
    name: 'Smart Contract',
    description: '+30 Max HP, +8% Lifesteal',
    icon: 'lucide:file-code',
    tier: 'epic',
    modifiers: [
      { stat: 'maxHp', value: 30, type: 'add' },
      { stat: 'hp', value: 30, type: 'add' },
      { stat: 'lifesteal', value: 0.08, type: 'add' },
    ],
  },
  {
    id: 'random_e1',
    name: 'Degenerate',
    description: '+35 DMG (high risk high reward)',
    icon: '🎲',
    tier: 'epic',
    modifiers: [{ stat: 'baseDamage', value: 35, type: 'add' }],
  },
  {
    id: 'banano_e1',
    name: 'Banano Split',
    description: '+20% Speed, +1 Luck',
    icon: 'icon-banano',
    tier: 'epic',
    modifiers: [
      { stat: 'speed', value: 0.2, type: 'percent' },
      { stat: 'luck', value: 1, type: 'add' },
    ],
  },
];

// =============================================================================
// LEGENDARY CARDS
// =============================================================================

export const LEGENDARY_CARDS: Card[] = [
  {
    id: 'diamond_l1',
    name: 'Diamond Hands',
    description: '+40 DMG, +15% Crit',
    icon: 'lucide:gem',
    tier: 'legendary',
    modifiers: [
      { stat: 'baseDamage', value: 40, type: 'add' },
      { stat: 'critChance', value: 0.15, type: 'add' },
    ],
  },
  {
    id: 'moon_l1',
    name: 'To The Moon',
    description: '+30 DMG, +3 Luck',
    icon: 'lucide:rocket',
    tier: 'legendary',
    modifiers: [
      { stat: 'baseDamage', value: 30, type: 'add' },
      { stat: 'luck', value: 3, type: 'add' },
    ],
  },
  {
    id: 'whale_l1',
    name: 'Whale Alert',
    description: '+20 DMG, +0.5 Area',
    icon: 'icon-whale',
    tier: 'legendary',
    modifiers: [
      { stat: 'baseDamage', value: 20, type: 'add' },
      { stat: 'area', value: 0.5, type: 'add' },
    ],
  },
  {
    id: 'ape_l1',
    name: 'Full Ape Mode',
    description: '2x Fire Rate, -20% HP',
    icon: 'icon-ape',
    tier: 'legendary',
    modifiers: [
      { stat: 'fireRate', value: 0.5, type: 'multiply' },
      { stat: 'maxHp', value: -0.2, type: 'percent' },
      { stat: 'hp', value: -0.2, type: 'percent' },
    ],
  },
  {
    id: 'satoshi_l1',
    name: 'Satoshi Mode',
    description: '+50 DMG, -25% Fire Rate',
    icon: 'icon-genesis-emblem',
    tier: 'legendary',
    modifiers: [
      { stat: 'baseDamage', value: 50, type: 'add' },
      { stat: 'fireRate', value: 1.25, type: 'multiply' },
    ],
  },
  {
    id: 'rug_l1',
    name: 'Rug Pull',
    description: '+20% Lifesteal, -15% Max HP',
    icon: 'icon-skull',
    tier: 'legendary',
    modifiers: [
      { stat: 'lifesteal', value: 0.2, type: 'add' },
      { stat: 'maxHp', value: -0.15, type: 'percent' },
      { stat: 'hp', value: -0.15, type: 'percent' },
    ],
  },
  {
    id: 'nft_l1',
    name: 'NFT Collection',
    description: '+5 random stat boosts',
    icon: '🌈',
    tier: 'legendary',
    modifiers: [
      { stat: 'baseDamage', value: 15, type: 'add' },
      { stat: 'critChance', value: 0.05, type: 'add' },
      { stat: 'luck', value: 2, type: 'add' },
      { stat: 'speed', value: 0.5, type: 'add' },
      { stat: 'armor', value: 1, type: 'add' },
    ],
  },
  {
    id: 'timelock_l1',
    name: 'Time Lock',
    description: '+35 DMG, +20 HP',
    icon: '⏰',
    tier: 'legendary',
    modifiers: [
      { stat: 'baseDamage', value: 35, type: 'add' },
      { stat: 'maxHp', value: 20, type: 'add' },
      { stat: 'hp', value: 20, type: 'add' },
    ],
  },
  {
    id: 'gas_l1',
    name: 'Gas Fee Burn',
    description: '+25 DMG, +0.4 Area',
    icon: '🔥',
    tier: 'legendary',
    modifiers: [
      { stat: 'baseDamage', value: 25, type: 'add' },
      { stat: 'area', value: 0.4, type: 'add' },
    ],
  },
];

// =============================================================================
// AGGREGATED COLLECTIONS
// =============================================================================

export type CardTier = 'common' | 'rare' | 'epic' | 'legendary';

/**
 * All cards organized by tier
 */
export const ALL_CARDS: Record<CardTier, Card[]> = {
  common: COMMON_CARDS,
  rare: RARE_CARDS,
  epic: EPIC_CARDS,
  legendary: LEGENDARY_CARDS,
};

/**
 * All cards as a flat array (for slot machine effect)
 */
export const ALL_CARDS_FLAT: Card[] = [
  ...COMMON_CARDS,
  ...RARE_CARDS,
  ...EPIC_CARDS,
  ...LEGENDARY_CARDS,
];

/**
 * Total card count
 */
export const TOTAL_CARDS = ALL_CARDS_FLAT.length;
