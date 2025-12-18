/**
 * EnemyConfig - Enemy Types and Stats
 *
 * Configuration for all enemy types and their properties.
 */

export type EnemyType = 'bear' | 'bull' | 'fud' | 'whale' | 'liquidator' | 'pumpdump';

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
  special?: 'explosive' | 'growing' | 'splitting'; // special behavior
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
};

// Spawn configuration
export const ENEMY_SPAWN = {
  BASE_RATE: 2000, // ms between spawns at difficulty 1
  MIN_RATE: 300, // minimum ms between spawns
  SPAWN_DISTANCE: 100, // pixels outside screen
  MAX_ENEMIES: 100, // performance cap
};

// Difficulty scaling
export const ENEMY_SCALING = {
  HEALTH_PER_DIFFICULTY: 0.2, // +20% HP per difficulty
  SPEED_PER_DIFFICULTY: 0.1, // +10% speed per difficulty
  SPAWN_RATE_PER_DIFFICULTY: 0.15, // 15% faster spawns per difficulty
};

// Legacy export
export const ENEMY_BASE_SPEED = 1.5;
