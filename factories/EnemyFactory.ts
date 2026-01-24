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
import { type RSIEnemyModifier, NEUTRAL_ENEMY_MODIFIER } from '../types/indicators';

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
   * @param rsiModifier Full RSI-based behavior modifier
   * @param damageMultiplier Global damage multiplier
   * @param target Existing enemy object for pooling
   */
  createEnemy(
    type: string,
    x: number,
    y: number,
    difficulty: number,
    position: MarketPosition,
    rsiModifier: RSIEnemyModifier = NEUTRAL_ENEMY_MODIFIER,
    damageMultiplier: number = 1.0,
    target?: GameEnemy
  ): GameEnemy {
    const config = (ENEMY_DEFINITIONS[type as EnemyId] ??
      ENEMY_DEFINITIONS['bear']) as EnemyConfig;

    // Determine visual color based on position and market sentiment
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

    // Apply RSI visual style overrides if applicable
    if (rsiModifier.visualStyle === 'friendly' && !preserveIdentity) {
      // Add a subtle glow or shift towards green/cyan
    } else if (rsiModifier.visualStyle === 'aggressive' && !preserveIdentity) {
      // Add a subtle shift towards deep red
    }

    // Combine multipliers: Difficulty * RSI Mod * Global Mod
    const modifiedSpeed = config.baseSpeed * rsiModifier.speedMultiplier;

    // Choose movement strategy based on RSI pattern
    let behavior: MovementStrategy;
    if (rsiModifier.movementPattern !== 'chase') {
      behavior = createMarketMovementStrategy(rsiModifier.movementPattern);
    } else {
      behavior = createMovementStrategy(type);
    }

    const enemyObj = target ?? ({} as GameEnemy);

    enemyObj.active = true;
    enemyObj.x = x;
    enemyObj.y = y;
    enemyObj.type = config.type as EnemyId;
    enemyObj.radius = config.radius;

    // Health scaled by difficulty AND RSI modifier
    const healthScale = (1 + (difficulty - 1) * 0.2) * rsiModifier.healthMultiplier;
    enemyObj.health = config.baseHealth * healthScale;
    enemyObj.maxHealth = enemyObj.health;

    // Damage scaled by RSI modifier AND global damage multiplier
    enemyObj.damage =
      config.baseDamage * rsiModifier.damageMultiplier * damageMultiplier;

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

    // Pass RSI metadata to enemy for drop logic in CombatSystem
    enemyObj.visualStyle = rsiModifier.visualStyle;
    enemyObj.dropBuffChance = rsiModifier.dropBuffChance;
    enemyObj.dropDebuffChance = rsiModifier.dropDebuffChance;

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
    rsiModifier: RSIEnemyModifier = NEUTRAL_ENEMY_MODIFIER,
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
          rsiModifier,
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
      rsiModifier,
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
