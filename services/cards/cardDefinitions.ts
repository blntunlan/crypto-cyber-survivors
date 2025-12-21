/**
 * Card Definitions
 *
 * All card definitions organized by tier.
 * Each card has an effect function that modifies player stats.
 */

import { type Card, type CardTier } from './types';

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
    effect: p => ({ ...p, baseDamage: p.baseDamage + 8 }),
  },
  {
    id: 'spd_c1',
    name: 'Quick Trade',
    description: '+8% Attack Speed',
    icon: 'lucide:zap',
    tier: 'common',
    effect: p => ({ ...p, fireRate: Math.max(100, p.fireRate * 0.92) }),
  },
  {
    id: 'hp_c1',
    name: 'Safety Net',
    description: '+15 Max HP',
    icon: 'lucide:life-buoy',
    tier: 'common',
    effect: p => ({ ...p, maxHp: p.maxHp + 15, hp: p.hp + 15 }),
  },
  {
    id: 'magnet_c1',
    name: 'Yield Farm',
    description: '+30 Collection Range',
    icon: 'lucide:wheat',
    tier: 'common',
    effect: p => ({ ...p, magnet: Math.min(300, p.magnet + 30) }),
  },
  {
    id: 'armor_c1',
    name: 'Stop Loss',
    description: '+1 Armor',
    icon: 'lucide:octagon-x',
    tier: 'common',
    effect: p => ({ ...p, armor: Math.min(15, p.armor + 1) }),
  },
  {
    id: 'crit_c1',
    name: 'Sniper Bot',
    description: '+3% Crit Chance',
    icon: 'lucide:crosshair',
    tier: 'common',
    effect: p => ({ ...p, critChance: Math.min(0.95, p.critChance + 0.03) }),
  },
  {
    id: 'lifesteal_c1',
    name: 'DCA Mode',
    description: '+0.3 Luck (lifesteal chance)',
    icon: 'lucide:repeat',
    tier: 'common',
    effect: p => ({ ...p, luck: Math.min(15, p.luck + 0.3) }),
  },
  {
    id: 'balance_c1',
    name: 'Rebalance',
    description: '+5% all main stats',
    icon: 'lucide:scale',
    tier: 'common',
    effect: p => ({
      ...p,
      baseDamage: Math.floor(p.baseDamage * 1.05),
      speed: Math.min(12, p.speed * 1.05),
      maxHp: Math.floor(p.maxHp * 1.05),
      hp: Math.floor(p.hp * 1.05),
    }),
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
    effect: p => ({ ...p, baseDamage: p.baseDamage + 15 }),
  },
  {
    id: 'spd_r1',
    name: 'High Frequency',
    description: '+18% Attack Speed',
    icon: 'lucide:activity',
    tier: 'rare',
    effect: p => ({ ...p, fireRate: Math.max(80, p.fireRate * 0.82) }),
  },
  {
    id: 'crit_r1',
    name: 'Insider Info',
    description: '+5% Crit Chance',
    icon: 'lucide:eye',
    tier: 'rare',
    effect: p => ({ ...p, critChance: Math.min(0.95, p.critChance + 0.05) }),
  },
  {
    id: 'luck_r1',
    name: 'Alpha Leak',
    description: '+0.8 Luck',
    icon: 'lucide:key',
    tier: 'rare',
    effect: p => ({ ...p, luck: Math.min(15, p.luck + 0.8) }),
  },
  {
    id: 'area_r1',
    name: 'Market Cap',
    description: '+50% Projectile Size',
    icon: 'lucide:circle-dollar-sign',
    tier: 'rare',
    effect: p => ({ ...p, area: p.area + 0.5 }),
  },
  {
    id: 'proj_r1',
    name: 'Double Down',
    description: '+1 Projectile',
    icon: 'lucide:copy-plus',
    tier: 'rare',
    effect: p => ({ ...p, projectiles: p.projectiles + 1 }),
  },
  {
    id: 'speed_r1',
    name: 'Bull Run',
    description: '+15% Speed',
    icon: 'lucide:arrow-up-right',
    tier: 'rare',
    effect: p => ({ ...p, speed: Math.min(12, p.speed * 1.15) }),
  },
  {
    id: 'shield_r1',
    name: 'HODL Shield',
    description: '+2 Armor, +10 HP',
    icon: 'lucide:shield',
    tier: 'rare',
    effect: p => ({
      ...p,
      armor: Math.min(15, p.armor + 2),
      maxHp: p.maxHp + 10,
      hp: p.hp + 10,
    }),
  },
  {
    id: 'exec_r1',
    name: 'Short Squeeze',
    description: '+12 Damage, +3% Crit',
    icon: 'lucide:arrow-down-up',
    tier: 'rare',
    effect: p => ({
      ...p,
      baseDamage: p.baseDamage + 12,
      critChance: Math.min(0.95, p.critChance + 0.03),
    }),
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
    effect: p => ({
      ...p,
      baseDamage: p.baseDamage + 25,
      critChance: Math.min(0.95, p.critChance + 0.1),
    }),
  },
  {
    id: 'vamp_e1',
    name: 'Staking Rewards',
    description: '+1.5 Luck',
    icon: 'lucide:coins',
    tier: 'epic',
    effect: p => ({ ...p, luck: Math.min(15, p.luck + 1.5) }),
  },
  {
    id: 'speed_e1',
    name: 'Flash Loan',
    description: '+30% Speed, +15% Attack Speed',
    icon: 'lucide:bolt',
    tier: 'epic',
    effect: p => ({
      ...p,
      speed: Math.min(12, p.speed * 1.3),
      fireRate: Math.max(80, p.fireRate * 0.85),
    }),
  },
  {
    id: 'tank_e1',
    name: 'Cold Wallet',
    description: '+40 Max HP, +3 Armor',
    icon: 'lucide:wallet',
    tier: 'epic',
    effect: p => ({
      ...p,
      maxHp: p.maxHp + 40,
      hp: p.hp + 40,
      armor: Math.min(15, p.armor + 3),
    }),
  },
  {
    id: 'explode_e1',
    name: 'Liquidation',
    description: '+20 DMG, +60% Area',
    icon: 'lucide:flame',
    tier: 'epic',
    effect: p => ({ ...p, baseDamage: p.baseDamage + 20, area: p.area + 0.6 }),
  },
  {
    id: 'chain_e1',
    name: 'Lightning Network',
    description: '+15 DMG, +8% Crit',
    icon: 'lucide:zap',
    tier: 'epic',
    effect: p => ({
      ...p,
      baseDamage: p.baseDamage + 15,
      critChance: Math.min(0.95, p.critChance + 0.08),
    }),
  },
  {
    id: 'regen_e1',
    name: 'Smart Contract',
    description: '+30 Max HP, +1 Luck',
    icon: 'lucide:file-code',
    tier: 'epic',
    effect: p => ({
      ...p,
      maxHp: p.maxHp + 30,
      hp: p.hp + 30,
      luck: Math.min(15, p.luck + 1),
    }),
  },
  {
    id: 'random_e1',
    name: 'Degenerate',
    description: '+35 DMG (high risk high reward)',
    icon: '🎲',
    tier: 'epic',
    effect: p => ({ ...p, baseDamage: p.baseDamage + 35 }),
  },
  {
    id: 'banano_e1',
    name: 'Banano Split',
    description: '+20% Speed, +0.5 Luck',
    icon: 'icon-banano',
    tier: 'epic',
    effect: p => ({
      ...p,
      speed: Math.min(12, p.speed * 1.2),
      luck: Math.min(15, p.luck + 0.5),
    }),
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
    effect: p => ({
      ...p,
      baseDamage: p.baseDamage + 40,
      critChance: Math.min(0.95, p.critChance + 0.15),
    }),
  },
  {
    id: 'moon_l1',
    name: 'To The Moon',
    description: '+30 DMG, +2 Luck',
    icon: 'lucide:rocket',
    tier: 'legendary',
    effect: p => ({
      ...p,
      baseDamage: p.baseDamage + 30,
      luck: Math.min(15, p.luck + 2),
    }),
  },
  {
    id: 'whale_l1',
    name: 'Whale Alert',
    description: '+20 DMG, +0.5 Area',
    icon: 'icon-whale',
    tier: 'legendary',
    effect: p => ({ ...p, baseDamage: p.baseDamage + 20, area: p.area + 0.5 }),
  },
  {
    id: 'ape_l1',
    name: 'Full Ape Mode',
    description: '2x Fire Rate, -20% HP',
    icon: 'icon-ape',
    tier: 'legendary',
    effect: p => ({
      ...p,
      fireRate: Math.max(50, p.fireRate * 0.5),
      maxHp: Math.max(20, p.maxHp * 0.8),
      hp: Math.min(p.hp, Math.max(20, p.maxHp * 0.8)),
    }),
  },
  {
    id: 'satoshi_l1',
    name: 'Satoshi Mode',
    description: '+50 DMG, -25% Fire Rate',
    icon: 'icon-genesis-emblem',
    tier: 'legendary',
    effect: p => ({
      ...p,
      baseDamage: p.baseDamage + 50,
      fireRate: p.fireRate * 1.25,
    }),
  },
  {
    id: 'rug_l1',
    name: 'Rug Pull',
    description: '+2.5 Luck, -15% Max HP',
    icon: 'icon-skull',
    tier: 'legendary',
    effect: p => ({
      ...p,
      luck: Math.min(15, p.luck + 2.5),
      maxHp: Math.max(30, p.maxHp * 0.85),
      hp: Math.min(p.hp, Math.max(30, p.maxHp * 0.85)),
    }),
  },
  {
    id: 'nft_l1',
    name: 'NFT Collection',
    description: '+5 random stat boosts',
    icon: '🌈',
    tier: 'legendary',
    effect: p => ({
      ...p,
      baseDamage: p.baseDamage + 15,
      critChance: Math.min(0.95, p.critChance + 0.05),
      luck: Math.min(15, p.luck + 1),
      speed: Math.min(12, p.speed + 0.5),
      armor: Math.min(15, p.armor + 1),
    }),
  },
  {
    id: 'timelock_l1',
    name: 'Time Lock',
    description: '+35 DMG, +20 HP',
    icon: '⏰',
    tier: 'legendary',
    effect: p => ({
      ...p,
      baseDamage: p.baseDamage + 35,
      maxHp: p.maxHp + 20,
      hp: p.hp + 20,
    }),
  },
  {
    id: 'gas_l1',
    name: 'Gas Fee Burn',
    description: '+25 DMG, +0.4 Area',
    icon: '🔥',
    tier: 'legendary',
    effect: p => ({ ...p, baseDamage: p.baseDamage + 25, area: p.area + 0.4 }),
  },
];

// =============================================================================
// AGGREGATED COLLECTIONS
// =============================================================================

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
