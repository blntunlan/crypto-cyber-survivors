/**
 * EnemyFactory - Factory Pattern Implementation
 *
 * Centralizes enemy creation logic with different enemy types.
 * Makes it easy to add new enemy types without modifying client code.
 */

import { type Enemy, MarketPosition } from '../types';
import { COLORS } from '../constants';
import { type MovementStrategy, createMovementStrategy } from '../strategies/EnemyBehaviors';

/**
 * Enemy configuration blueprint
 */
export interface EnemyConfig {
  type: 'bear' | 'bull' | 'fud' | 'whale' | 'liquidator' | 'pumpdump';
  radius: number;
  baseHealth: number;
  baseSpeed: number;
  color: string;
  spawnWeight: number; // Higher = more likely to spawn
}

/**
 * Enemy type configurations
 */
const ENEMY_CONFIGS: Record<string, EnemyConfig> = {
  bear: {
    type: 'bear',
    radius: 14,
    baseHealth: 50,
    baseSpeed: 1.2, // Reduced from 1.6
    color: COLORS.SHORT,
    spawnWeight: 60,
  },
  bull: {
    type: 'bull',
    radius: 16,
    baseHealth: 70,
    baseSpeed: 1.4, // Reduced from 1.8
    color: COLORS.LONG,
    spawnWeight: 25,
  },
  fud: {
    type: 'fud',
    radius: 10,
    baseHealth: 30,
    baseSpeed: 1.6,
    color: COLORS.SLOT_SILVER, // Use silver for FUD
    spawnWeight: 10,
  },
  whale: {
    type: 'whale',
    radius: 35,
    baseHealth: 300,
    baseSpeed: 0.8,
    color: COLORS.WHALE,
    spawnWeight: 5,
  },
  liquidator: {
    type: 'liquidator',
    radius: 12,
    baseHealth: 40,
    baseSpeed: 1.5,
    color: COLORS.DUMP_ORANGE, // Use dump orange for liquidators
    spawnWeight: 8,
  },
  pumpdump: {
    type: 'pumpdump',
    radius: 18,
    baseHealth: 80,
    baseSpeed: 1.2,
    color: COLORS.PUMP_GREEN, // Use pump green for pumpdump
    spawnWeight: 6,
  },
};

/**
 * Extended Enemy with behavior strategy
 */
export interface GameEnemy extends Enemy {
  behavior: MovementStrategy;
}

/**
 * EnemyFactory - Creates enemies based on type and difficulty
 */
export class EnemyFactory {
  private static instance: EnemyFactory | null = null;
  private totalWeight: number;

  private constructor() {
    this.totalWeight = Object.values(ENEMY_CONFIGS).reduce(
      (sum, config) => sum + config.spawnWeight,
      0
    );
  }

  /**
   * Singleton instance
   */
  static getInstance(): EnemyFactory {
    if (!EnemyFactory.instance) {
      EnemyFactory.instance = new EnemyFactory();
    }
    return EnemyFactory.instance;
  }

  /**
   * Create a specific enemy type
   */
  createEnemy(
    type: string,
    x: number,
    y: number,
    difficulty: number,
    position: MarketPosition
  ): GameEnemy {
    const config = ENEMY_CONFIGS[type] ?? ENEMY_CONFIGS['bear']!;

    // Determine color based on position (enemies are opposite color)
    let color = config.color;
    if (type === 'bear' || type === 'bull') {
      color = position === MarketPosition.LONG ? COLORS.SHORT : COLORS.LONG;
    }

    return {
      active: true,
      x,
      y,
      type: config.type,
      radius: config.radius,
      health: config.baseHealth * (1 + (difficulty - 1) * 0.2),
      maxHealth: config.baseHealth * (1 + (difficulty - 1) * 0.2),
      speed: config.baseSpeed * difficulty,
      color,
      behavior: createMovementStrategy(type),
    };
  }

  /**
   * Create a random enemy based on spawn weights
   */
  createRandomEnemy(x: number, y: number, difficulty: number, position: MarketPosition): GameEnemy {
    const roll = Math.random() * this.totalWeight;
    let cumulative = 0;

    for (const [type, config] of Object.entries(ENEMY_CONFIGS)) {
      cumulative += config.spawnWeight;
      if (roll < cumulative) {
        return this.createEnemy(type, x, y, difficulty, position);
      }
    }

    // Fallback to bear
    return this.createEnemy('bear', x, y, difficulty, position);
  }

  /**
   * Get all available enemy types
   */
  getEnemyTypes(): string[] {
    return Object.keys(ENEMY_CONFIGS);
  }

  /**
   * Get config for a specific enemy type
   */
  getConfig(type: string): EnemyConfig | undefined {
    return ENEMY_CONFIGS[type];
  }
}

// Export singleton instance
export const enemyFactory = EnemyFactory.getInstance();
