import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpawnSystem } from '../services/SpawnSystem';
import { type PoolManager } from '../services/PoolManager';
import { MarketPosition } from '../types';
import { GAME_ENGINE } from '../constants';

// Mock MarketStateService
vi.mock('../services/MarketStateService', () => ({
  MarketStateService: {
    getState: vi.fn(),
  },
}));

// Import after mock
import { MarketStateService as marketStateService } from '../services/MarketStateService';

vi.mock('../stores/admin/configStore', () => ({
  useAdminConfigStore: {
    getState: vi.fn(() => ({
      config: {
        spawn: {
          baseInterval: 800,
          maxEnemies: 150,
          waveIntensity: 0.5,
        },
      },
    })),
  },
}));

describe('SpawnSystem', () => {
  let mockPool: any;
  let spawnSystem: SpawnSystem;

  beforeEach(() => {
    mockPool = {
      getEnemy: vi.fn(),
      activeEnemies: [], // Mock active enemies array for limit check
    };
    spawnSystem = new SpawnSystem();
    spawnSystem.reset();
  });

  it('should increment internal timer by deltaTime', () => {
    const deltaTime = 16.6;
    const result = spawnSystem.update(
      deltaTime,
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

    const result = spawnSystem.update(
      deltaTime,
      difficulty,
      800,
      600,
      MarketPosition.LONG,
      mockPool as PoolManager
    );

    expect(result).toBeCloseTo(10, 1);
    expect(mockPool.getEnemy).toHaveBeenCalled();
    const callArgs = mockPool.getEnemy.mock.calls[0];
    // x, y, difficulty, position
    expect(callArgs[2]).toBe(difficulty);
    expect(callArgs[3]).toBe(MarketPosition.LONG);
  });

  it('should scale spawn rate with difficulty', () => {
    const difficulty = 3;
    // scaledDifficulty = 1 + (difficulty - 1) * SPAWN_DIFFICULTY_SCALE
    // threshold = SPAWN_TIMER_BASE / scaledDifficulty

    const scaledDifficulty = 1 + (difficulty - 1) * GAME_ENGINE.SPAWN_DIFFICULTY_SCALE;
    const threshold = GAME_ENGINE.SPAWN_TIMER_BASE / scaledDifficulty;

    // Dynamic check instead of hardcoded value
    expect(scaledDifficulty).toBeGreaterThan(1);
    expect(threshold).toBeLessThan(GAME_ENGINE.SPAWN_TIMER_BASE);

    // Just under threshold
    const timer1 = spawnSystem.update(
      threshold - 10,
      difficulty,
      800,
      600,
      MarketPosition.LONG,
      mockPool as PoolManager
    );
    expect(mockPool.getEnemy).not.toHaveBeenCalled();
    expect(timer1).toBeCloseTo(threshold - 10, 1);

    // Just over threshold
    const timer2 = spawnSystem.update(
      20,
      difficulty,
      800,
      600,
      MarketPosition.LONG,
      mockPool as PoolManager
    );
    expect(mockPool.getEnemy).toHaveBeenCalled();
    expect(timer2).toBeLessThan(20.1);
  });

  it('should spawn at off-screen positions', () => {
    const difficulty = 1;
    const threshold = GAME_ENGINE.SPAWN_TIMER_BASE;
    const width = 800;
    const height = 600;
    const safeOffset = Math.max(GAME_ENGINE.SPAWN_OFFSET, 80);

    spawnSystem.update(
      threshold + 1,
      difficulty,
      width,
      height,
      MarketPosition.LONG,
      mockPool as PoolManager
    );

    expect(mockPool.getEnemy).toHaveBeenCalled();
    const args = mockPool.getEnemy.mock.calls[0];
    const x = args[0];
    const y = args[1];

    const onTop = y === -safeOffset && x >= 0 && x <= width;
    const onBottom = y === height + safeOffset && x >= 0 && x <= width;
    const onLeft = x === -safeOffset && y >= 0 && y <= height;
    const onRight = x === width + safeOffset && y >= 0 && y <= height;

    expect(onTop || onBottom || onLeft || onRight).toBe(true);
  });

  describe('Market and Whale Spawn Logic', () => {
    beforeEach(() => {
      vi.mocked(marketStateService.getState).mockReturnValue(undefined);
      vi.spyOn(Math, 'random').mockReturnValue(0.5); // Default neutral random
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should scale spawn rate based on difficulty', () => {
      const baseInterval = GAME_ENGINE.SPAWN_TIMER_BASE;

      // Difficulty = 3.0 (Hard)
      // scaledDifficulty = 1 + (3 - 1) * 0.5 * 1.0 = 2.0
      const diff = 3;
      const result = spawnSystem.update(
        baseInterval / 2 + 10,
        diff,
        800,
        600,
        MarketPosition.LONG,
        mockPool as PoolManager
      );

      expect(mockPool.getEnemy).toHaveBeenCalled();
      expect(result).toBeCloseTo(10, 1);
    });

    it('should respect max enemies limit', () => {
      const maxEnemies = 100;
      mockPool.activeEnemies = new Array(100); // At cap

      spawnSystem.update(
        10000,
        1,
        800,
        600,
        MarketPosition.LONG,
        mockPool as PoolManager,
        0, // PnL
        maxEnemies
      );

      expect(mockPool.getEnemy).not.toHaveBeenCalled();
    });

    it('should spawn whale when whaleTier > 0 and random hits', () => {
      vi.mocked(marketStateService.getState).mockReturnValue({
        whaleTier: 2, // WHALE
      } as any);

      // Mock random to be very low (hits the spawnChance)
      vi.spyOn(Math, 'random').mockReturnValue(0.00001);
      mockPool.getWhaleEnemy = vi.fn();

      spawnSystem.update(16, 1, 800, 600, MarketPosition.LONG, mockPool as PoolManager);

      expect(mockPool.getWhaleEnemy).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        1,
        MarketPosition.LONG,
        2,
        1,
        1
      );
    });

    it('should not spawn whale when random misses', () => {
      vi.mocked(marketStateService.getState).mockReturnValue({
        whaleTier: 2,
      } as any);

      vi.spyOn(Math, 'random').mockReturnValue(0.99);
      mockPool.getWhaleEnemy = vi.fn();

      spawnSystem.update(16, 1, 800, 600, MarketPosition.LONG, mockPool as PoolManager);

      expect(mockPool.getWhaleEnemy).not.toHaveBeenCalled();
    });
  });
});
