import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CollectionSystem } from '../../../services/combat/physics/CollectionSystem';
import { type IPhysicsContext } from '../../../services/combat/physics/PhysicsTypes';
import { type IPoolManager } from '../../../services/interfaces/IPoolManager';
import { type Player, type GameState, type Gem } from '../../../types';
import { EventBus } from '../../../services/core/EventBus';
import { BuffManager } from '../../../services/patterns/decorators/BuffManager';

vi.mock('../../../services/gameplay/LeverageEngine', () => ({
  LeverageEngine: {
    getMultipliers: vi.fn(() => ({ gemValue: 1.0, xpGain: 1.0 })),
  },
}));

vi.mock('../../../services/market/PriceMomentumEngine', () => ({
  PriceMomentumEngine: {
    getLatest: vi.fn(() => ({ gemValueMod: 1.0 })),
  },
}));

describe('CollectionSystem', () => {
  let system: CollectionSystem;
  let mockContext: IPhysicsContext;
  let mockPool: IPoolManager;
  let player: Player;
  let state: GameState;

  beforeEach(() => {
    mockContext = {
      stats: { getMagnet: vi.fn().mockReturnValue(0) },
      statCaps: { MAX_MAGNET: 500 },
      constants: { GEM_MAGNET_BASE_RANGE: 50 },
      audio: { playGem: vi.fn() },
      performance: {
        getPerformanceConfig: vi.fn().mockReturnValue({ particleMultiplier: 1 }),
      },
      particles: { collect: { count: 10, speed: 5, life: 100 } },
      combo: { getXpMultiplier: vi.fn().mockReturnValue(1) },
      buffGems: { getActiveGems: vi.fn().mockReturnValue([]), collectGem: vi.fn() },
    } as any;

    mockPool = {
      activeGems: [],
      getParticle: vi.fn().mockReturnValue({}),
      getFloatingText: vi.fn(),
    } as any;

    player = { x: 0, y: 0, radius: 10, exp: 0, nextLevelExp: 100 } as any;
    state = { levelUpFreeze: 0, shake: 0 } as any;

    system = new CollectionSystem(mockContext);
    EventBus.clear();
  });

  describe('Standard Gems', () => {
    it('should collect a gem when in range', () => {
      const gem: Gem = { x: 5, y: 5, radius: 5, value: 10, active: true } as any;
      (mockPool as any).activeGems = [gem];

      vi.spyOn(EventBus, 'emit');

      system.update(mockPool, player, state, 1);

      expect(gem.active).toBe(false);
      expect(player.exp).toBe(10);
      expect(mockContext.audio.playGem).toHaveBeenCalled();
    });

    it('should magnetize a gem when in magnet range', () => {
      const gem: Gem = {
        x: 80,
        y: 0,
        radius: 5,
        value: 10,
        active: true,
        magnetized: false,
        elapsedLifetime: 500,
      } as any;
      (mockPool as any).activeGems = [gem];
      (mockContext.stats.getMagnet as any).mockReturnValue(100);

      system.update(mockPool, player, state, 1);

      expect(gem.magnetized).toBe(true);
    });

    it('should despawn gems after lifetime expires', () => {
      const gem: Gem = {
        x: 200,
        y: 200,
        radius: 5,
        value: 10,
        active: true,
        elapsedLifetime: 4999,
      } as any;
      (mockPool as any).activeGems = [gem];

      // Update with dtFactor 1 (approx 16.6ms)
      system.update(mockPool, player, state, 1);

      expect(gem.active).toBe(false);
      expect(player.exp).toBe(0); // Not collected
    });
  });

  describe('Buff Gems', () => {
    it('should collect a buff gem when in range', () => {
      const buffGem = {
        x: 5,
        y: 5,
        radius: 5,
        active: true,
        decoratorClass: 'test-class',
        icon: '🔥',
        color: '#ff0000',
      } as any;
      (mockContext.buffGems.getActiveGems as any).mockReturnValue([buffGem]);

      const addEffectSpy = vi
        .spyOn(BuffManager, 'addEffect')
        .mockImplementation(() => 'test-id');

      system.update(mockPool, player, state, 1);

      expect(addEffectSpy).toHaveBeenCalledWith('test-class');
      expect(mockContext.buffGems.collectGem).toHaveBeenCalledWith(buffGem);
      expect(mockPool.getFloatingText).toHaveBeenCalled();

      addEffectSpy.mockRestore();
    });

    it('should pull buff gems toward player even if outside pickup range', () => {
      const buffGem = {
        x: 60,
        y: 0,
        radius: 5,
        active: true,
        decoratorClass: 'test-class',
        elapsedLifetime: 500,
        velocityInitiated: true,
        vx: 0,
        vy: 0,
      } as any;
      (mockContext.buffGems.getActiveGems as any).mockReturnValue([buffGem]);

      system.update(mockPool, player, state, 1);

      expect(buffGem.x).toBeLessThan(60);
      expect(buffGem.x).toBeGreaterThan(0);
    });
  });
});
