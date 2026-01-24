import { MarketPosition, type CryptoPair } from '../types';
import { type IPoolManager } from './interfaces/IPoolManager';
import { ENEMY_SPAWN } from '../config';
import { useAdminConfigStore } from '../stores/admin/configStore';
import { marketIndicatorService } from './indicators/MarketIndicatorService';
import { WHALE_TIER_CONFIGS } from '../types/indicators';
import { Logger } from './Logger';
import { type SpawnDebugState, getDebugTimestamp } from '../types/DebugState';
import { type ISpawnSystem } from './interfaces/ISpawnSystem';
import { type EnemyId } from '../config/EnemyRegistry';
import { EventBus } from './EventBus';
import { type GameMarketEvent } from './MarketEventManager';

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
  private activeEvents: Map<GameMarketEvent, { intensity: number; expiry: number }> =
    new Map();

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    EventBus.on('gameMarketEvent', data => {
      this.activeEvents.set(data.type, {
        intensity: data.intensity,
        expiry: Date.now() + data.durationMs,
      });
      Logger.info(`[SpawnSystem] Active Event Received: ${data.type}`);
    });
  }

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
    _spawnRateMultiplier: number = 1,
    _pair: CryptoPair = 'BTC',
    damageMultiplier: number = 1.0,
    speedMultiplier: number = 1.0
  ): number {
    const config = this.getSpawnConfig();
    const marketState = marketIndicatorService.getState();

    this.spawnTimer += deltaTime;
    this.whaleCooldownTimer = Math.max(0, this.whaleCooldownTimer - deltaTime);

    // Resolve current wave intensity modifiers
    const waveIntensity = config.waveIntensity;
    const intensityMultiplier = ENEMY_SPAWN.WAVE_INTENSITY_OFFSET + waveIntensity;

    // Difficulty-scaled spawn rate calculation
    // Multiplier from server (ATR/Trend based) generally scales the entire difficulty
    const scaledDifficulty =
      (1 + (difficulty - 1) * ENEMY_SPAWN.DIFFICULTY_SCALE * intensityMultiplier) *
      marketState.spawnRateMultiplier;

    // Determine current population limit
    const maxEnemies = maxEnemiesOverride ?? config.maxEnemies;

    // 0. Cleanup Expired Events
    const now = Date.now();
    for (const [type, data] of this.activeEvents.entries()) {
      if (now > data.expiry) this.activeEvents.delete(type);
    }

    // 1. High-Tier Content: Large "Whale" Spawning (Indicator-based)
    // WHALE_ALERT event forces a whale spawn or increases chance
    const whaleAlert = this.activeEvents.get('WHALE_ALERT');
    if (marketState.whaleTier > 0 || whaleAlert) {
      const effectiveTier = whaleAlert
        ? Math.max(marketState.whaleTier, 2)
        : marketState.whaleTier;
      this.handleWhaleSpawning(
        effectiveTier,
        pool,
        difficulty,
        position,
        width,
        height,
        maxEnemies,
        deltaTime,
        damageMultiplier,
        speedMultiplier,
        whaleAlert?.intensity ?? 0
      );
    }

    // 1.5. Momentum Content: RSI-based Specialized Spawning
    if (marketState.rsiState !== 'NEUTRAL') {
      this.handleRSISpawning(
        marketState.rsiState,
        pool,
        difficulty,
        position,
        width,
        height,
        maxEnemies,
        deltaTime,
        damageMultiplier,
        speedMultiplier
      );
    }

    // 2. Standard Content: Regular Enemy Generation (Burst Capable)
    let eventSpawnMultiplier = 1.0;
    if (this.activeEvents.has('VOLUME_SPIKE')) eventSpawnMultiplier += 0.5;
    if (this.activeEvents.has('FLASH_CRASH')) eventSpawnMultiplier += 1.0;
    if (this.activeEvents.has('CONSOLIDATION')) eventSpawnMultiplier -= 0.3;

    const spawnThreshold =
      config.baseInterval / (scaledDifficulty * eventSpawnMultiplier);

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
          damageMultiplier,
          speedMultiplier,
          marketState.rsiState
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
    rsiState: string,
    pool: IPoolManager,
    difficulty: number,
    position: MarketPosition,
    width: number,
    height: number,
    maxEnemies: number,
    deltaTime: number,
    damageMultiplier: number = 1.0,
    speedMultiplier: number = 1.0
  ): void {
    // RSI spawns have a slightly higher chance but smaller impact than whales
    const frameTargetMs = 16.66;
    const rsiProb = 0.08 * (deltaTime / frameTargetMs); // 8% chance per second approx.

    if (Math.random() < rsiProb && pool.activeEnemies.length < maxEnemies) {
      const { x, y } = this.getRandomSpawnPosition(width, height);
      // Spawn specialized RSI enemy
      pool.getEnemy(
        x,
        y,
        difficulty,
        position,
        'rsi',
        undefined,
        damageMultiplier,
        speedMultiplier
      );
      Logger.debug(`[SpawnSystem] RSI Extreme Spawn: ${rsiState}`);
    }
  }

  /**
   * Internal logic for handling whale-tier enemy spawning with probability damping.
   *
   * @private
   */
  private handleWhaleSpawning(
    whaleTier: number,
    pool: IPoolManager,
    difficulty: number,
    position: MarketPosition,
    width: number,
    height: number,
    maxEnemies: number,
    deltaTime: number,
    damageMultiplier: number = 1.0,
    speedMultiplier: number = 1.0,
    eventIntensity: number = 0
  ): void {
    const whaleConfig =
      WHALE_TIER_CONFIGS[whaleTier as keyof typeof WHALE_TIER_CONFIGS];
    if (!whaleConfig) {
      return;
    }

    // Boost probability during Whale Alert event
    const eventBoost = eventIntensity > 0 ? 5.0 : 1.0;

    // Probability is dampened per frame and normalized by deltaTime to prevent spawning spikes
    // from persistent server data, ensuring consistency across different frame rates.
    const frameTargetMs = 16.66; // 60 FPS baseline
    const probPerFrame =
      whaleConfig.spawnChance *
      ENEMY_SPAWN.WHALE_PROBABILITY_MODIFIER *
      eventBoost *
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
        whaleTier,
        damageMultiplier,
        speedMultiplier
      );
      Logger.debug(`[SpawnSystem] Spawned whale tier ${whaleTier}`);
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
    damageMultiplier: number = 1.0,
    speedMultiplier: number = 1.0,
    rsiState: string = 'NEUTRAL'
  ): void {
    const { x, y } = this.getRandomSpawnPosition(width, height);

    // Contextual Spawning Logic (Layer 3)
    const roll = Math.random();
    let enemyType: EnemyId = 'bear';

    // 1. Check for Flash Crash (Panic Mode)
    if (this.activeEvents.has('FLASH_CRASH')) {
      enemyType = roll < 0.7 ? 'liquidator' : 'fud';
    }
    // 2. Bearish Market Sentiment
    else if (rsiState === 'OVERSOLD' || (position === MarketPosition.LONG && pnl < 0)) {
      if (roll < 0.6) enemyType = 'bear';
      else if (roll < 0.8) enemyType = 'fud';
      else enemyType = 'liquidator';
    }
    // 3. Bullish Market Sentiment
    else if (
      rsiState === 'OVERBOUGHT' ||
      (position === MarketPosition.SHORT && pnl < 0)
    ) {
      if (roll < 0.6) enemyType = 'bull';
      else if (roll < 0.8) enemyType = 'pumpdump';
      else enemyType = 'rsi';
    }
    // 4. Default / Mixed
    else {
      if (roll < 0.4) enemyType = 'bear';
      else if (roll < 0.7) enemyType = 'bull';
      else if (roll < 0.85) enemyType = 'fud';
      else enemyType = 'pumpdump';
    }

    pool.getEnemy(
      x,
      y,
      difficulty,
      position,
      enemyType,
      undefined,
      damageMultiplier,
      speedMultiplier
    );
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
    const safeOffset = Math.max(
      ENEMY_SPAWN.SPAWN_DISTANCE,
      ENEMY_SPAWN.MIN_SAFE_OFFSET
    );

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
        baseInterval: ENEMY_SPAWN.BASE_INTERVAL,
        maxEnemies: ENEMY_SPAWN.MAX_ENEMIES,
        waveIntensity: ENEMY_SPAWN.WAVE_INTENSITY_OFFSET,
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
