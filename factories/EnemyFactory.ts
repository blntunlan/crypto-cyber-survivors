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
    aggroMultiplier: number = 1.0,
    target?: GameEnemy
  ): GameEnemy {
    const config = (ENEMY_DEFINITIONS[type as EnemyId] ??
      ENEMY_DEFINITIONS['bear']) as EnemyConfig;

    // Determine color based on position (enemies serve as market opposition)
    // Rule: If Player is LONG (Green), Enemies should be RED tones.
    //       If Player is SHORT (Red), Enemies should be GREEN tones.
    let color = config.color;

    // FUD and Whale keep their identity colors
    const preserveIdentity = type === 'fud' || type === 'whale';

    if (!preserveIdentity) {
      if (position === MarketPosition.LONG) {
        // Player is Green -> Enemies must be Red/Orange
        if (type === 'liquidator' || type === 'pumpdump') {
          color = COLORS.DUMP_ORANGE; // Distinct Red-ish tone for specials
        } else {
          color = COLORS.SHORT; // Standard Red
        }
      } else {
        // Player is Red -> Enemies must be Green/Lime
        if (type === 'liquidator' || type === 'pumpdump') {
          color = COLORS.PUMP_GREEN; // Distinct Green-ish tone for specials
        } else {
          color = COLORS.LONG; // Standard Green
        }
      }
    } else if (config.isOppositeColor) {
      // Fallback for strict opposites defined in registry
      color = position === MarketPosition.LONG ? COLORS.SHORT : COLORS.LONG;
    }

    // Apply difficulty to speed with softer scaling (25% effect instead of 100%)
    // This reduces the extreme speed gap between easy (0.3 diff) and hard (8.0 diff)
    // Old: 0.3x - 8.0x range | New: 0.825x - 2.75x range
    const speedDifficultyMult = 1 + (difficulty - 1) * 0.25;
    const baseSpeed = config.baseSpeed * speedDifficultyMult;
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

    const enemyObj = target ?? ({} as GameEnemy);

    enemyObj.active = true;
    enemyObj.x = x;
    enemyObj.y = y;
    enemyObj.type = config.type as EnemyId;
    enemyObj.radius = config.radius;
    enemyObj.health = config.baseHealth * (1 + (difficulty - 1) * 0.2);
    enemyObj.maxHealth = config.baseHealth * (1 + (difficulty - 1) * 0.2);
    enemyObj.speed = modifiedSpeed;
    enemyObj.color = color;
    enemyObj.behavior = behavior;
    enemyObj.spawnTimer = 0;
    enemyObj.hasEnteredScreen = false;
    enemyObj.isDying = false;
    enemyObj.deathProgress = 0;
    enemyObj.hasTriggeredNearMiss = false;
    // Reset buffers just in case
    enemyObj.damageBuffer = 0;
    enemyObj.damageBufferTimer = 0;

    return enemyObj;
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
