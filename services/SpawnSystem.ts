import { MarketPosition, type CryptoPair } from '../types';
import { type IPoolManager } from './interfaces/IPoolManager';
import { GAME_ENGINE, SPAWN } from '../constants';
import { useAdminConfigStore } from '../stores/admin/configStore';
import {
  MarketStateService as marketStateService,
  type MarketState,
} from './MarketStateService';
import { WHALE_TIER_CONFIGS } from '../types/indicators';
import { Logger } from './Logger';
import { type SpawnDebugState, getDebugTimestamp } from '../types/DebugState';
import { type ISpawnSystem } from './interfaces/ISpawnSystem';
import { type EnemyId } from '../config/EnemyRegistry';

/**
 * SpawnSystem Class
 *
 * Orchestrates entity spawning based on market conditions, game difficulty,
 * and current player PnL. Handles tiered "Whale" spawning triggered by backend indicators
 * and regular thematic enemy variety.
 */
export class SpawnSystem implements ISpawnSystem {
  private spawnTimer: number = 0;
  private whaleCooldownTimer: number = 0;

  constructor() {}

  /**
   * Main update loop for the spawning logic.
   * Calculates dynamic intervals and triggers entity creation.
   *
   * @param deltaTime - Time since last frame in milliseconds.
   * @param difficulty - Current global difficulty scaling factor.
   * @param width - Current screen width for boundary calculation.
   * @param height - Current screen height for boundary calculation.
   * @param position - Player's current market position (LONG/SHORT).
   * @param pool - The pool manager to get/recycle entities.
   * @param pnl - Current player PnL for enemy type selection.
   * @param maxEnemiesOverride - Optional limit for total entities on screen.
   * @returns Current state of the internal spawn timer.
   */
  public update(
    deltaTime: number,
    difficulty: number,
    width: number,
    height: number,
    position: MarketPosition,
    pool: IPoolManager,
    pnl: number = 0,
    maxEnemiesOverride?: number,
    spawnRateMultiplier: number = 1,
    pair: CryptoPair = 'BTC',
    damageMultiplier: number = 1.0
  ): number {
    const config = this.getSpawnConfig();
    const marketState = marketStateService.getState(`${pair}-USD`);

    this.spawnTimer += deltaTime;
    this.whaleCooldownTimer = Math.max(0, this.whaleCooldownTimer - deltaTime);

    // Resolve current wave intensity modifiers
    const waveIntensity = config.waveIntensity;
    const intensityMultiplier = SPAWN.WAVE_INTENSITY_OFFSET + waveIntensity;

    // Difficulty-scaled spawn rate calculation
    // Multiplier from server (ATR/Trend based) generally scales the entire difficulty
    const scaledDifficulty =
      (1 +
        (difficulty - 1) * GAME_ENGINE.SPAWN_DIFFICULTY_SCALE * intensityMultiplier) *
      spawnRateMultiplier;

    // Determine current population limit
    const maxEnemies = maxEnemiesOverride ?? config.maxEnemies;

    // 1. High-Tier Content: Large "Whale" Spawning (Indicator-based)
    if (marketState && marketState.whaleTier > 0) {
      this.handleWhaleSpawning(
        marketState,
        pool,
        difficulty,
        position,
        width,
        height,
        maxEnemies,
        deltaTime,
        damageMultiplier
      );
    }

    // 1.5. Momentum Content: RSI-based Specialized Spawning
    if (marketState && marketState.rsiState !== 'NEUTRAL') {
      this.handleRSISpawning(
        marketState,
        pool,
        difficulty,
        position,
        width,
        height,
        maxEnemies,
        deltaTime,
        pair,
        damageMultiplier
      );
    }

    // 2. Standard Content: Regular Enemy Generation (Burst Capable)
    const spawnThreshold = config.baseInterval / scaledDifficulty;

    // Use 'while' to allow multiple spawns per frame if we are behind (Burst/Catch-up)
    // Limit burst to 5 per frame to prevent freezing
    let burstCount = 0;
    while (this.spawnTimer > spawnThreshold && burstCount < 5) {
      if (pool.activeEnemies.length < maxEnemies) {
        this.spawnRegularEnemy(
          pool,
          difficulty,
          position,
          pnl,
          width,
          height,
          pair,
          damageMultiplier
        );
      }
      this.spawnTimer -= spawnThreshold;
      burstCount++;
    }

    // If we still have too much time accumulated, cap it to prevent infinite spirals later
    if (this.spawnTimer > spawnThreshold) {
      this.spawnTimer = spawnThreshold;
    }

    return this.spawnTimer;
  }

  /**
   * Internal logic for handling RSI-based specialized spawning.
   * Spawns 'rsi' type enemies during overbought/oversold extremes.
   *
   * @private
   */
  private handleRSISpawning(
    marketState: MarketState,
    pool: IPoolManager,
    difficulty: number,
    position: MarketPosition,
    width: number,
    height: number,
    maxEnemies: number,
    deltaTime: number,
    pair: CryptoPair,
    damageMultiplier: number = 1.0
  ): void {
    // RSI spawns have a slightly higher chance but smaller impact than whales
    const frameTargetMs = 16.66;
    const rsiProb = 0.08 * (deltaTime / frameTargetMs); // 8% chance per second approx.

    if (Math.random() < rsiProb && pool.activeEnemies.length < maxEnemies) {
      const { x, y } = this.getRandomSpawnPosition(width, height);
      // Spawn specialized RSI enemy
      pool.getEnemy(x, y, difficulty, position, 'rsi', pair, damageMultiplier);
      Logger.debug(`[SpawnSystem] RSI Extreme Spawn: ${marketState.rsiState}`);
    }
  }

