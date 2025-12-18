/**
 * CardSystem - Tiered Card/Upgrade System
 *
 * 4-tier rarity system with luck-based drop rates.
 * Each tier has progressively more powerful effects.
 */

import { Player } from '../types';
import { COLORS } from '../constants';

export type CardTier = 'common' | 'rare' | 'epic' | 'legendary';

export interface Card {
    id: string;
    name: string;
    description: string;
    icon: string;
    tier: CardTier;
    effect: (player: Player) => Player;
}

export interface TierConfig {
    name: string;
    color: string;
    bgColor: string;
    borderColor: string;
    glowColor: string;
    baseChance: number;
    luckMultiplier: number;
}

const TIER_CONFIG: Record<CardTier, TierConfig> = {
    common: {
        name: 'Common',
        color: '#9ca3af', // Silver gray
        bgColor: COLORS.SLOT_BLACK,
        borderColor: '#4b5563',
        glowColor: 'transparent',
        baseChance: 60,
        luckMultiplier: 0,
    },
    rare: {
        name: 'Rare',
        color: COLORS.ELECTRIC_BLUE,
        bgColor: '#0a1929',
        borderColor: COLORS.ELECTRIC_BLUE,
        glowColor: COLORS.ELECTRIC_BLUE,
        baseChance: 25,
        luckMultiplier: 2,
    },
    epic: {
        name: 'Epic',
        color: COLORS.ROYAL_PURPLE,
        bgColor: '#1a0a29',
        borderColor: COLORS.ROYAL_PURPLE,
        glowColor: COLORS.ROYAL_PURPLE,
        baseChance: 12,
        luckMultiplier: 3,
    },
    legendary: {
        name: 'Legendary',
        color: COLORS.CASINO_GOLD,
        bgColor: '#291a0a',
        borderColor: COLORS.CASINO_GOLD,
        glowColor: COLORS.CASINO_GOLD,
        baseChance: 3,
        luckMultiplier: 5,
    },
};

// =============================================================================
// CARD DEFINITIONS
// =============================================================================

