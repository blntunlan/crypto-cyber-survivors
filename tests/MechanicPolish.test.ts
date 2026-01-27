import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CollectionSystem } from '../services/combat/physics/CollectionSystem';
import { type Player, type GameState } from '../types';
import { type Gem } from '../types';
import { type BuffGem } from '../types/BuffGem';

// Mock dependencies
vi.mock('../services/audio', () => ({
  audio: { playGem: vi.fn(), playHit: vi.fn(), playCrit: vi.fn() },
}));

vi.mock('../services/core/EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(() => vi.fn()) },
}));

describe('Mechanic Polish: Magnet Delay', () => {
  let collectionSystem: CollectionSystem;
  let mockPlayer: Player;
  let mockState: GameState;
  let mockPool: any;

  beforeEach(() => {
    vi.useFakeTimers();
    collectionSystem = new CollectionSystem();

    mockPlayer = {
      x: 400,
      y: 300,
      radius: 10,
      magnet: 100,
      exp: 0,
      nextLevelExp: 100,
      level: 1,
    } as any;

    mockState = {
      levelUpFreeze: 0,
      shake: 0,
    } as any;

    mockPool = {
      activeGems: [],
      activeParticles: [],
      getFloatingText: vi.fn(),
      getParticle: vi.fn(() => ({})),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should NOT magnetize standard gems during the initial delay', () => {
    const gem: Partial<Gem> = {
      x: 450,
      y: 300,
      radius: 5,
      active: true,
      magnetized: false,
      elapsedLifetime: 100, // 100ms < 350ms delay
    };
    mockPool.activeGems = [gem];

    collectionSystem.update(mockPool, mockPlayer, mockState, 1);

    expect(gem.magnetized).toBe(false);
  });

  it('should magnetize standard gems after the delay', () => {
    const gem: Partial<Gem> = {
      x: 450,
      y: 300,
      radius: 5,
      active: true,
      magnetized: false,
      elapsedLifetime: 400, // 400ms > 350ms delay
    };
    mockPool.activeGems = [gem];

    collectionSystem.update(mockPool, mockPlayer, mockState, 1);

    expect(gem.magnetized).toBe(true);
  });

  it('should NOT pull buff gems during the initial delay', () => {
    const buffGem: Partial<BuffGem> = {
      x: 450,
      y: 300,
      radius: 10,
      active: true,
      elapsedLifetime: 100, // 100ms < 350ms delay
      vx: 0,
      vy: 0,
    };

    // We need to mock the context for BuffGems because they use this.ctx.buffGems
    const mockContext = {
      stats: { getMagnet: () => 100 },
      statCaps: { MAX_MAGNET: 500 },
      constants: { GEM_MAGNET_BASE_RANGE: 75 },
      buffGems: { getActiveGems: () => [buffGem], collectGem: vi.fn() },
      audio: { playGem: vi.fn() },
      performance: { getPerformanceConfig: () => ({ particleMultiplier: 1 }) },
      particles: { collect: { count: 3, speed: 5, life: 1 } },
    };

    collectionSystem.setContext(mockContext as any);

    collectionSystem.update(mockPool, mockPlayer, mockState, 1);

    // If magnetized/pulled, x would change. It should stay at 450.
    expect(buffGem.x).toBe(450);
  });

  it('should pull buff gems after the delay', () => {
    const buffGem: Partial<BuffGem> = {
      x: 450,
      y: 300,
      radius: 10,
      active: true,
      elapsedLifetime: 400, // 400ms > 350ms delay
      vx: 0,
      vy: 0,
      decoratorClass: class {} as any,
    };

    const mockContext = {
      stats: { getMagnet: () => 100 },
      statCaps: { MAX_MAGNET: 500 },
      constants: { GEM_MAGNET_BASE_RANGE: 75 },
      buffGems: { getActiveGems: () => [buffGem], collectGem: vi.fn() },
      audio: { playGem: vi.fn() },
      performance: { getPerformanceConfig: () => ({ particleMultiplier: 1 }) },
      particles: { collect: { count: 3, speed: 5, life: 1 } },
    };

    collectionSystem.setContext(mockContext as any);

    // Mock Math.random for predictable pop direction (towards left)
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5); // 0.5 * 2PI = PI, cos(PI) = -1

    collectionSystem.update(mockPool, mockPlayer, mockState, 1);

    // Should be pulled towards player (x=400)
    expect(buffGem.x).toBeLessThan(450);
    randomSpy.mockRestore();
  });
});
