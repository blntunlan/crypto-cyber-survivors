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
};

export type EnemyId = keyof typeof ENEMY_DEFINITIONS;
