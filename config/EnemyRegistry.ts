import { COLORS } from './Colors';

/**
 * EnemyDefinition - Configuration for each enemy type
 */
export interface EnemyDefinition {
  id: string; // Internal variable name
  type: string; // The type string used in types.ts
  radius: number;
  baseHealth: number;
  baseSpeed: number;
  baseDamage: number;
  color: string;
  spawnWeight: number; // Higher = more likely to spawn
  combatRole?: 'contact' | 'ranged' | 'hybrid';
  canShoot?: boolean;
  shootCooldownMs?: number;
  shootRange?: number;
  projectileSpeed?: number;
  projectileDamageMultiplier?: number;
  isOppositeColor?: boolean; // If true, color depends on MarketPosition
  description?: string;
}

/**
 * ENEMY_DEFINITIONS - Central registry for all enemy types
 */
export const ENEMY_DEFINITIONS: Record<string, EnemyDefinition> = {
  bear: {
    id: 'bear',
    type: 'bear',
    radius: 14,
    baseHealth: 50,
    baseSpeed: 1.2,
    baseDamage: 5,
    color: COLORS.SHORT,
    spawnWeight: 60,
    isOppositeColor: true,
    description: 'Opposite of LONG position. Represented by SHORT color.',
  },
  bull: {
    id: 'bull',
    type: 'bull',
    radius: 16,
    baseHealth: 70,
    baseSpeed: 1.4,
    baseDamage: 8,
    color: COLORS.LONG,
    spawnWeight: 25,
    isOppositeColor: true,
    description: 'Opposite of SHORT position. Represented by LONG color.',
  },
  fud: {
    id: 'fud',
    type: 'fud',
    radius: 10,
    baseHealth: 30,
    baseSpeed: 1.6,
    baseDamage: 3,
    color: COLORS.SLOT_SILVER,
    spawnWeight: 10,
    isOppositeColor: false,
    description: 'Fast but fragile uncertainty units.',
  },
  whale: {
    id: 'whale',
    type: 'whale',
    radius: 35,
    baseHealth: 300,
    baseSpeed: 0.8,
    baseDamage: 25,
    color: COLORS.WHALE,
    spawnWeight: 5,
    isOppositeColor: false,
    description: 'High volume entities. Rare and tough.',
  },
  liquidator: {
    id: 'liquidator',
    type: 'liquidator',
    radius: 12,
    baseHealth: 40,
    baseSpeed: 1.5,
    baseDamage: 10,
    color: COLORS.DUMP_ORANGE,
    spawnWeight: 8,
    isOppositeColor: false,
    description: 'Swift agents of forced closure.',
  },
  pumpdump: {
    id: 'pumpdump',
    type: 'pumpdump',
    radius: 18,
    baseHealth: 80,
    baseSpeed: 1.2,
    baseDamage: 12,
    color: COLORS.PUMP_GREEN,
    spawnWeight: 6,
    isOppositeColor: false,
    description: 'Volatile entities that impact equity rapidly.',
  },
  rsi: {
    id: 'rsi',
    type: 'rsi',
    radius: 13,
    baseHealth: 60,
    baseSpeed: 1.8,
    baseDamage: 6,
    color: COLORS.ELECTRIC_BLUE,
    spawnWeight: 10,
    combatRole: 'ranged',
    isOppositeColor: true,
    description: 'Momentum-based entities that spawn during RSI extremes.',
  },
  market_maker: {
    id: 'market_maker',
    type: 'market_maker',
    radius: 50,
    baseHealth: 2500,
    baseSpeed: 0.7,
    baseDamage: 40,
    color: '#FF00FF', // Neon Magenta
    spawnWeight: 0, // Manual spawn only
    isOppositeColor: false,
    description: 'The ultimate entropy provider. Appears only at the peak of cycles.',
  },
  gatekeeper: {
    id: 'gatekeeper',
    type: 'gatekeeper',
    radius: 20,
    baseHealth: 150,
    baseSpeed: 1.0,
    baseDamage: 15,
    color: '#FFD700', // Gold / CEX Sentinel color
    spawnWeight: 0, // AI Trigger only
    isOppositeColor: false,
    description:
      'Portal Sentinels that protect the extraction point. High knockback force.',
  },
  rugpull: {
    id: 'rugpull',
    type: 'rugpull',
    radius: 11,
    baseHealth: 35,
    baseSpeed: 2.0,
    baseDamage: 15,
    color: COLORS.RUGPULL_CRIMSON,
    spawnWeight: 7,
    isOppositeColor: false,
    description:
      'Deceptive entities that teleport unpredictably. Represent exit scams.',
  },
  mev_bot: {
    id: 'mev_bot',
    type: 'mev_bot',
    radius: 9,
    baseHealth: 25,
    baseSpeed: 2.5,
    baseDamage: 6,
    color: COLORS.MEV_CYAN,
    spawnWeight: 8,
    combatRole: 'ranged',
    isOppositeColor: false,
    description:
      'Algorithmic predators that anticipate player movement. Front-runners.',
  },
  flash_loan: {
    id: 'flash_loan',
    type: 'flash_loan',
    radius: 15,
    baseHealth: 60,
    baseSpeed: 0.8,
    baseDamage: 25,
    color: COLORS.FLASH_LOAN_YELLOW,
    spawnWeight: 5,
    isOppositeColor: false,
    description:
      'Charge-and-burst entities. Pause to build energy, then strike explosively.',
  },
  sandwich: {
    id: 'sandwich',
    type: 'sandwich',
    radius: 12,
    baseHealth: 45,
    baseSpeed: 1.6,
    baseDamage: 10,
    color: COLORS.SANDWICH_PINK,
    spawnWeight: 6,
    combatRole: 'hybrid',
    isOppositeColor: false,
    description:
      'Pincer attack units that spawn in pairs and converge from opposite sides.',
  },
  '51_attack': {
    id: '51_attack',
    type: '51_attack',
    radius: 40,
    baseHealth: 400,
    baseSpeed: 0.5,
    baseDamage: 20,
    color: COLORS.ATTACK_51_RED,
    spawnWeight: 0, // Rare spawn only
    isOppositeColor: false,
    description:
      'Network dominance boss. Absorbs nearby enemies to grow stronger over time.',
  },
};

export type EnemyId = keyof typeof ENEMY_DEFINITIONS;
