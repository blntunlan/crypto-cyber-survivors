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
    // Burst logic consumes time up to 5 times or until threshold
    // 5000 initial. Threshold 1000.
    // Loop 1: 4000 (Burst 1)
    // Loop 2: 3000 (Burst 2)
    // Loop 3: 2000 (Burst 3)
    // Loop 4: 1000 (Burst 4)
    // Loop stops as 1000 is not > 1000
    expect(result).toBeCloseTo(1000, 1);
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
    // scaledDifficulty = 1 + (99) * 0.5 * 1.0 = 50.5
    // threshold = 1000 / 50.5 ~= 19.802 ms
    const result = spawnSystem.update(
      100,
      100,
      800,
      600,
      MarketPosition.LONG,
      mockPool
    );
    expect(mockPool.getEnemy).toHaveBeenCalled();

    // Burst will trigger multiple spawns
    // 100 / 19.802 ~= 5.05 spawns
    // Burst cap is 5
    // Consumed = 5 * 19.802 = 99.01
    // Remaining = 100 - 99.01 = 0.99
    expect(result).toBeCloseTo(0.99, 0.1);
  });
});
