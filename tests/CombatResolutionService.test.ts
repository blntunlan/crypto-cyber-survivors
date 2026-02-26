import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CombatResolutionService } from '../services/combat/physics/CombatResolutionService';
import { type Enemy, type Player } from '../types';
import { EventBus } from '../services/core/EventBus';
import { BuffManager } from '../services/patterns/decorators/BuffManager';
import { DifficultyManager } from '../services/gameplay/DifficultyManager';

// Mock dependencies
vi.mock('../services/core/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()),
  },
}));

vi.mock('../services/patterns/decorators/BuffManager', () => ({
  BuffManager: {
    isInitialized: vi.fn(() => false),
    getDecoratedStats: vi.fn(() => ({
      getLifesteal: () => 0,
      getLuck: () => 0,
    })),
  },
}));

vi.mock('../services/system/DeviceBenchmarkService', () => ({
  DeviceBenchmarkService: {
    getPerformanceConfig: vi.fn(() => ({ particleMultiplier: 1 })),
  },
}));

vi.mock('../services/gameplay/DifficultyManager', () => ({
  DifficultyManager: {
    recordKill: vi.fn(),
    getXpMultiplier: vi.fn(() => 1.0),
  },
}));

describe('CombatResolutionService', () => {
  let mockPool: any;
  let mockPlayer: Player;
  let mockEnemy: Enemy;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPool = {
      getParticle: vi.fn(),
      getGem: vi.fn(),
    };

    mockPlayer = {
      x: 0,
      y: 0,
      hp: 50,
      maxHp: 100,
      lifesteal: 0,
      luck: 0,
    } as any;

    mockEnemy = {
      x: 100,
      y: 100,
      type: 'grunt',
      color: '#ff0000',
      active: true,
    } as any;

    // Reset BuffManager mock
    vi.mocked(BuffManager.isInitialized).mockReturnValue(false);
    vi.mocked(BuffManager.getDecoratedStats).mockReturnValue({
      getLifesteal: () => mockPlayer.lifesteal,
      getLuck: () => mockPlayer.luck,
    } as any);
  });

  describe('handleEnemyDeath', () => {
    it('should trigger death state and animations', () => {
      CombatResolutionService.handleEnemyDeath(mockPool, mockEnemy, mockPlayer);

      expect(mockEnemy.isDying).toBe(true);
      expect(mockEnemy.deathProgress).toBe(0);
      expect(EventBus.emit).toHaveBeenCalledWith('enemyKilled', expect.any(Object));
    });

    it('should spawn death particles based on crit status', () => {
      // Normal death
      CombatResolutionService.handleEnemyDeath(mockPool, mockEnemy, mockPlayer, false);
      const normalCallCount = mockPool.getParticle.mock.calls.length;

      // Super crit death
      CombatResolutionService.handleEnemyDeath(mockPool, mockEnemy, mockPlayer, true);
      const superCritCallCount =
        mockPool.getParticle.mock.calls.length - normalCallCount;

      expect(superCritCallCount).toBeGreaterThan(normalCallCount);
    });
  });

  describe('processLifesteal', () => {
    it('should heal player on successful roll', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1); // Pass lifesteal roll
      mockPlayer.lifesteal = 0.5;
      mockPlayer.hp = 50;

      CombatResolutionService.handleEnemyDeath(mockPool, mockEnemy, mockPlayer);

      expect(mockPlayer.hp).toBeGreaterThan(50);
      expect(EventBus.emit).toHaveBeenCalledWith('playerHealed', expect.any(Object));
      vi.spyOn(Math, 'random').mockRestore();
    });

    it('should not exceed max HP', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      mockPlayer.lifesteal = 1.0;
      mockPlayer.hp = 99; // Heal amount is 3 for grunt
      mockPlayer.maxHp = 100;

      CombatResolutionService.handleEnemyDeath(mockPool, mockEnemy, mockPlayer);

      expect(mockPlayer.hp).toBe(100);
      vi.spyOn(Math, 'random').mockRestore();
    });

    it('should heal more on whale kill', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      mockPlayer.lifesteal = 1.0;

      const gruntEnemy = { ...mockEnemy, type: 'grunt' } as Enemy;
      const whaleEnemy = { ...mockEnemy, type: 'whale' } as Enemy;

      // Kill grunt
      mockPlayer.hp = 50;
      CombatResolutionService.handleEnemyDeath(mockPool, gruntEnemy, mockPlayer);
      const gruntHeal = mockPlayer.hp - 50;

      // Kill whale
      mockPlayer.hp = 50;
      CombatResolutionService.handleEnemyDeath(mockPool, whaleEnemy, mockPlayer);
      const whaleHeal = mockPlayer.hp - 50;

      expect(whaleHeal).toBeGreaterThan(gruntHeal);
      vi.spyOn(Math, 'random').mockRestore();
    });

    it('should use BuffManager stats if available', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      vi.mocked(BuffManager.isInitialized).mockReturnValue(true);
      vi.mocked(BuffManager.getDecoratedStats).mockReturnValue({
        getLifesteal: () => 1.0,
        getLuck: () => 0,
      } as any);

      mockPlayer.lifesteal = 0; // Base is 0
      mockPlayer.hp = 50;

      CombatResolutionService.handleEnemyDeath(mockPool, mockEnemy, mockPlayer);

      expect(mockPlayer.hp).toBeGreaterThan(50);
      vi.spyOn(Math, 'random').mockRestore();
    });
  });

  describe('spawnGemForEnemy', () => {
    it('should spawn a gem at enemy location', () => {
      CombatResolutionService.handleEnemyDeath(mockPool, mockEnemy, mockPlayer);

      expect(mockPool.getGem).toHaveBeenCalledWith(
        mockEnemy.x,
        mockEnemy.y,
        expect.any(Number),
        expect.any(Number),
        expect.any(String),
        expect.any(Boolean)
      );
    });

    it('should spawn rare gems when lucky', () => {
      // Force random roll success (rareChance = 0.05 + luck * 0.03)
      vi.spyOn(Math, 'random').mockReturnValue(0.01);
      mockPlayer.luck = 0;

      CombatResolutionService.handleEnemyDeath(mockPool, mockEnemy, mockPlayer);

      const gemArgs = mockPool.getGem.mock.calls[0];
      const isRare = gemArgs[5];
      expect(isRare).toBe(true);

      vi.spyOn(Math, 'random').mockRestore();
    });

    it('should spawn bonus gems when lucky', () => {
      // Mock random to pass bonusGemChance roll
      // We need to return a value that passes the bonus gem check but not necessarily the rare check for clarity
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
      mockPlayer.luck = 5; // 50% bonus gem chance

      CombatResolutionService.handleEnemyDeath(mockPool, mockEnemy, mockPlayer);

      // Should be called twice: 1 normal + 1 bonus
      expect(mockPool.getGem).toHaveBeenCalledTimes(2);

      randomSpy.mockRestore();
    });

    it('should respect luck cap', () => {
      mockPlayer.luck = 999;

      expect(() => {
        CombatResolutionService.handleEnemyDeath(mockPool, mockEnemy, mockPlayer);
      }).not.toThrow();
    });

    it('should apply leverage multiplier to gem value', () => {
      // Mock random to return high value (> 0.5) to ensure non-rare gem
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9);
      vi.mocked(DifficultyManager.getXpMultiplier).mockReturnValue(2.0); // 100x leverage
      CombatResolutionService.handleEnemyDeath(mockPool, mockEnemy, mockPlayer);

      const gemArgs = mockPool.getGem.mock.calls[0];
      if (!gemArgs) throw new Error('getGem not called');
      const value = gemArgs[2];

      // Base value is 12 for normal enemies (as per ECONOMY_CONFIG). 12 * 2.0 = 24.
      expect(value).toBe(24);
      randomSpy.mockRestore();
    });
  });

  describe('triggerShockwave', () => {
    it('should push active enemies based on intensity', () => {
      const enemies = [
        { x: 10, y: 10, spawnTimer: 0 },
        { x: 20, y: 20, spawnTimer: 0 },
      ];
      mockPool.activeEnemies = enemies;

      CombatResolutionService.triggerShockwave(mockPool, 1.0);

      expect(enemies[0]!.x).not.toBe(10);
      expect(enemies[0]!.y).not.toBe(10);
      expect(enemies[0]!.spawnTimer).toBe(0.5);
    });
  });
});
