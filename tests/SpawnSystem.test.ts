import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpawnSystem } from '../services/SpawnSystem';
import { type PoolManager } from '../services/PoolManager';
import { MarketPosition } from '../types';

// Mock MarketIndicatorService
vi.mock('../services/indicators/MarketIndicatorService', () => ({
  marketIndicatorService: {
    getState: vi.fn(),
  },
}));

// Import after mock
import { marketIndicatorService } from '../services/indicators/MarketIndicatorService';

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
    vi.mocked(marketIndicatorService.getState).mockReturnValue({
      spawnRateMultiplier: 1.0,
      whaleTier: 0,
      rsiState: 'NEUTRAL',
      isInitialized: true,
    } as any);
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
    // threshold = 800 / 1 = 800
    const threshold = 800;
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
    expect(callArgs[2]).toBe(difficulty);
    expect(callArgs[3]).toBe(MarketPosition.LONG);
  });

  it('should scale spawn rate with difficulty', () => {
    const difficulty = 3;
    const threshold = 800 / difficulty; // 266.6ms

    expect(threshold).toBeLessThan(800);

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
    const width = 800;
    const height = 600;

    spawnSystem.update(
      801,
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

    // Check bounds (simplified)
    const outside = x < 0 || x > width || y < 0 || y > height;
    expect(outside).toBe(true);
  });

  describe('Market and Whale Spawn Logic', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should respect max enemies limit', () => {
      mockPool.activeEnemies = new Array(150);
      spawnSystem.update(
        5000,
        1,
        800,
        600,
        MarketPosition.LONG,
        mockPool as PoolManager,
        0,
        150
      );
      expect(mockPool.getEnemy).not.toHaveBeenCalled();
    });

    it('should spawn whale when whaleTier > 0 and random hits', () => {
      vi.mocked(marketIndicatorService.getState).mockReturnValue({
        whaleTier: 2,
      } as any);

      vi.spyOn(Math, 'random').mockReturnValue(0.00001);
      mockPool.getWhaleEnemy = vi.fn();

      spawnSystem.update(16, 1, 800, 600, MarketPosition.LONG, mockPool as PoolManager);
      expect(mockPool.getWhaleEnemy).toHaveBeenCalled();
    });
  });
});
