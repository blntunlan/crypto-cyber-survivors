import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpawnSystem } from '../services/SpawnSystem';
import { type PoolManager } from '../services/poolManager';
import { MarketPosition } from '../types';
import { GAME_ENGINE } from '../constants';

describe('SpawnSystem', () => {
  let mockPool: any;

  beforeEach(() => {
    mockPool = {
      getEnemy: vi.fn(),
      activeEnemies: [], // Mock active enemies array for limit check
    };
  });

  it('should increment timer by deltaTime', () => {
    const deltaTime = 16.6;
    const initialTimer = 0;
    const result = SpawnSystem.update(
      deltaTime,
      initialTimer,
      1,
      800,
      600,
      MarketPosition.LONG,
      mockPool as PoolManager
    );

    expect(result).toBe(16.6);
    expect(mockPool.getEnemy).not.toHaveBeenCalled();
  });

  it('should spawn enemy and reset timer when threshold reached', () => {
    const difficulty = 1;
    // scaledDifficulty = 1 + (1 - 1) * 0.5 = 1
    // threshold = 2000 / 1 = 2000
    const threshold = GAME_ENGINE.SPAWN_TIMER_BASE;
    const deltaTime = threshold + 10;
    const initialTimer = 0;

    const result = SpawnSystem.update(
      deltaTime,
      initialTimer,
      difficulty,
      800,
      600,
      MarketPosition.LONG,
      mockPool as PoolManager
    );

    expect(result).toBe(0);
    expect(mockPool.getEnemy).toHaveBeenCalled();
    const callArgs = mockPool.getEnemy.mock.calls[0];
    // x, y, difficulty, position
    expect(callArgs[2]).toBe(difficulty);
    expect(callArgs[3]).toBe(MarketPosition.LONG);
  });

  it('should scale spawn rate with difficulty', () => {
    const difficulty = 3;
    // scaledDifficulty = 1 + (3 - 1) * 0.5 = 1 + 1 = 2
    // threshold = 2000 / 2 = 1000

    const scaledDifficulty = 1 + (difficulty - 1) * GAME_ENGINE.SPAWN_DIFFICULTY_SCALE;
    const threshold = GAME_ENGINE.SPAWN_TIMER_BASE / scaledDifficulty;
    expect(threshold).toBe(1000);

    // Just under threshold
    const timer1 = SpawnSystem.update(
      threshold - 10,
      0,
      difficulty,
      800,
      600,
      MarketPosition.LONG,
      mockPool as PoolManager
    );
    expect(mockPool.getEnemy).not.toHaveBeenCalled();
    expect(timer1).toBe(990);

    // Just over threshold
    const timer2 = SpawnSystem.update(
      20,
      timer1,
      difficulty,
      800,
      600,
      MarketPosition.LONG,
      mockPool as PoolManager
    );
    expect(mockPool.getEnemy).toHaveBeenCalled();
    expect(timer2).toBe(0);
  });

  it('should spawn at off-screen positions', () => {
    const difficulty = 1;
    const threshold = GAME_ENGINE.SPAWN_TIMER_BASE;
    const width = 800;
    const height = 600;
    // safeOffset now uses Math.max(SPAWN_OFFSET, 80) to cover large enemies
    const safeOffset = Math.max(GAME_ENGINE.SPAWN_OFFSET, 80);

    SpawnSystem.update(
      threshold + 1,
      0,
      difficulty,
      width,
      height,
      MarketPosition.LONG,
      mockPool as PoolManager
    );

    expect(mockPool.getEnemy).toHaveBeenCalled();
    const [x, y] = mockPool.getEnemy.mock.calls[0];

    // Check if it's on one of the 4 edges (using safeOffset)
    const onTop = y === -safeOffset && x >= 0 && x <= width;
    const onBottom = y === height + safeOffset && x >= 0 && x <= width;
    const onLeft = x === -safeOffset && y >= 0 && y <= height;
    const onRight = x === width + safeOffset && y >= 0 && y <= height;

    expect(onTop || onBottom || onLeft || onRight).toBe(true);
  });
});
