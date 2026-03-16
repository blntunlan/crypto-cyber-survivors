/**
 * EnemyConfig - Enemy Types and Stats
 *
 * Configuration for all enemy types and their properties.
 */

export type EnemyType =
  | 'bear'
  | 'bull'
  | 'fud'
  | 'whale'
  | 'liquidator'
  | 'pumpdump'
  | 'rugpull'
  | 'mev_bot'
  | 'flash_loan'
  | 'sandwich'
  | '51_attack';

export interface EnemyTypeConfig {
  type: EnemyType;
  radius: number;
  baseHealth: number;
  baseSpeed: number;
  baseDamage: number;
  expValue: number;
  gemValue: number;
  spawnWeight: number; // higher = more common
  color: string;
  special?:
    | 'explosive'
    | 'growing'
    | 'splitting'
    | 'teleport'
    | 'predictive'
    | 'burst'
    | 'pincer'
    | 'absorb'; // special behavior
}

export const ENEMY_TYPES: Record<EnemyType, EnemyTypeConfig> = {
  bear: {
    type: 'bear',
    radius: 14,
    baseHealth: 50,
    baseSpeed: 1.6,
    baseDamage: 10,
    expValue: 10,
    gemValue: 15,
    spawnWeight: 60,
    color: '#ef4444', // red
  },
  bull: {
    type: 'bull',
    radius: 16,
    baseHealth: 70,
    baseSpeed: 1.8,
    baseDamage: 12,
    expValue: 15,
    gemValue: 20,
    spawnWeight: 25,
    color: '#22c55e', // green
  },
  fud: {
    type: 'fud',
    radius: 10,
    baseHealth: 30,
    baseSpeed: 2.2,
    baseDamage: 5,
    expValue: 8,
    gemValue: 10,
    spawnWeight: 10,
    color: '#94a3b8', // slate
  },
  whale: {
    type: 'whale',
    radius: 35,
    baseHealth: 300,
    baseSpeed: 0.8,
    baseDamage: 25,
    expValue: 100,
    gemValue: 100,
    spawnWeight: 5,
    color: '#B026FF', // neon purple
  },
  liquidator: {
    type: 'liquidator',
    radius: 12,
    baseHealth: 40,
    baseSpeed: 2.0,
    baseDamage: 30, // explodes for high damage
    expValue: 20,
    gemValue: 25,
    spawnWeight: 8,
    color: '#FF6600', // neon orange
    special: 'explosive',
  },
  pumpdump: {
    type: 'pumpdump',
    radius: 18,
    baseHealth: 80,
    baseSpeed: 1.2,
    baseDamage: 15,
    expValue: 25,
    gemValue: 30,
    spawnWeight: 6,
    color: '#39FF14', // neon green
    special: 'growing',
  },
  rugpull: {
    type: 'rugpull',
    radius: 11,
    baseHealth: 35,
    baseSpeed: 2.5,
    baseDamage: 20,
    expValue: 18,
    gemValue: 22,
    spawnWeight: 7,
    color: '#DC143C', // crimson
    special: 'teleport',
  },
  mev_bot: {
    type: 'mev_bot',
    radius: 9,
    baseHealth: 25,
    baseSpeed: 3.0,
    baseDamage: 8,
    expValue: 12,
    gemValue: 15,
    spawnWeight: 8,
    color: '#00FFFF', // cyan
    special: 'predictive',
  },
  flash_loan: {
    type: 'flash_loan',
    radius: 15,
    baseHealth: 60,
    baseSpeed: 1.0,
    baseDamage: 35,
    expValue: 30,
    gemValue: 35,
    spawnWeight: 5,
    color: '#FFEA00', // electric yellow
    special: 'burst',
  },
  sandwich: {
    type: 'sandwich',
    radius: 12,
    baseHealth: 45,
    baseSpeed: 1.8,
    baseDamage: 12,
    expValue: 14,
    gemValue: 18,
    spawnWeight: 6,
    color: '#FF1493', // hot pink
    special: 'pincer',
  },
  '51_attack': {
    type: '51_attack',
    radius: 40,
    baseHealth: 400,
    baseSpeed: 0.6,
    baseDamage: 30,
    expValue: 120,
    gemValue: 120,
    spawnWeight: 2,
    color: '#8B0000', // dark red
    special: 'absorb',
  },
};

// Spawn configuration
export const ENEMY_SPAWN = {
  // Timing & Intervals
  BASE_INTERVAL: 800, // ms between spawns at difficulty 1
  MIN_INTERVAL: 300, // minimum ms between spawns
  SPAWN_DISTANCE: 100, // pixels outside screen
  MIN_SAFE_OFFSET: 80, // minimum distance from screen edge

  // Limits
  MAX_ENEMIES: 150, // performance cap

  // Probabilities & Logic
  THEMATIC_CHANCE: 0.7, // Chance to spawn enemy matching market context
  WHALE_PROBABILITY_MODIFIER: 0.1,
  RANDOM_FUD_THRESHOLD: 0.4,
  RANDOM_LIQUIDATOR_THRESHOLD: 0.7,
  WAVE_INTENSITY_OFFSET: 0.5,

  // Scaling
  DIFFICULTY_SCALE: 0.5,
};

// Scaling multipliers for difficulty
export const ENEMY_SCALING = {
  HEALTH_PER_LEVEL: 0.2, // +20% HP per level
  SPEED_PER_LEVEL: 0.1, // +10% speed per level
  SPAWN_RATE_PER_LEVEL: 0.15, // 15% faster spawns per level
};

// Legacy export
export const ENEMY_BASE_SPEED = 1.5;
