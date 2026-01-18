import { describe, it, expect, vi, beforeEach } from 'vitest';
import { spawnSystem } from '../../services/SpawnSystem';
import { MarketPosition } from '../../types';

// Mock config store
vi.mock('../../stores/admin/configStore', () => ({
  useAdminConfigStore: {
    getState: vi.fn(() => ({
      config: {
        spawn: {
          baseInterval: 1000,
          maxEnemies: 150,
          waveIntensity: 0.5,
        },
      },
    })),
  },
}));

describe('SpawnSystem Edge Cases', () => {
  let mockPool: any;

  beforeEach(() => {
    mockPool = {
      getEnemy: vi.fn(),
      activeEnemies: [],
    };
    spawnSystem.reset();
  });

  it('should not spawn when at maxEnemies limit', () => {
    // Fill pool to limit
    mockPool.activeEnemies = new Array(150).fill({});

    const result = spawnSystem.update(
      5000, // Way over threshold
      1,
      800,
      600,
      MarketPosition.LONG,
      mockPool,
      0, // PnL
      150 // maxEnemies
    );

    expect(mockPool.getEnemy).not.toHaveBeenCalled();
    expect(result).toBeCloseTo(4000, 1); // 5000 - 1000 = 4000
  });

  it('should handle zero or negative deltaTime gracefully', () => {
    // Set initial timer via update
    spawnSystem.update(500, 1, 800, 600, MarketPosition.LONG, mockPool);
    // Add negative delta
    const result = spawnSystem.update(-100, 1, 800, 600, MarketPosition.LONG, mockPool);
    expect(result).toBe(400); // 500 + (-100)
    expect(mockPool.getEnemy).not.toHaveBeenCalled();
  });

  it('should handle very high difficulty scaling', () => {
    // Difficulty 100
    // scaledDifficulty = 1 + (99) * 0.5 = 50.5
    // threshold = 2000 / 50.5 ~= 39ms
    const result = spawnSystem.update(
      100,
      100,
      800,
      600,
      MarketPosition.LONG,
      mockPool
    );
    expect(mockPool.getEnemy).toHaveBeenCalled();
    // scaledDifficulty = (1 + 99 * 0.5 * 1.0) * 1 = 50.5
    // threshold = 1000 / 50.5 = 19.802
    // result = 100 - 19.802 = 80.198
    expect(result).toBeCloseTo(80.198, 0.1);
  });
});
