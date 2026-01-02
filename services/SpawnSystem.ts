import { MarketPosition } from '../types';
import { type PoolManager } from './PoolManager';
import { GAME_ENGINE } from '../constants';
import { useAdminConfigStore } from '../stores/admin/configStore';
import { marketStateService } from './MarketStateService';
import { WHALE_TIER_CONFIGS } from '../types/indicators';
import { Logger } from './Logger';

/**
 * SpawnSystem - Orchestrates entity spawning based on market conditions and difficulty.
 *
 * This system determines when and where to spawn enemies (Bears/Bulls) and Whales
 * by analyzing market indicators (ATR, Volume, PnL).
 *
 * Implements Singleton pattern for consistent state management.
 */
export class SpawnSystem {
  private static instance: SpawnSystem | null = null;
  private spawnTimer: number = 0;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): SpawnSystem {
    return (this.instance ??= new SpawnSystem());
  }

  /**
   * Update the spawn system state and trigger spawns if necessary.
   *
   * @param deltaTime Time since last frame in ms
   * @param difficulty Current game difficulty scaling
   * @param width Screen width for spawn boundaries
   * @param height Screen height for spawn boundaries
   * @param position Current market position (LONG/SHORT)
   * @param pool PoolManager instance to get/recycle entities
   * @param pnl Current player PnL for enemy type selection
   * @param maxEnemiesOverride Optional limit for total enemies
   * @returns Updated internal spawn timer (for state syncing if needed)
   */
  public update(
    deltaTime: number,
    difficulty: number,
    width: number,
    height: number,
    position: MarketPosition,
    pool: PoolManager,
    pnl: number = 0,
    maxEnemiesOverride?: number
  ): number {
    const config = this.getSpawnConfig();
    const marketState = marketStateService.getState();
    const marketSpawnMultiplier = marketState?.spawnRateMultiplier ?? 1.0;

    this.spawnTimer += deltaTime;

    // Calculate spawning limits and rate
    const waveIntensity = config.waveIntensity;
    const intensityMultiplier = 0.5 + waveIntensity; // 0.5 to 1.5x
    const scaledDifficulty =
      1 +
      (difficulty - 1) *
        GAME_ENGINE.SPAWN_DIFFICULTY_SCALE *
        intensityMultiplier *
        marketSpawnMultiplier;

    // Chaos mode: Reduces cap slightly to maintain performance during high frequency
    const maxEnemies = maxEnemiesOverride ?? config.maxEnemies;
    const effectiveMaxEnemies =
      marketSpawnMultiplier > 1.5 ? Math.floor(maxEnemies * 0.8) : maxEnemies;

    // 1. Whale Spawning (Server-triggered)
    if (marketState && marketState.whaleTier > 0) {
      this.handleWhaleSpawning(
        marketState,
        pool,
        difficulty,
        position,
        width,
        height,
        effectiveMaxEnemies
      );
    }

    // 2. Regular Spawning
    const spawnThreshold = config.baseInterval / scaledDifficulty;
    if (this.spawnTimer > spawnThreshold) {
      if (pool.activeEnemies.length < effectiveMaxEnemies) {
        this.spawnRegularEnemy(pool, difficulty, position, pnl, width, height);
      }
      this.spawnTimer = 0;
    }

    return this.spawnTimer;
  }

  /**
   * Internal logic for whale spawning with frame-based probability control.
   */
  private handleWhaleSpawning(
    marketState: any,
    pool: PoolManager,
    difficulty: number,
    position: MarketPosition,
    width: number,
    height: number,
    maxEnemies: number
  ): void {
    const whaleConfig =
      WHALE_TIER_CONFIGS[marketState.whaleTier as keyof typeof WHALE_TIER_CONFIGS];
    if (!whaleConfig) return;

    // Frame-level probability to prevent spamming from persistent server state
    // config.spawnChance (e.g. 0.2) * 0.01 = 0.002 chance per frame (~once per 8s at 60fps)
    const probPerFrame = whaleConfig.spawnChance * 0.01;

    if (Math.random() < probPerFrame && pool.activeEnemies.length < maxEnemies) {
      const { x, y } = this.getRandomSpawnPosition(width, height);
      pool.getWhaleEnemy(x, y, difficulty, position, marketState.whaleTier);
      Logger.debug(`[SpawnSystem] Spawned whale tier ${marketState.whaleTier}`);
    }
  }

  /**
   * Spawns a regular enemy (Bear or Bull) based on market sentiment.
   */
  private spawnRegularEnemy(
    pool: PoolManager,
    difficulty: number,
    position: MarketPosition,
    pnl: number,
    width: number,
    height: number
  ): void {
    const { x, y } = this.getRandomSpawnPosition(width, height);

    // Position/PnL Logic:
    // LONG + Loss = Bear | LONG + Profit = Bull
    // SHORT + Loss = Bull | SHORT + Profit = Bear
    const isBearMarket =
      (position === MarketPosition.LONG && pnl < 0) ||
      (position === MarketPosition.SHORT && pnl > 0);
    const enemyType = isBearMarket ? 'bear' : 'bull';

    pool.getEnemy(x, y, difficulty, position, enemyType);
  }

  /**
   * Returns a random position outside the visible screen area.
   */
  private getRandomSpawnPosition(width: number, height: number): { x: number; y: number } {
    const edge = Math.floor(Math.random() * 4);
    const safeOffset = Math.max(GAME_ENGINE.SPAWN_OFFSET, 80);

    let x = 0,
      y = 0;

    switch (edge) {
      case 0: // Top
        x = Math.random() * width;
        y = -safeOffset;
        break;
      case 1: // Bottom
        x = Math.random() * width;
        y = height + safeOffset;
        break;
      case 2: // Left
        x = -safeOffset;
        y = Math.random() * height;
        break;
      case 3: // Right
        x = width + safeOffset;
        y = Math.random() * height;
        break;
    }

    return { x, y };
  }

  private getSpawnConfig() {
    try {
      return useAdminConfigStore.getState().config.spawn;
    } catch {
      return {
        baseInterval: GAME_ENGINE.SPAWN_TIMER_BASE,
        maxEnemies: 150,
        waveIntensity: 0.5,
      };
    }
  }

  /**
   * Reset internal state.
   */
  public reset(): void {
    this.spawnTimer = 0;
  }
}

// Export singleton instance
export const spawnSystem = SpawnSystem.getInstance();
