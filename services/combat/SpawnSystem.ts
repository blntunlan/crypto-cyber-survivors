import { MarketPosition, type CryptoPair } from '../../types';
import { type IPoolManager } from '../interfaces/IPoolManager';
import { ENEMY_SPAWN } from '../../config';
import { useAdminConfigStore } from '../../stores/admin/configStore';
import { marketIndicatorService } from '../indicators/MarketIndicatorService';
import { WHALE_TIER_CONFIGS } from '../../types/indicators';
import { Logger } from '../system/Logger';
import { type SpawnDebugState, getDebugTimestamp } from '../../types/DebugState';
import { type ISpawnSystem } from '../interfaces/ISpawnSystem';
import { type EnemyId } from '../../config/EnemyRegistry';
import { EventBus } from '../core/EventBus';
import { type GameMarketEvent } from '../market/MarketEventManager';

/**
 * SpawnSystem Class
 *
 * Orchestrates entity spawning based on market conditions, game difficulty,
 * and current player PnL.
 */
export class SpawnSystem implements ISpawnSystem {
  private static instance: SpawnSystem | null = null;
  private spawnTimer: number = 0;
  private whaleCooldownTimer: number = 0;
  private activeEvents: Map<GameMarketEvent, { intensity: number; expiry: number }> =
    new Map();

  private pendingGatekeeperSpawn: { x: number; y: number; count: number } | null = null;

  private constructor() {
    this.setupEventListeners();
  }

  public static getInstance(): SpawnSystem {
    return (SpawnSystem.instance ??= new SpawnSystem());
  }

  public static resetInstance(): void {
    SpawnSystem.instance = null;
  }

  private setupEventListeners(): void {
    EventBus.on('gameMarketEvent', data => {
      this.activeEvents.set(data.type, {
        intensity: data.intensity,
        expiry: Date.now() + data.durationMs,
      });
      Logger.info(`[SpawnSystem] Active Event Received: ${data.type}`);
    });

    EventBus.on('portalOpened', data => {
      this.pendingGatekeeperSpawn = { x: data.x, y: data.y, count: 8 };
      Logger.info(`[SpawnSystem] Queued 8 gatekeepers for portal`);
    });
  }

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

    // No direct AI Logic here - central logic is in DifficultyManager
    const maxEnemies = maxEnemiesOverride ?? config.maxEnemies;

    // 0. Cleanup Expired Events (Optimized for performance)
    const now = Date.now();
    if (this.activeEvents.size > 0) {
      const keys = Array.from(this.activeEvents.keys());
      for (let i = 0; i < keys.length; i++) {
        const type = keys[i]!;
        const data = this.activeEvents.get(type);
        if (data && now > data.expiry) {
          this.activeEvents.delete(type);
        }
      }
    }

    // 0.5 Handle Special Pending Spawns (Gatekeepers)
    if (this.pendingGatekeeperSpawn) {
      this.spawnGatekeepers(this.pendingGatekeeperSpawn, pool, difficulty, position);
      this.pendingGatekeeperSpawn = null;
    }

    // 1. High-Tier Content: Whale Spawning
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

    // 2. Standard Content: Regular Enemy Generation
    let eventSpawnMultiplier = 1.0;
    if (this.activeEvents.has('VOLUME_SPIKE')) eventSpawnMultiplier += 0.5;
    if (this.activeEvents.has('FLASH_CRASH')) eventSpawnMultiplier += 1.0;

    // Normal spawn threshold logic
    const spawnThreshold = config.baseInterval / (difficulty * eventSpawnMultiplier);

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

    if (this.spawnTimer > spawnThreshold) this.spawnTimer = spawnThreshold;

    return this.spawnTimer;
  }

  private spawnGatekeepers(
    data: { x: number; y: number; count: number },
    pool: IPoolManager,
    difficulty: number,
    pos: MarketPosition
  ) {
    const orbitRadius = 80;
    for (let i = 0; i < data.count; i++) {
      const angle = (i / data.count) * Math.PI * 2;
      const x = data.x + Math.cos(angle) * orbitRadius;
      const y = data.y + Math.sin(angle) * orbitRadius;

      const enemy = pool.getEnemy(x, y, difficulty, pos, 'gatekeeper');
      // Special flag for orbit logic in GameEngine
      enemy.orbitPoint = { x: data.x, y: data.y };
      enemy.orbitAngle = angle;
    }
  }

  private handleWhaleSpawning(
    whaleTier: number,
    pool: IPoolManager,
    difficulty: number,
    position: MarketPosition,
    width: number,
    height: number,
    maxEnemies: number,
    deltaTime: number,
    damageMultiplier: number,
    speedMultiplier: number,
    eventIntensity: number
  ) {
    const whaleConfig =
      WHALE_TIER_CONFIGS[whaleTier as keyof typeof WHALE_TIER_CONFIGS];
    if (!whaleConfig) return;

    const eventBoost = eventIntensity > 0 ? 5.0 : 1.0;
    const frameTargetMs = 16.66;
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
      this.whaleCooldownTimer = 20000;
    }
  }

  private spawnRegularEnemy(
    pool: IPoolManager,
    difficulty: number,
    position: MarketPosition,
    pnl: number,
    width: number,
    height: number,
    damageMultiplier: number,
    speedMultiplier: number,
    rsiState: string
  ) {
    const { x, y } = this.getRandomSpawnPosition(width, height);
    const roll = Math.random();
    let enemyType: EnemyId = 'bear';

    if (this.activeEvents.has('FLASH_CRASH')) {
      enemyType = roll < 0.7 ? 'liquidator' : 'fud';
    } else if (
      rsiState === 'OVERSOLD' ||
      (position === MarketPosition.LONG && pnl < 0)
    ) {
      enemyType = roll < 0.6 ? 'bear' : roll < 0.8 ? 'fud' : 'liquidator';
    } else if (
      rsiState === 'OVERBOUGHT' ||
      (position === MarketPosition.SHORT && pnl < 0)
    ) {
      enemyType = roll < 0.6 ? 'bull' : roll < 0.8 ? 'pumpdump' : 'rsi';
    } else {
      enemyType =
        roll < 0.4 ? 'bear' : roll < 0.7 ? 'bull' : roll < 0.85 ? 'fud' : 'pumpdump';
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

  private getRandomSpawnPosition(width: number, height: number) {
    const edge = Math.floor(Math.random() * 4);
    const safeOffset = Math.max(
      ENEMY_SPAWN.SPAWN_DISTANCE,
      ENEMY_SPAWN.MIN_SAFE_OFFSET
    );
    let x = 0,
      y = 0;
    switch (edge) {
      case 0:
        x = Math.random() * width;
        y = -safeOffset;
        break;
      case 1:
        x = Math.random() * width;
        y = height + safeOffset;
        break;
      case 2:
        x = -safeOffset;
        y = Math.random() * height;
        break;
      case 3:
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
        baseInterval: ENEMY_SPAWN.BASE_INTERVAL,
        maxEnemies: ENEMY_SPAWN.MAX_ENEMIES,
        waveIntensity: ENEMY_SPAWN.WAVE_INTENSITY_OFFSET,
      };
    }
  }

  public reset(): void {
    this.spawnTimer = 0;
    this.pendingGatekeeperSpawn = null;
  }

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

export const spawnSystem = SpawnSystem.getInstance();