const COMMON_CARDS: Card[] = [
    {
        id: 'dmg_c1',
        name: 'Market Order',
        description: '+8 Base Damage',
        icon: '/assets/icons/cards/market-order.png',
        tier: 'common',
        effect: p => ({ ...p, baseDamage: p.baseDamage + 8 }),
    },
    {
        id: 'spd_c1',
        name: 'Quick Trade',
        description: '+8% Attack Speed',
        icon: '/assets/icons/cards/quick-trade.png',
        tier: 'common',
        effect: p => ({ ...p, fireRate: Math.max(100, p.fireRate * 0.92) }),
    },
    {
        id: 'hp_c1',
        name: 'Safety Net',
        description: '+15 Max HP',
        icon: '/assets/icons/cards/safety-net.png',
        tier: 'common',
        effect: p => ({ ...p, maxHp: p.maxHp + 15, hp: p.hp + 15 }),
    },
    {
        id: 'magnet_c1',
        name: 'Yield Farm',
        description: '+30 Collection Range',
        icon: '/assets/icons/cards/yield-farm.png',
        tier: 'common',
        effect: p => ({ ...p, magnet: p.magnet + 30 }),
    },
    {
        id: 'armor_c1',
        name: 'Stop Loss',
        description: '+1 Armor',
        icon: '/assets/icons/cards/stop-loss.png',
        tier: 'common',
        effect: p => ({ ...p, armor: p.armor + 1 }),
    },
    // NEW CARDS
    {
        id: 'crit_c1',
        name: 'Sniper Bot',
        description: '+3% Crit Chance',
        icon: '/assets/icons/cards/sniper-bot.png',
        tier: 'common',
        effect: p => ({ ...p, critChance: Math.min(0.95, p.critChance + 0.03) }),
    },
    {
        id: 'lifesteal_c1',
        name: 'DCA Mode',
        description: '+0.3 Luck (lifesteal chance)',
        icon: '/assets/icons/cards/dca-mode.png',
        tier: 'common',
        effect: p => ({ ...p, luck: p.luck + 0.3 }),
    },
    {
        id: 'balance_c1',
        name: 'Rebalance',
        description: '+5% all main stats',
        icon: '/assets/icons/cards/rebalance.png',
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

const RARE_CARDS: Card[] = [
    {
        id: 'dmg_r1',
        name: 'Limit Order',
        description: '+15 Base Damage',
        icon: '/assets/icons/cards/limit-order.png',
        tier: 'rare',
        effect: p => ({ ...p, baseDamage: p.baseDamage + 15 }),
    },
    {
        id: 'spd_r1',
        name: 'High Frequency',
        description: '+18% Attack Speed',
        icon: '/assets/icons/cards/high-frequency.png',
        tier: 'rare',
        effect: p => ({ ...p, fireRate: Math.max(80, p.fireRate * 0.82) }),
    },
    {
        id: 'crit_r1',
        name: 'Insider Info',
        description: '+5% Crit Chance',
        icon: '/assets/icons/cards/insider-info.png',
        tier: 'rare',
        effect: p => ({ ...p, critChance: Math.min(0.95, p.critChance + 0.05) }),
    },
    {
        id: 'luck_r1',
        name: 'Alpha Leak',
        description: '+0.8 Luck',
        icon: '/assets/icons/cards/alpha-leak.png',
        tier: 'rare',
        effect: p => ({ ...p, luck: Math.min(15, p.luck + 0.8) }),
    },
    {
        id: 'area_r1',
        name: 'Market Cap',
        description: '+50% Projectile Size',
        icon: '/assets/icons/cards/market-cap.png',
        tier: 'rare',
        effect: p => ({ ...p, area: p.area + 0.5 }),
    },
    // NEW CARDS
    {
        id: 'proj_r1',
        name: 'Double Down',
        description: '+1 Projectile',
        icon: '/assets/icons/cards/double-down.png',
        tier: 'rare',
        effect: p => ({ ...p, projectiles: p.projectiles + 1 }),
    },
    {
        id: 'speed_r1',
        name: 'Bull Run',
        description: '+15% Speed',
        icon: '/assets/icons/cards/bull-run.png',
        tier: 'rare',
        effect: p => ({ ...p, speed: Math.min(12, p.speed * 1.15) }),
    },
    {
        id: 'shield_r1',
        name: 'HODL Shield',
        description: '+2 Armor, +10 HP',
        icon: '/assets/icons/cards/hodl-shield.png',
        tier: 'rare',
        effect: p => ({ ...p, armor: Math.min(15, p.armor + 2), maxHp: p.maxHp + 10, hp: p.hp + 10 }),
    },
    {
        id: 'exec_r1',
        name: 'Short Squeeze',
        description: '+12 Damage, +3% Crit',
        icon: '/assets/icons/cards/short-squeeze.png',
        tier: 'rare',
        effect: p => ({
            ...p,
            baseDamage: p.baseDamage + 12,
            critChance: Math.min(0.95, p.critChance + 0.03),
        }),
    },
];

const EPIC_CARDS: Card[] = [
    {
        id: 'dmg_e1',
        name: 'Leverage Trade',
        description: '+25 Damage, +10% Crit',
        icon: '/assets/icons/cards/leverage-trade.png',
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
        icon: '/assets/icons/cards/staking-rewards.png',
        tier: 'epic',
        effect: p => ({ ...p, luck: Math.min(15, p.luck + 1.5) }),
    },
    {
        id: 'speed_e1',
        name: 'Flash Loan',
        description: '+30% Speed, +15% Attack Speed',
        icon: '💨',
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
        icon: '🏦',
        tier: 'epic',
        effect: p => ({ ...p, maxHp: p.maxHp + 40, hp: p.hp + 40, armor: Math.min(15, p.armor + 3) }),
    },
    // NEW CARDS
    {
        id: 'explode_e1',
        name: 'Liquidation',
        description: '+20 DMG, +60% Area',
        icon: '🌀',
        tier: 'epic',
        effect: p => ({ ...p, baseDamage: p.baseDamage + 20, area: p.area + 0.6 }),
    },
    {
        id: 'chain_e1',
        name: 'Lightning Network',
        description: '+15 DMG, +8% Crit',
        icon: '⚡',
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
        icon: '🛡️',
        tier: 'epic',
        effect: p => ({ ...p, maxHp: p.maxHp + 30, hp: p.hp + 30, luck: Math.min(15, p.luck + 1) }),
    },
    {
        id: 'random_e1',
        name: 'Degenerate',
        description: '+35 DMG (high risk high reward)',
        icon: '🎲',
        tier: 'epic',
        effect: p => ({ ...p, baseDamage: p.baseDamage + 35 }),
    },
];

const LEGENDARY_CARDS: Card[] = [
    {
        id: 'diamond_l1',
        name: 'Diamond Hands',
        description: '+40 DMG, +15% Crit',
        icon: '/assets/icons/cards/diamond-hands.png',
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
        icon: '🚀',
        tier: 'legendary',
        effect: p => ({ ...p, baseDamage: p.baseDamage + 30, luck: Math.min(15, p.luck + 2) }),
    },
    {
        id: 'whale_l1',
        name: 'Whale Alert',
        description: '+20 DMG, +0.5 Area',
        icon: '🐋',
        tier: 'legendary',
        effect: p => ({ ...p, baseDamage: p.baseDamage + 20, area: p.area + 0.5 }),
    },
    {
        id: 'ape_l1',
        name: 'Full Ape Mode',
        description: '2x Fire Rate, -20% HP',
        icon: '🦍',
        tier: 'legendary',
        effect: p => ({
            ...p,
            fireRate: Math.max(50, p.fireRate * 0.5),
            maxHp: Math.max(20, p.maxHp * 0.8),
            hp: Math.min(p.hp, Math.max(20, p.maxHp * 0.8)),
        }),
    },
    // NEW CARDS
    {
        id: 'satoshi_l1',
        name: 'Satoshi Mode',
        description: '+50 DMG, -25% Fire Rate',
        icon: '👑',
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
        icon: '💀',
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
        effect: p => ({ ...p, baseDamage: p.baseDamage + 35, maxHp: p.maxHp + 20, hp: p.hp + 20 }),
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

const ALL_CARDS: Record<CardTier, Card[]> = {
    common: COMMON_CARDS,
    rare: RARE_CARDS,
    epic: EPIC_CARDS,
    legendary: LEGENDARY_CARDS,
};

// =============================================================================
// CARD SYSTEM CLASS
// =============================================================================

class CardSystemClass {
    private static instance: CardSystemClass | null = null;

    private constructor() { }

    static getInstance(): CardSystemClass {
        if (!CardSystemClass.instance) {
            CardSystemClass.instance = new CardSystemClass();
        }
        return CardSystemClass.instance;
    }

    /**
     * Roll for a tier based on player luck and level
     */
    rollTier(playerLuck: number, playerLevel: number): CardTier {
        const roll = Math.random() * 100;

        // Calculate chances with luck bonus
        let legendaryChance =
            TIER_CONFIG.legendary.baseChance + playerLuck * TIER_CONFIG.legendary.luckMultiplier;
        let epicChance = TIER_CONFIG.epic.baseChance + playerLuck * TIER_CONFIG.epic.luckMultiplier;
        let rareChance = TIER_CONFIG.rare.baseChance + playerLuck * TIER_CONFIG.rare.luckMultiplier;

        // Level-based restrictions
        if (playerLevel < 12) legendaryChance = 0;
        if (playerLevel < 7) epicChance = 0;
        if (playerLevel < 3) rareChance = 0;

        if (roll < legendaryChance) return 'legendary';
        if (roll < legendaryChance + epicChance) return 'epic';
        if (roll < legendaryChance + epicChance + rareChance) return 'rare';
        return 'common';
    }

    /**
     * Get a random card from a specific tier
     */
    getRandomCardFromTier(tier: CardTier): Card {
        const tierCards = ALL_CARDS[tier];
        const card = tierCards[Math.floor(Math.random() * tierCards.length)];
        return card ?? tierCards[0]!;
    }

    /**
     * Generate 3 card choices for level up
     */
    generateChoices(playerLuck: number, playerLevel: number): Card[] {
        const choices: Card[] = [];
        const usedIds = new Set<string>();

        while (choices.length < 3) {
            const tier = this.rollTier(playerLuck, playerLevel);
            const card = this.getRandomCardFromTier(tier);

            if (!usedIds.has(card.id)) {
                choices.push(card);
                usedIds.add(card.id);
            }
        }

        // Sort by tier (legendary first)
        const tierOrder: CardTier[] = ['legendary', 'epic', 'rare', 'common'];
        choices.sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));

        return choices;
    }

    /**
     * Get tier configuration for UI styling
     */
    getTierConfig(tier: CardTier): TierConfig {
        return TIER_CONFIG[tier];
    }

    /**
     * Get all tiers for display
     */
    getAllTiers(): CardTier[] {
        return ['common', 'rare', 'epic', 'legendary'];
    }
}

// Export singleton and types
export const CardSystem = CardSystemClass.getInstance();
export { TIER_CONFIG };
