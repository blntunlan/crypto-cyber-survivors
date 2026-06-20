import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpawnSystem } from '../../services/combat/SpawnSystem';
import { type IPoolManager } from '../../services/interfaces/IPoolManager';
import { MarketPosition } from '../../types';

vi.mock('../../services/system/Logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
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
    SpawnSystem.resetInstance();
    spawnSystem = SpawnSystem.getInstance();
    (mockPool as any).activeEnemies = [];
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

  it('should scale spawn rate with difficulty', () => {
    const difficulty = 3;
    const threshold = 1000 / difficulty; // baseInterval=1000, so threshold is 333.3ms

    // Just under threshold
    spawnSystem.update(
      threshold - 10,
      difficulty,
      800,
      600,
      MarketPosition.LONG,
      mockPool
    );
    expect(mockPool.getEnemy).not.toHaveBeenCalled();

    // Just over threshold
    spawnSystem.update(20, difficulty, 800, 600, MarketPosition.LONG, mockPool);
    expect(mockPool.getEnemy).toHaveBeenCalled();
  });

  it('should spawn at off-screen positions', () => {
    const difficulty = 1;
    const width = 800;
    const height = 600;

    spawnSystem.update(1100, difficulty, width, height, MarketPosition.LONG, mockPool);

    expect(mockPool.getEnemy).toHaveBeenCalled();
    const args = vi.mocked(mockPool.getEnemy).mock.calls[0]!;
    const x = args[0] as number;
    const y = args[1] as number;

    const outside = x < 0 || x > width || y < 0 || y > height;
    expect(outside).toBe(true);
  });

  it('should spawn whales if whaleTier > 0', () => {
    // This is probabilistic, so mock Math.random to ensure it spawns
    vi.spyOn(Math, 'random').mockReturnValue(0.001); // < config.spawnChance (0.2 * 0.01 = 0.002)

    spawnSystem.update(
      16,
      1.0,
      800,
      600,
      MarketPosition.LONG,
      mockPool,
      0,
      undefined,
      undefined,
      'BTC',
      1.0,
      1.0,
      {
        whaleTier: 1,
      }
    );

    expect(mockPool.getWhaleEnemy).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(String),
      1, // tier
      expect.any(Number), // damageMultiplier
      expect.any(Number), // speedMultiplier
      expect.any(Object), // rsiModifier
      expect.any(Number), // hpMultiplier
      expect.any(String), // intent
      expect.any(Number) // powerTier
    );
  });

  it('should select enemy type based on market sentiment (Thematic)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.4); // < 0.45 for bear, < 0.55 for bull

    // LONG + Loss = Bear
    spawnSystem.update(1100, 1.0, 800, 600, MarketPosition.LONG, mockPool, -100);
    expect(mockPool.getEnemy).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(String),
      'bear',
      undefined,
      expect.any(Number), // damageMultiplier
      expect.any(Number), // speedMultiplier
      expect.any(Object), // rsiModifier
      expect.any(Number), // hpMultiplier
      expect.any(String), // intent
      expect.any(Number) // powerTier
    );

    // LONG + Profit = Bull
    spawnSystem.update(1100, 1.0, 800, 600, MarketPosition.LONG, mockPool, 100);
    expect(mockPool.getEnemy).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(String),
      'bull',
      undefined,
      expect.any(Number), // damageMultiplier
      expect.any(Number), // speedMultiplier
      expect.any(Object), // rsiModifier
      expect.any(Number), // hpMultiplier
      expect.any(String), // intent
      expect.any(Number) // powerTier
    );
  });

  it('should spawn random variants', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.6); // 0.55 <= roll < 0.7 -> 'fud'

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
      'fud', // 0.8 is < 0.85
      undefined,
      expect.any(Number), // damageMultiplier
      expect.any(Number), // speedMultiplier
      expect.any(Object), // rsiModifier
      expect.any(Number), // hpMultiplier
      expect.any(String), // intent
      expect.any(Number) // powerTier
    );
  });

  it('should scale enemies from player power signals', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.95);

    spawnSystem.update(
      1100,
      1.0,
      800,
      600,
      MarketPosition.LONG,
      mockPool,
      0,
      undefined,
      undefined,
      'BTC',
      1.0,
      1.0,
      {
        playerPower: 0.9,
        offensePower: 0.85,
        counterPressure: 0.8,
        rangedPressure: 0.8,
        screenPressure: 0.1,
      }
    );

    const calls = vi.mocked(mockPool.getEnemy).mock.calls;
    const call = calls[calls.length - 1]!;
    expect(call[4]).toBe('mev_bot');
    expect(call[6]).toBeGreaterThan(1);
    expect(call[7]).toBeGreaterThan(1);
    expect(call[9]).toBeGreaterThan(1);
    expect(call[10]).toBe('ranged');
    expect(call[11]).toBe(3);
  });
});
