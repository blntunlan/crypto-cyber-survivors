import { MarketPosition } from '../types';
import { type PoolManager } from './PoolManager';
import { GAME_ENGINE } from '../constants';
import { useAdminConfigStore } from '../stores/admin/configStore';
import { marketStateService } from './MarketStateService';
import { WHALE_TIER_CONFIGS } from '../types/indicators';

export class SpawnSystem {
  /**
   * Get spawn config from Admin Dashboard (if available)
   */
  private static getSpawnConfig(): {
    baseInterval: number;
    maxEnemies: number;
    waveIntensity: number;
  } {
    try {
      const store = useAdminConfigStore.getState();
      return store.config.spawn;
    } catch {
      // Fallback to defaults if store not available
      return {
        baseInterval: GAME_ENGINE.SPAWN_TIMER_BASE,
        maxEnemies: 150,
        waveIntensity: 0.5,
      };
    }
  }

  public static update(
    deltaTime: number,
    spawnTimer: number,
    difficulty: number,
    width: number,
    height: number,
    position: MarketPosition,
    pool: PoolManager,
    pnl: number = 0,
    maxEnemiesOverride?: number
  ): number {
    // Get config from Admin Dashboard
    const spawnConfig = this.getSpawnConfig();

    // Use admin config values with fallbacks
    const baseInterval = spawnConfig.baseInterval;
    const maxEnemies = maxEnemiesOverride ?? spawnConfig.maxEnemies;
    const waveIntensity = spawnConfig.waveIntensity;

    // Get market-based spawn rate multiplier (ATR-based) from server state
    const marketState = marketStateService.getState();
    const marketSpawnMultiplier = marketState?.spawnRateMultiplier ?? 1.0;

    let newTimer = spawnTimer + deltaTime;

    // Apply wave intensity and market multiplier to difficulty scaling
    const intensityMultiplier = 0.5 + waveIntensity; // 0.5 to 1.5x
    const scaledDifficulty =
      1 +
      (difficulty - 1) *
        GAME_ENGINE.SPAWN_DIFFICULTY_SCALE *
        intensityMultiplier *
        marketSpawnMultiplier;

    // Calculate effective max enemies based on spawn multiplier
    // Prevent too many enemies when spawn rate is very high
    const effectiveMaxEnemies =
      marketSpawnMultiplier > 1.5
        ? Math.min(maxEnemies, Math.floor(maxEnemies * 0.8)) // 80% cap during chaos
        : maxEnemies;

    // Check for whale spawn opportunity (Server-side indicators)
    if (marketState && marketState.whaleTier > 0) {
      // Use local cooldown check or just simple random chance based on config
      // The server will sustain the 'whaleTier' state as long as volume is high
      // We rely on random chance to prevent spamming, similar to legacy logic
      const config = WHALE_TIER_CONFIGS[marketState.whaleTier];

      if (config) {
        // We need a way to limit spawn rate locally since server state might persist for seconds
        // Using a very low probability check per frame:
        // Assuming 60 FPS, a 0.1% chance is ~once per 16 seconds
        const spawnChancePerFrame = config.spawnChance * 0.01;

        if (
          Math.random() < spawnChancePerFrame &&
          pool.activeEnemies.length < effectiveMaxEnemies
        ) {
          const { x, y } = this.getRandomSpawnPosition(width, height);
          pool.getWhaleEnemy(x, y, difficulty, position, marketState.whaleTier);
          // No need to record spawn locally for logic's sake, as we don't manage global cooldown anymore
          // But we could emit an event for UI if needed
        }
      }
    }

    // Regular enemy spawn
    // Determine enemy type based on PnL + Position
    // LONG + negative PnL = Bear market = spawn Bear
    // LONG + positive PnL = Bull market = spawn Bull
    // SHORT + negative PnL = Bull market = spawn Bull
    // SHORT + positive PnL = Bear market = spawn Bear
    const isBearMarket =
      (position === MarketPosition.LONG && pnl < 0) ||
      (position === MarketPosition.SHORT && pnl > 0);
    const enemyType = isBearMarket ? 'bear' : 'bull';

    if (
      pool.activeEnemies.length < effectiveMaxEnemies &&
      newTimer > baseInterval / scaledDifficulty
    ) {
      const { x, y } = this.getRandomSpawnPosition(width, height);
      pool.getEnemy(x, y, difficulty, position, enemyType);
      newTimer = 0;
    } else if (newTimer > baseInterval / scaledDifficulty) {
      // Reset timer even if at limit, so spawning resumes immediately when enemies die
      newTimer = 0;
    }
    return newTimer;
  }

  private static getRandomSpawnPosition(width: number, height: number) {
    const edge = Math.floor(Math.random() * 4);
    // Use larger offset to ensure even big enemies spawn fully off-screen
    // This prevents "jumpscare" from enemies appearing partially visible
    const baseOffset = GAME_ENGINE.SPAWN_OFFSET;
    const safeOffset = Math.max(baseOffset, 80); // At least 80px to cover largest enemies
    let x = 0,
      y = 0;

    if (edge === 0) {
      // Top edge
      x = Math.random() * width;
      y = -safeOffset;
    } else if (edge === 1) {
      // Bottom edge
      x = Math.random() * width;
      y = height + safeOffset;
    } else if (edge === 2) {
      // Left edge
      x = -safeOffset;
      y = Math.random() * height;
    } else {
      // Right edge
      x = width + safeOffset;
      y = Math.random() * height;
    }

    return { x, y };
  }
}
