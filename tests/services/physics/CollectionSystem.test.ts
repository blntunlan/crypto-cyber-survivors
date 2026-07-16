import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CollectionSystem } from '../../../services/combat/physics/CollectionSystem';
import { type IPhysicsContext } from '../../../services/combat/physics/PhysicsTypes';
import { type IPoolManager } from '../../../services/interfaces/IPoolManager';
import { type ILootCacheSystem } from '../../../services/interfaces/ILootCacheSystem';
import {
  type Player,
  type GameState,
  type Gem,
  type Interactable,
} from '../../../types';
import { EventBus } from '../../../services/core/EventBus';
import { BuffManager } from '../../../services/patterns/decorators/BuffManager';
import { LeverageEngine } from '../../../services/gameplay/LeverageEngine';

vi.mock('../../../services/gameplay/LeverageEngine', () => ({
  LeverageEngine: {
    getMultipliers: vi.fn(() => ({ gemValue: 1.0, xpGain: 1.0 })),
    getLeverage: vi.fn(() => 5),
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
    vi.mocked(LeverageEngine.getLeverage).mockReturnValue(5);
    mockContext = {
      stats: { getMagnet: vi.fn().mockReturnValue(0) },
      statCaps: { MAX_MAGNET: 500 },
      constants: {
        GEM_MAGNET_BASE_RANGE: 50,
        getGameTime: vi.fn(() => 42_000),
        getGameTimeSeconds: vi.fn(() => 42),
      },
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
      activeInteractables: [],
      getParticle: vi.fn().mockReturnValue({}),
      getFloatingText: vi.fn(),
      getImpactRing: vi.fn(),
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

    it('should apply player XP multiplier when collecting gems', () => {
      player.expMultiplier = 1.5;
      const gem: Gem = { x: 5, y: 5, radius: 5, value: 10, active: true } as any;
      (mockPool as any).activeGems = [gem];

      system.update(mockPool, player, state, 1);

      expect(player.exp).toBe(15);
    });

    it('should keep base collection particles at low leverage', () => {
      vi.mocked(LeverageEngine.getLeverage).mockReturnValue(10);
      const gem: Gem = { x: 5, y: 5, radius: 5, value: 10, active: true } as any;
      (mockPool as any).activeGems = [gem];

      system.update(mockPool, player, state, 1);

      expect(mockPool.getParticle).toHaveBeenCalledTimes(10);
    });

    it('should spawn a collection ring when collecting a gem', () => {
      const gem: Gem = {
        x: 5,
        y: 5,
        radius: 5,
        value: 10,
        active: true,
        color: '#ffd700',
      } as any;
      (mockPool as any).activeGems = [gem];

      system.update(mockPool, player, state, 1);

      expect(mockPool.getImpactRing).toHaveBeenCalledWith(
        gem.x,
        gem.y,
        expect.any(Number),
        expect.any(Number),
        gem.color,
        expect.any(Number)
      );
    });

    it('should spawn a larger collection ring for rare gems', () => {
      const normalGem: Gem = {
        x: 5,
        y: 5,
        radius: 5,
        value: 10,
        active: true,
        color: '#ffd700',
        isRare: false,
      } as any;
      (mockPool as any).activeGems = [normalGem];

      system.update(mockPool, player, state, 1);
      const normalMaxRadius = (mockPool.getImpactRing as any).mock.calls[0][3];

      (mockPool.getImpactRing as any).mockClear();
      player.exp = 0;
      const rareGem: Gem = {
        x: 5,
        y: 5,
        radius: 5,
        value: 10,
        active: true,
        color: '#ff10f0',
        isRare: true,
      } as any;
      (mockPool as any).activeGems = [rareGem];

      system.update(mockPool, player, state, 1);
      const rareMaxRadius = (mockPool.getImpactRing as any).mock.calls[0][3];

      expect(rareMaxRadius).toBeGreaterThan(normalMaxRadius);
    });

    it('should add jackpot particles on collection at high leverage', () => {
      vi.mocked(LeverageEngine.getLeverage).mockReturnValue(100);
      const gem: Gem = { x: 5, y: 5, radius: 5, value: 10, active: true } as any;
      (mockPool as any).activeGems = [gem];

      system.update(mockPool, player, state, 1);

      expect((mockPool.getParticle as any).mock.calls.length).toBeGreaterThan(10);
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

    it('should ignore already inactive gems in the active pool', () => {
      const gem: Gem = { x: 5, y: 5, radius: 5, value: 10, active: false } as any;
      (mockPool as any).activeGems = [gem];

      system.update(mockPool, player, state, 1);

      expect(player.exp).toBe(0); // Should not have collected the gem
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
      expect(mockPool.getImpactRing).toHaveBeenCalledWith(
        buffGem.x,
        buffGem.y,
        expect.any(Number),
        expect.any(Number),
        buffGem.color,
        expect.any(Number)
      );

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

  describe('Loot Caches', () => {
    const createLootCacheSystem = (): ILootCacheSystem => ({
      update: vi.fn(),
      tryOpen: vi.fn((target, input) => {
        target.lootCachePhase = 'anticipation';
        if (!input.reducedMotion) {
          input.state.shake = 3.5;
        }
        return true;
      }),
      requestDebugSpawn: vi.fn(),
      beginRun: vi.fn(),
      reset: vi.fn(),
      dispose: vi.fn(),
    });

    const expectNoOpenForOverlappingInteractable = (
      interactable: Interactable
    ): void => {
      const lootCacheSystem = createLootCacheSystem();
      mockPool.activeInteractables.push(interactable);
      system = new CollectionSystem(mockContext, lootCacheSystem);

      system.update(mockPool, player, state, 1, false);

      expect(lootCacheSystem.tryOpen).not.toHaveBeenCalled();
    };

    it('requests opening once when the player contacts a closed cache', () => {
      const cache = {
        active: true,
        type: 'LOOT_CRATE',
        x: 5,
        y: 0,
        radius: 20,
        color: '#a855f7',
        health: 1,
        maxHealth: 1,
        lootCachePhase: 'closed',
      } as Interactable;
      mockPool.activeInteractables.push(cache);
      const lootCacheSystem = createLootCacheSystem();
      system = new CollectionSystem(mockContext, lootCacheSystem);

      system.update(mockPool, player, state, 1, true);
      system.update(mockPool, player, state, 1, true);

      expect(lootCacheSystem.tryOpen).toHaveBeenCalledTimes(1);
      expect(lootCacheSystem.tryOpen).toHaveBeenCalledWith(cache, {
        elapsedSeconds: 42,
        reducedMotion: true,
        pool: mockPool,
        player,
        state,
      });
      expect(state.shake).toBe(0);
    });

    it('does not request opening for an overlapping active non-cache interactable', () => {
      expectNoOpenForOverlappingInteractable({
        active: true,
        type: 'MINING_RIG',
        x: 5,
        y: 0,
        radius: 20,
        color: '#ffd700',
        health: 100,
        maxHealth: 100,
      });
    });

    it('does not request opening for an overlapping inactive loot cache', () => {
      expectNoOpenForOverlappingInteractable({
        active: false,
        type: 'LOOT_CRATE',
        x: 5,
        y: 0,
        radius: 20,
        color: '#a855f7',
        health: 1,
        maxHealth: 1,
        lootCachePhase: 'closed',
      });
    });

    it('does not request opening for an overlapping non-closed loot cache', () => {
      expectNoOpenForOverlappingInteractable({
        active: true,
        type: 'LOOT_CRATE',
        x: 5,
        y: 0,
        radius: 20,
        color: '#a855f7',
        health: 1,
        maxHealth: 1,
        lootCachePhase: 'anticipation',
      });
    });
  });
});