  /**
   * Internal logic for handling whale-tier enemy spawning with probability damping.
   *
   * @private
   */
  private handleWhaleSpawning(
    marketState: MarketState,
    pool: IPoolManager,
    difficulty: number,
    position: MarketPosition,
    width: number,
    height: number,
    maxEnemies: number,
    deltaTime: number,
    damageMultiplier: number = 1.0
  ): void {
    const whaleConfig =
      WHALE_TIER_CONFIGS[marketState.whaleTier as keyof typeof WHALE_TIER_CONFIGS];
    if (!whaleConfig) {
      return;
    }

    // Probability is dampened per frame and normalized by deltaTime to prevent spawning spikes
    // from persistent server data, ensuring consistency across different frame rates.
    const frameTargetMs = 16.66; // 60 FPS baseline
    const probPerFrame =
      whaleConfig.spawnChance *
      SPAWN.WHALE_PROBABILITY_MODIFIER *
      (deltaTime / frameTargetMs);

    if (
      this.whaleCooldownTimer <= 0 &&
      Math.random() < probPerFrame &&
      pool.activeEnemies.length < maxEnemies
    ) {
      const { x, y } = this.getRandomSpawnPosition(width, height);
      pool.getWhaleEnemy(
        x,
        y,
        difficulty,
        position,
        marketState.whaleTier,
        damageMultiplier
      );
      Logger.debug(`[SpawnSystem] Spawned whale tier ${marketState.whaleTier}`);
      this.whaleCooldownTimer = 20000; // 20s cooldown hardcoded for now
    }
  }

  /**
   * Determines and spawns a specific regular enemy based on market sentiment.
   *
   * @private
   */
  private spawnRegularEnemy(
    pool: IPoolManager,
    difficulty: number,
    position: MarketPosition,
    pnl: number,
    width: number,
    height: number,
    pair: CryptoPair,
    damageMultiplier: number = 1.0
  ): void {
    const { x, y } = this.getRandomSpawnPosition(width, height);

    // Decision Logic: Thematic vs Variant
    if (Math.random() < SPAWN.THEMATIC_SPAWN_CHANCE) {
      // Thematic Spawning: Aligns with LONG/SHORT and Profit/Loss states
      const isBearMarket =
        (position === MarketPosition.LONG && pnl < 0) ||
        (position === MarketPosition.SHORT && pnl > 0);
      const enemyType: EnemyId = isBearMarket ? 'bear' : 'bull';
      pool.getEnemy(x, y, difficulty, position, enemyType, pair, damageMultiplier);
    } else {
      // Variant Spawning: Randomly select from secondary enemy archetypes
      const roll = Math.random();
      let enemyType: EnemyId;

      if (roll < SPAWN.RANDOM_FUD_THRESHOLD) {
        enemyType = 'fud';
      } else if (roll < SPAWN.RANDOM_LIQUIDATOR_THRESHOLD) {
        enemyType = 'liquidator';
      } else {
        enemyType = 'pumpdump';
      }

      pool.getEnemy(x, y, difficulty, position, enemyType, pair, damageMultiplier);
    }
  }

  /**
   * Calculates a spawn coordinate outside the player's immediate field of view.
   *
   * @private
   */
  private getRandomSpawnPosition(
    width: number,
    height: number
  ): { x: number; y: number } {
    const edge = Math.floor(Math.random() * 4);
    const safeOffset = Math.max(GAME_ENGINE.SPAWN_OFFSET, SPAWN.MIN_SAFE_SPAWN_OFFSET);

    let x = 0,
      y = 0;

    switch (edge) {
      case 0: // Top edge
        x = Math.random() * width;
        y = -safeOffset;
        break;
      case 1: // Bottom edge
        x = Math.random() * width;
        y = height + safeOffset;
        break;
      case 2: // Left edge
        x = -safeOffset;
        y = Math.random() * height;
        break;
      case 3: // Right edge
        x = width + safeOffset;
        y = Math.random() * height;
        break;
    }

    return { x, y };
  }

  /**
   * Resolves current spawn operational parameters from the admin configuration.
   *
   * @private
   */
  private getSpawnConfig(): {
    baseInterval: number;
    maxEnemies: number;
    waveIntensity: number;
  } {
    try {
      return useAdminConfigStore.getState().config.spawn;
    } catch {
      // Return safe defaults if store is inaccessible
      return {
        baseInterval: GAME_ENGINE.SPAWN_TIMER_BASE,
        maxEnemies: SPAWN.MAX_DEFAULT_ENEMIES,
        waveIntensity: SPAWN.WAVE_INTENSITY_OFFSET,
      };
    }
  }

  /**
   * Resets the internal spawning timer for a clean cycle.
   */
  public reset(): void {
    this.spawnTimer = 0;
  }

  /**
   * Generates a snapshot of the spawn system state for debugging.
   */
  getDebugState(currentActiveEnemies: number = 0): SpawnDebugState {
    const config = this.getSpawnConfig();

    return {
      systemName: 'SpawnSystem',
      timestamp: getDebugTimestamp(),
      spawnTimer: this.spawnTimer,
      activeEnemies: currentActiveEnemies,
      maxEnemies: config.maxEnemies,
      spawnConfig: {
        baseInterval: config.baseInterval,
        waveIntensity: config.waveIntensity,
      },
    };
  }
}

// Export singleton factory
export const spawnSystem = new SpawnSystem();
