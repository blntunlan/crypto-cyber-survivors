import { type MarketPosition } from '../types';
import { type PoolManager } from './poolManager';
import { GAME_ENGINE } from '../constants';

export class SpawnSystem {
  public static update(
    deltaTime: number,
    spawnTimer: number,
    difficulty: number,
    width: number,
    height: number,
    position: MarketPosition,
    pool: PoolManager,
    maxEnemies: number = 150
  ): number {
    let newTimer = spawnTimer + deltaTime;

    const scaledDifficulty = 1 + (difficulty - 1) * GAME_ENGINE.SPAWN_DIFFICULTY_SCALE;

    // Check enemy limit before spawning
    if (
      pool.activeEnemies.length < maxEnemies &&
      newTimer > GAME_ENGINE.SPAWN_TIMER_BASE / scaledDifficulty
    ) {
      const { x, y } = this.getRandomSpawnPosition(width, height);
      pool.getEnemy(x, y, difficulty, position);
      newTimer = 0;
    } else if (newTimer > GAME_ENGINE.SPAWN_TIMER_BASE / scaledDifficulty) {
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
