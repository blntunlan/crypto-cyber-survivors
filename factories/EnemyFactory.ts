/**
 * EnemyFactory - Factory Pattern Implementation
 *
 * Centralizes enemy creation logic with different enemy types.
 * Makes it easy to add new enemy types without modifying client code.
 */

import { type Enemy, MarketPosition } from '../types';
import { COLORS } from '../constants';
import { ENEMY_DEFINITIONS, type EnemyId } from '../config/EnemyRegistry';
import {
  type MovementStrategy,
  createMovementStrategy,
  createMarketMovementStrategy,
} from '../strategies/EnemyBehaviors';

/**
 * Enemy configuration blueprint (now matches Registry)
 */
export type EnemyConfig = (typeof ENEMY_DEFINITIONS)[EnemyId];

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
    this.totalWeight = Object.values(ENEMY_DEFINITIONS).reduce(
      (sum, config) => sum + config.spawnWeight,
      0
    );
  }

  /**
   * Singleton instance
   */
  static getInstance(): EnemyFactory {
    return (EnemyFactory.instance ??= new EnemyFactory());
  }

  /**
   * Create a specific enemy type
   *
   * @param type Enemy type (bear, bull, fud, etc.)
   * @param x Spawn X position
   * @param y Spawn Y position
   * @param difficulty Current difficulty level
   * @param position Player's market position (LONG/SHORT)
   * @param aggroMultiplier RSI-based difficulty modifier (>1 = harder, <1 = easier)
   */
  createEnemy(
    type: string,
    x: number,
    y: number,
    difficulty: number,
    position: MarketPosition,
    aggroMultiplier: number = 1.0
  ): GameEnemy {
    const config = (ENEMY_DEFINITIONS[type as EnemyId] ?? ENEMY_DEFINITIONS['bear']) as EnemyConfig;

    // Determine color based on position (enemies are opposite color)
    let color = config.color;
    if (config.isOppositeColor) {
      color = position === MarketPosition.LONG ? COLORS.SHORT : COLORS.LONG;
    }

    // Apply aggro multiplier to speed
    const baseSpeed = config.baseSpeed * difficulty;
    const modifiedSpeed = baseSpeed * aggroMultiplier;

    // Determine movement behavior based on aggro level
    let behavior: MovementStrategy;
    if (aggroMultiplier >= 1.3) {
      // High aggro (OVERBOUGHT for LONG, OVERSOLD for SHORT) - aggressive zigzag
      behavior = createMarketMovementStrategy('zigzag');
    } else if (aggroMultiplier <= 0.8) {
      // Low aggro (OVERSOLD for LONG, OVERBOUGHT for SHORT) - easy straight movement
      behavior = createMarketMovementStrategy('straight');
    } else {
      // Neutral - use default type-based behavior
      behavior = createMovementStrategy(type);
    }

    return {
      active: true,
      x,
      y,
      type: config.type as EnemyId, // Cast for type compatibility with old enum if needed
      radius: config.radius,
      health: config.baseHealth * (1 + (difficulty - 1) * 0.2),
      maxHealth: config.baseHealth * (1 + (difficulty - 1) * 0.2),
      speed: modifiedSpeed,
      color,
      behavior,
    };
  }

  /**
   * Create a random enemy based on spawn weights
   *
   * @param aggroMultiplier RSI-based difficulty modifier (>1 = harder, <1 = easier)
   */
  createRandomEnemy(
    x: number,
    y: number,
    difficulty: number,
    position: MarketPosition,
    aggroMultiplier: number = 1.0
  ): GameEnemy {
    const roll = Math.random() * this.totalWeight;
    let cumulative = 0;

    for (const [type, config] of Object.entries(ENEMY_DEFINITIONS)) {
      cumulative += config.spawnWeight;
      if (roll < cumulative) {
        return this.createEnemy(type, x, y, difficulty, position, aggroMultiplier);
      }
    }

    // Fallback to bear
    return this.createEnemy('bear', x, y, difficulty, position, aggroMultiplier);
  }

  /**
   * Get all available enemy types
   */
  getEnemyTypes(): string[] {
    return Object.keys(ENEMY_DEFINITIONS);
  }

  /**
   * Get config for a specific enemy type
   */
  getConfig(type: string): EnemyConfig | undefined {
    return ENEMY_DEFINITIONS[type as EnemyId];
  }
}

// Export singleton instance
export const enemyFactory = EnemyFactory.getInstance();
