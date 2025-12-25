import { type MarketPosition } from '../types';
import { type PoolManager } from './PoolManager';
import { GAME_ENGINE } from '../constants';
import { useAdminConfigStore } from '../stores/admin/configStore';

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
    maxEnemiesOverride?: number
  ): number {
    // Get config from Admin Dashboard
    const spawnConfig = this.getSpawnConfig();

    // Use admin config values with fallbacks
    const baseInterval = spawnConfig.baseInterval;
    const maxEnemies = maxEnemiesOverride ?? spawnConfig.maxEnemies;
    const waveIntensity = spawnConfig.waveIntensity;

    let newTimer = spawnTimer + deltaTime;

    // Apply wave intensity to difficulty scaling
    const intensityMultiplier = 0.5 + waveIntensity; // 0.5 to 1.5x
    const scaledDifficulty =
      1 + (difficulty - 1) * GAME_ENGINE.SPAWN_DIFFICULTY_SCALE * intensityMultiplier;

    // Check enemy limit before spawning
    if (pool.activeEnemies.length < maxEnemies && newTimer > baseInterval / scaledDifficulty) {
      const { x, y } = this.getRandomSpawnPosition(width, height);
      pool.getEnemy(x, y, difficulty, position);
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
