import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpawnSystem } from '../../services/SpawnSystem';
import { type IPoolManager } from '../../services/interfaces/IPoolManager';
import { MarketPosition } from '../../types';
import { marketStateService } from '../../services/MarketStateService';

// Mock dependencies
vi.mock('../../services/MarketStateService', () => ({
  marketStateService: {
    getState: vi.fn(),
  },
}));

vi.mock('../../services/Logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../stores/admin/configStore', () => ({
  useAdminConfigStore: {
    getState: vi.fn(() => ({
      config: {
        spawn: {
          baseInterval: 1000,
          maxEnemies: 100,
          waveIntensity: 0.5,
        },
      },
    })),
  },
}));

const mockPool: IPoolManager = {
  activeEnemies: [],
  getEnemy: vi.fn(),
  getWhaleEnemy: vi.fn(),
  getBullet: vi.fn(),
  getParticle: vi.fn(),
  getFloatingText: vi.fn(),
  getGem: vi.fn(),
  reset: vi.fn(),
  update: vi.fn(),
  draw: vi.fn(),
  initialize: vi.fn(),
} as any;

describe('SpawnSystem', () => {
  let spawnSystem: SpawnSystem;

  beforeEach(() => {
    vi.clearAllMocks();
    spawnSystem = new SpawnSystem();
    (mockPool as any).activeEnemies = [];
    (marketStateService.getState as any).mockReturnValue({ whaleTier: 0 });
  });

  it('should not spawn if timer is below threshold', () => {
    // 100ms delta, threshold around 1000ms
    spawnSystem.update(100, 1.0, 800, 600, MarketPosition.LONG, mockPool);
    expect(mockPool.getEnemy).not.toHaveBeenCalled();
  });

  it('should spawn regular enemy when threshold reached', () => {
    // Large delta to exceed threshold (1000ms)
    // scaledDifficulty=1. threshold = 1000/1 = 1000
    // Passed 1100ms
    spawnSystem.update(1100, 1.0, 800, 600, MarketPosition.LONG, mockPool);
    expect(mockPool.getEnemy).toHaveBeenCalled();
  });

  it('should respect max enemies limit', () => {
    // Fill enemies
    const enemies = new Array(100).fill({});
    (mockPool as any).activeEnemies = enemies;

    spawnSystem.update(1100, 1.0, 800, 600, MarketPosition.LONG, mockPool);
    expect(mockPool.getEnemy).not.toHaveBeenCalled();
  });

  it('should spawn whales if whaleTier > 0', () => {
    (marketStateService.getState as any).mockReturnValue({ whaleTier: 1 });
    // This is probabilistic, so mock Math.random to ensure it spawns
    vi.spyOn(Math, 'random').mockReturnValue(0.001); // < config.spawnChance (0.2 * 0.01 = 0.002)

    spawnSystem.update(16, 1.0, 800, 600, MarketPosition.LONG, mockPool);

    expect(mockPool.getWhaleEnemy).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(String),
      1 // tier
    );
  });

  it('should select enemy type based on market sentiment (Thematic)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // < 0.7 (Thematic spawn)

    // LONG + Loss = Bear
    spawnSystem.update(1100, 1.0, 800, 600, MarketPosition.LONG, mockPool, -100);
    expect(mockPool.getEnemy).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(String),
      'bear'
    );

    // LONG + Profit = Bull
    spawnSystem.update(1100, 1.0, 800, 600, MarketPosition.LONG, mockPool, 100);
    expect(mockPool.getEnemy).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(String),
      'bull'
    );
  });

  it('should spawn random variants', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.8); // > 0.7 (Random spawn)

    // Mock the second random call for variant selection
    // Math.random is called again.
    // We already mocked it to return 0.8 fixed.
    // Logic: if (0.8 < 0.7) -> false -> else branch.
    // Inside else: random(). if < 0.4 ... else if < 0.7 ... else ...
    // Since mock returns 0.8 constantly, 0.8 >= 0.7. So it should spawn 'pumpdump' (last else)

    spawnSystem.update(1100, 1.0, 800, 600, MarketPosition.LONG, mockPool);

    expect(mockPool.getEnemy).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(String),
      'pumpdump'
    );
  });
});
