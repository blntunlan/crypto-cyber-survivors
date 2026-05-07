import { MarketPosition, type CryptoPair, type EnemyIntent } from '../../types';
import { type IPoolManager } from '../interfaces/IPoolManager';
import { ENEMY_SPAWN } from '../../config';
import { useAdminConfigStore } from '../../stores/admin/configStore';
import {
  WHALE_TIER_CONFIGS,
  WhaleTier,
  type RSIEnemyModifier,
  type RSIState,
  getEnemyModifierFromRSI,
  getRSIStateWithHysteresis,
} from '../../types/indicators';
import { Logger } from '../system/Logger';
import { type SpawnDebugState, getDebugTimestamp } from '../../types/DebugState';
import { type ISpawnSystem } from '../interfaces/ISpawnSystem';
import { type EnemyId } from '../../config/EnemyRegistry';
import { EventBus } from '../core/EventBus';
import { type GameMarketEvent } from '../market/MarketEventManager';

export interface SpawnMarketSignals {
  rsi?: number;
  rsiState?: string;
  whaleTier?: number;
  playerPower?: number;
  offensePower?: number;
  counterPressure?: number;
  rangedPressure?: number;
  screenPressure?: number;
}

interface EnemyResponseProfile {
  playerPower: number;
  offensePower: number;
  counterPressure: number;
  rangedPressure: number;
  screenPressure: number;
  spawnMultiplier: number;
  damageMultiplier: number;
  speedMultiplier: number;
  hpMultiplier: number;
  intent: EnemyIntent;
  powerTier: number;
}

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
  private previousRSIState: RSIState = 'NEUTRAL';
  private rsiSpawnCooldownTimer: number = 0;
  private readonly enemyResponse: EnemyResponseProfile = {
    playerPower: 0,
    offensePower: 0,
    counterPressure: 0,
    rangedPressure: 0,
    screenPressure: 0,
    spawnMultiplier: 1,
    damageMultiplier: 1,
    speedMultiplier: 1,
    hpMultiplier: 1,
    intent: 'pressure',
    powerTier: 0,
  };
  private static readonly RSI_SPAWN_COOLDOWN_MS = 4000; // 4s cooldown per design spec
  private static readonly MAX_ACTIVE_WHALES = 3;

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
    spawnRateMultiplier?: number,
    _pair: CryptoPair = 'BTC',
    damageMultiplier: number = 1.0,
    speedMultiplier: number = 1.0,
    marketSignals?: SpawnMarketSignals
  ): number {
    const config = this.getSpawnConfig();
    const rsiState = this.resolveRSIState(marketSignals);
    const whaleTier = this.resolveWhaleTier(marketSignals?.whaleTier);
    const enemyModifier = getEnemyModifierFromRSI(rsiState, position);
    const response = this.resolveEnemyResponse(marketSignals);

    this.spawnTimer += deltaTime;
    this.whaleCooldownTimer = Math.max(0, this.whaleCooldownTimer - deltaTime);
    this.rsiSpawnCooldownTimer = Math.max(0, this.rsiSpawnCooldownTimer - deltaTime);
    this.attackCooldownTimer = Math.max(0, this.attackCooldownTimer - deltaTime);

    // No direct AI Logic here - central logic is in DifficultyManager
    const maxEnemies = maxEnemiesOverride ?? config.maxEnemies;

    // 0. Cleanup Expired Events (Optimized for performance)
    const now = Date.now();
    if (this.activeEvents.size > 0) {
      for (const type of this.activeEvents.keys()) {
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
    if (whaleTier > WhaleTier.NONE || whaleAlert) {
      const effectiveTier = whaleAlert
        ? (Math.max(whaleTier, WhaleTier.WHALE) as WhaleTier)
        : whaleTier;
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
        whaleAlert?.intensity ?? 0,
        enemyModifier,
        response
      );
    }

    // 2. Standard Content: Regular Enemy Generation
    let eventSpawnMultiplier = 1.0;
    if (this.activeEvents.has('VOLUME_SPIKE')) eventSpawnMultiplier += 0.5;
    if (this.activeEvents.has('FLASH_CRASH')) eventSpawnMultiplier += 1.0;

    // Use AI multiplier if provided, otherwise fallback to standard difficulty
    const effectiveMultiplier = Math.max(0.01, spawnRateMultiplier ?? difficulty);
    const spawnThreshold =
      config.baseInterval /
      (effectiveMultiplier * eventSpawnMultiplier * response.spawnMultiplier);

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
          rsiState,
          enemyModifier,
          response
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
    whaleTier: WhaleTier,
    pool: IPoolManager,
    difficulty: number,
    position: MarketPosition,
    width: number,
    height: number,
    maxEnemies: number,
    deltaTime: number,
    damageMultiplier: number,
    speedMultiplier: number,
    eventIntensity: number,
    rsiModifier: RSIEnemyModifier,
    response: EnemyResponseProfile
  ) {
    const whaleConfig = WHALE_TIER_CONFIGS[whaleTier];
    if (!whaleConfig) return;

    const eventBoost = eventIntensity > 0 ? 5.0 : 1.0;
    const frameTargetMs = 16.66;
    const probPerFrame =
      whaleConfig.spawnChance *
      ENEMY_SPAWN.WHALE_PROBABILITY_MODIFIER *
      eventBoost *
      (deltaTime / frameTargetMs);

    // Count active whales (avoid .filter() allocation in hot path)
    let activeWhales = 0;
    for (let i = 0; i < pool.activeEnemies.length; i++) {
      if (pool.activeEnemies[i]!.type === 'whale') activeWhales++;
    }

    if (
      this.whaleCooldownTimer <= 0 &&
      Math.random() < probPerFrame &&
      pool.activeEnemies.length < maxEnemies &&
      activeWhales < SpawnSystem.MAX_ACTIVE_WHALES
    ) {
      const { x, y } = this.getRandomSpawnPosition(width, height);
      pool.getWhaleEnemy(
        x,
        y,
        difficulty,
        position,
        whaleTier,
        damageMultiplier * response.damageMultiplier,
        speedMultiplier * response.speedMultiplier,
        rsiModifier,
        response.hpMultiplier,
        'boss',
        response.powerTier
      );
      this.whaleCooldownTimer = 20000;
    }
  }

  private attackCooldownTimer: number = 0;
  private static readonly ATTACK_51_COOLDOWN_MS = 60000; // 60s cooldown

  private spawnRegularEnemy(
    pool: IPoolManager,
    difficulty: number,
    position: MarketPosition,
    pnl: number,
    width: number,
    height: number,
    damageMultiplier: number,
    speedMultiplier: number,
    rsiState: RSIState,
    rsiModifier: RSIEnemyModifier,
    response: EnemyResponseProfile
  ) {
    const { x, y } = this.getRandomSpawnPosition(width, height);
    const roll = Math.random();
    let enemyType: EnemyId = 'bear';
    let canAdaptEnemyType = true;

    if (this.activeEvents.has('FLASH_CRASH')) {
      // Flash Crash: liquidators + fud + flash_loan
      enemyType = roll < 0.5 ? 'liquidator' : roll < 0.75 ? 'fud' : 'flash_loan';
      canAdaptEnemyType = false;
    } else if (this.activeEvents.has('VOLUME_SPIKE') && roll < 0.25) {
      // Volume Spike: chance for sandwich pair spawn
      this.spawnSandwichPair(
        pool,
        difficulty,
        position,
        width,
        height,
        damageMultiplier * response.damageMultiplier,
        speedMultiplier * response.speedMultiplier,
        rsiModifier,
        response
      );
      return;
    } else if (
      (rsiState === 'OVERSOLD' && this.rsiSpawnCooldownTimer <= 0) ||
      (position === MarketPosition.LONG && pnl < 0)
    ) {
      if (rsiState === 'OVERSOLD') {
        this.rsiSpawnCooldownTimer = SpawnSystem.RSI_SPAWN_COOLDOWN_MS;
      }
      enemyType =
        roll < 0.45
          ? 'bear'
          : roll < 0.65
            ? 'fud'
            : roll < 0.8
              ? 'liquidator'
              : 'mev_bot';
    } else if (
      (rsiState === 'OVERBOUGHT' && this.rsiSpawnCooldownTimer <= 0) ||
      (position === MarketPosition.SHORT && pnl < 0)
    ) {
      if (rsiState === 'OVERBOUGHT') {
        this.rsiSpawnCooldownTimer = SpawnSystem.RSI_SPAWN_COOLDOWN_MS;
      }
      enemyType =
        roll < 0.4 ? 'bull' : roll < 0.6 ? 'pumpdump' : roll < 0.75 ? 'rsi' : 'rugpull';
    } else {
      // Neutral spawns — mix in new types
      enemyType =
        roll < 0.3
          ? 'bear'
          : roll < 0.55
            ? 'bull'
            : roll < 0.7
              ? 'fud'
              : roll < 0.8
                ? 'pumpdump'
                : roll < 0.88
                  ? 'mev_bot'
                  : roll < 0.94
                    ? 'rugpull'
                    : 'flash_loan';
    }

    if (canAdaptEnemyType) {
      enemyType = this.selectAdaptiveEnemyType(enemyType, roll, response);
    }
    const responseDamageMultiplier = damageMultiplier * response.damageMultiplier;
    const responseSpeedMultiplier = speedMultiplier * response.speedMultiplier;

    // Ultra-rare 51% Attack boss spawn (difficulty >= 5)
    if (difficulty >= 5 && this.attackCooldownTimer <= 0 && Math.random() < 0.008) {
      let has51Attack = false;
      for (let i = 0; i < pool.activeEnemies.length; i++) {
        if (pool.activeEnemies[i]!.type === '51_attack') {
          has51Attack = true;
          break;
        }
      }
      if (!has51Attack) {
        const bossPos = this.getRandomSpawnPosition(width, height);
        pool.getEnemy(
          bossPos.x,
          bossPos.y,
          difficulty,
          position,
          '51_attack',
          undefined,
          responseDamageMultiplier,
          responseSpeedMultiplier,
          rsiModifier,
          response.hpMultiplier,
          'boss',
          response.powerTier
        );
        this.attackCooldownTimer = SpawnSystem.ATTACK_51_COOLDOWN_MS;
        Logger.info('[SpawnSystem] 51% Attack boss spawned!');
      }
    }

    pool.getEnemy(
      x,
      y,
      difficulty,
      position,
      enemyType,
      undefined,
      responseDamageMultiplier,
      responseSpeedMultiplier,
      rsiModifier,
      response.hpMultiplier,
      this.resolveEnemyIntent(enemyType, response),
      response.powerTier
    );
  }

  /**
   * Spawns a Sandwich Attack pair from opposite sides of the screen
   */
  private spawnSandwichPair(
    pool: IPoolManager,
    difficulty: number,
    position: MarketPosition,
    width: number,
    height: number,
    damageMultiplier: number,
    speedMultiplier: number,
    rsiModifier: RSIEnemyModifier,
    response: EnemyResponseProfile
  ) {
    // Spawn from opposite edges
    const isHorizontal = Math.random() > 0.5;
    const safeOffset = Math.max(
      ENEMY_SPAWN.SPAWN_DISTANCE,
      ENEMY_SPAWN.MIN_SAFE_OFFSET
    );

    let x1: number, y1: number, x2: number, y2: number;

    if (isHorizontal) {
      const randomY = Math.random() * height;
      x1 = -safeOffset;
      y1 = randomY;
      x2 = width + safeOffset;
      y2 = randomY;
    } else {
      const randomX = Math.random() * width;
      x1 = randomX;
      y1 = -safeOffset;
      x2 = randomX;
      y2 = height + safeOffset;
    }

    pool.getEnemy(
      x1,
      y1,
      difficulty,
      position,
      'sandwich',
      undefined,
      damageMultiplier,
      speedMultiplier,
      rsiModifier,
      response.hpMultiplier,
      'counter',
      response.powerTier
    );
    pool.getEnemy(
      x2,
      y2,
      difficulty,
      position,
      'sandwich',
      undefined,
      damageMultiplier,
      speedMultiplier,
      rsiModifier,
      response.hpMultiplier,
      'counter',
      response.powerTier
    );
  }

  private resolveEnemyResponse(
    marketSignals?: SpawnMarketSignals
  ): EnemyResponseProfile {
    const playerPower = this.clamp01(marketSignals?.playerPower ?? 0);
    const offensePower = this.clamp01(marketSignals?.offensePower ?? playerPower);
    const counterPressure = this.clamp01(
      marketSignals?.counterPressure ?? playerPower * 0.65
    );
    const rangedPressure = this.clamp01(marketSignals?.rangedPressure ?? 0);
    const screenPressure = this.clamp01(marketSignals?.screenPressure ?? 0);

    const profile = this.enemyResponse;
    profile.playerPower = playerPower;
    profile.offensePower = offensePower;
    profile.counterPressure = counterPressure;
    profile.rangedPressure = rangedPressure;
    profile.screenPressure = screenPressure;
    profile.spawnMultiplier = this.clamp(
      1 + counterPressure * 0.24 - screenPressure * 0.18,
      0.82,
      1.24
    );
    profile.hpMultiplier = this.clamp(
      1 + playerPower * 0.42 + offensePower * 0.28 - screenPressure * 0.1,
      0.9,
      1.7
    );
    profile.speedMultiplier = this.clamp(1 + counterPressure * 0.16, 0.95, 1.16);
    profile.damageMultiplier = this.clamp(1 + counterPressure * 0.12, 0.95, 1.12);
    profile.intent =
      rangedPressure > 0.62
        ? 'ranged'
        : counterPressure > 0.58
          ? 'counter'
          : playerPower > 0.36
            ? 'pressure'
            : 'fodder';
    profile.powerTier = Math.min(3, Math.floor(playerPower * 4));

    return profile;
  }

  private selectAdaptiveEnemyType(
    baseType: EnemyId,
    roll: number,
    response: EnemyResponseProfile
  ): EnemyId {
    if (response.rangedPressure > 0.7) {
      if (roll > 0.84) return 'mev_bot';
      if (roll > 0.72) return 'rsi';
    }

    if (response.counterPressure > 0.68) {
      if (roll > 0.9) return 'flash_loan';
      if (roll > 0.82) return 'rugpull';
      if (roll > 0.74) return 'sandwich';
    }

    if (response.playerPower > 0.58 && roll > 0.88) return 'pumpdump';

    return baseType;
  }

  private resolveEnemyIntent(
    enemyType: EnemyId,
    response: EnemyResponseProfile
  ): EnemyIntent {
    if (
      enemyType === 'whale' ||
      enemyType === 'market_maker' ||
      enemyType === '51_attack'
    ) {
      return 'boss';
    }

    if (
      response.intent === 'ranged' &&
      (enemyType === 'rsi' || enemyType === 'mev_bot')
    ) {
      return 'ranged';
    }

    if (
      enemyType === 'liquidator' ||
      enemyType === 'rugpull' ||
      enemyType === 'flash_loan' ||
      enemyType === 'sandwich'
    ) {
      return 'counter';
    }

    return response.intent;
  }

  private resolveRSIState(marketSignals?: SpawnMarketSignals): RSIState {
    const nextRSIState = marketSignals?.rsiState;

    if (
      nextRSIState === 'OVERSOLD' ||
      nextRSIState === 'NEUTRAL' ||
      nextRSIState === 'OVERBOUGHT'
    ) {
      this.previousRSIState = nextRSIState;
      return nextRSIState;
    }

    const resolved = getRSIStateWithHysteresis(
      marketSignals?.rsi ?? 50,
      this.previousRSIState
    );
    this.previousRSIState = resolved;
    return resolved;
  }

  private resolveWhaleTier(whaleTier?: number): WhaleTier {
    if (
      whaleTier === WhaleTier.NONE ||
      whaleTier === WhaleTier.BABY_WHALE ||
      whaleTier === WhaleTier.WHALE ||
      whaleTier === WhaleTier.MEGA_WHALE
    ) {
      return whaleTier;
    }

    return WhaleTier.NONE;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private clamp01(value: number): number {
    return this.clamp(value, 0, 1);
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
    this.whaleCooldownTimer = 0;
    this.activeEvents.clear();
    this.pendingGatekeeperSpawn = null;
    this.previousRSIState = 'NEUTRAL';
    this.rsiSpawnCooldownTimer = 0;
    this.attackCooldownTimer = 0;
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
