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
    damageMultiplier: number = 1.0,
    target?: GameEnemy
  ): GameEnemy {
    const config = (ENEMY_DEFINITIONS[type as EnemyId] ??
      ENEMY_DEFINITIONS['bear']) as EnemyConfig;

    // ... (color logic remains the same)
    let color = config.color;

    const preserveIdentity = type === 'fud' || type === 'whale';

    if (!preserveIdentity) {
      if (position === MarketPosition.LONG) {
        if (type === 'liquidator' || type === 'pumpdump') {
          color = COLORS.DUMP_ORANGE;
        } else {
          color = COLORS.SHORT;
        }
      } else {
        if (type === 'liquidator' || type === 'pumpdump') {
          color = COLORS.PUMP_GREEN;
        } else {
          color = COLORS.LONG;
        }
      }
    } else if (config.isOppositeColor) {
      color = position === MarketPosition.LONG ? COLORS.SHORT : COLORS.LONG;
    }

    const modifiedSpeed = config.baseSpeed * aggroMultiplier;

    let behavior: MovementStrategy;
    if (aggroMultiplier >= 1.3) {
      behavior = createMarketMovementStrategy('zigzag');
    } else if (aggroMultiplier <= 0.8) {
      behavior = createMarketMovementStrategy('straight');
    } else {
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
    enemyObj.damage = config.baseDamage * damageMultiplier;
    enemyObj.speed = modifiedSpeed;
    enemyObj.color = color;
    enemyObj.behavior = behavior;
    enemyObj.spawnTimer = 0;
    enemyObj.hasEnteredScreen = false;
    enemyObj.isDying = false;
    enemyObj.deathProgress = 0;
    enemyObj.hasTriggeredNearMiss = false;
    enemyObj.damageBuffer = 0;
    enemyObj.damageBufferTimer = 0;
    enemyObj.damageBufferIsCrit = false;
    enemyObj.damageBufferIsSuperCrit = false;
    enemyObj.damageBufferCritCount = 0;
    enemyObj.valueMultiplier = 1.0;

    return enemyObj;
  }

  /**
   * Create a random enemy based on spawn weights
   */
  createRandomEnemy(
    x: number,
    y: number,
    difficulty: number,
    position: MarketPosition,
    aggroMultiplier: number = 1.0,
    damageMultiplier: number = 1.0
  ): GameEnemy {
    const roll = Math.random() * this.totalWeight;
    let cumulative = 0;

    for (const [type, config] of Object.entries(ENEMY_DEFINITIONS)) {
      cumulative += config.spawnWeight;
      if (roll < cumulative) {
        return this.createEnemy(
          type,
          x,
          y,
          difficulty,
          position,
          aggroMultiplier,
          damageMultiplier
        );
      }
    }

    return this.createEnemy(
      'bear',
      x,
      y,
      difficulty,
      position,
      aggroMultiplier,
      damageMultiplier
    );
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
