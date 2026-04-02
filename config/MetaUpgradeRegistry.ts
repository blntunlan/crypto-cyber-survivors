/**
 * Meta Upgrade Registry — All permanent upgrade definitions
 */

import { type MetaUpgradeId, type MetaUpgradeDef } from '../types/metaProgression';

export const META_UPGRADE_REGISTRY: Record<MetaUpgradeId, MetaUpgradeDef> = {
  // Combat
  DAMAGE_BOOST: {
    id: 'DAMAGE_BOOST',
    name: 'Damage Boost',
    description: '+8% base damage per level',
    icon: '⚔️',
    category: 'combat',
    maxLevel: 5,
    costPerLevel: [50, 120, 250, 500, 1000],
  },
  CRIT_MASTERY: {
    id: 'CRIT_MASTERY',
    name: 'Crit Mastery',
    description: '+5% crit chance per level',
    icon: '🎯',
    category: 'combat',
    maxLevel: 3,
    costPerLevel: [80, 200, 450],
  },
  EXTRA_PROJECTILE: {
    id: 'EXTRA_PROJECTILE',
    name: 'Extra Projectile',
    description: '+1 projectile per level',
    icon: '🔹',
    category: 'combat',
    maxLevel: 2,
    costPerLevel: [300, 800],
  },

  // Survival
  HP_RESERVOIR: {
    id: 'HP_RESERVOIR',
    name: 'HP Reservoir',
    description: '+15 max HP per level',
    icon: '❤️',
    category: 'survival',
    maxLevel: 5,
    costPerLevel: [40, 100, 200, 400, 800],
  },
  ARMOR_PLATING: {
    id: 'ARMOR_PLATING',
    name: 'Armor Plating',
    description: '+1 armor per level',
    icon: '🛡️',
    category: 'survival',
    maxLevel: 3,
    costPerLevel: [100, 250, 600],
  },
  DASH_COOLDOWN: {
    id: 'DASH_COOLDOWN',
    name: 'Dash Cooldown',
    description: '-20% dash cooldown per level',
    icon: '💨',
    category: 'survival',
    maxLevel: 2,
    costPerLevel: [150, 400],
  },

  // Economy
  COIN_MAGNET: {
    id: 'COIN_MAGNET',
    name: 'Coin Magnet',
    description: '+25 magnet range per level',
    icon: '🧲',
    category: 'economy',
    maxLevel: 5,
    costPerLevel: [30, 70, 150, 300, 600],
  },
  LUCK_GENE: {
    id: 'LUCK_GENE',
    name: 'Luck Gene',
    description: '+3 luck per level',
    icon: '🍀',
    category: 'economy',
    maxLevel: 4,
    costPerLevel: [60, 150, 350, 700],
  },
  XP_ACCELERATOR: {
    id: 'XP_ACCELERATOR',
    name: 'XP Accelerator',
    description: '+10% XP per level',
    icon: '📈',
    category: 'economy',
    maxLevel: 3,
    costPerLevel: [80, 180, 400],
  },

  // Special (single level)
  STARTING_LEVEL_2: {
    id: 'STARTING_LEVEL_2',
    name: 'Head Start',
    description: 'Start runs at level 2',
    icon: '🚀',
    category: 'special',
    maxLevel: 1,
    costPerLevel: [2000],
  },
  QUAD_CARD_CHOICE: {
    id: 'QUAD_CARD_CHOICE',
    name: 'Quad Choice',
    description: '4 cards on level up (instead of 3)',
    icon: '🃏',
    category: 'special',
    maxLevel: 1,
    costPerLevel: [3000],
  },
  GRACE_EXTENSION: {
    id: 'GRACE_EXTENSION',
    name: 'Grace Extension',
    description: 'Starting grace period 5s → 8s',
    icon: '⏳',
    category: 'special',
    maxLevel: 1,
    costPerLevel: [1500],
  },
};

export const META_UPGRADE_LIST = Object.values(META_UPGRADE_REGISTRY);
