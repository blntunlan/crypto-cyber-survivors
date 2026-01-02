/**
 * PhysicsSystem Tests
 *
 * Tests for entity movement, collision detection, and physics calculations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PhysicsSystem } from '../services/PhysicsSystem';
import { type Player, type GameState } from '../types';
import { type PoolManager } from '../services/PoolManager';

// Mock dependencies
vi.mock('../services/AudioService', () => ({
  audio: {
    playHit: vi.fn(),
    playCrit: vi.fn(),
    playGem: vi.fn(),
  },
}));

vi.mock('../services/CheatManager', () => ({
  CheatManager: {
    isGodMode: vi.fn(() => false),
  },
}));

vi.mock('../services/DifficultyManager', () => ({
  DifficultyManager: {
    recordKill: vi.fn(),
  },
}));

vi.mock('../services/ComboSystem', () => ({
  ComboSystem: {
    getXpMultiplier: vi.fn(() => 1),
  },
}));

vi.mock('../services/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()), // Returns unsubscribe function
  },
}));

// Mock BuffManager
vi.mock('../services/patterns/decorators/BuffManager', () => ({
  BuffManager: {
    isInitialized: vi.fn(() => true),
    getDecoratedStats: vi.fn(),
    addEffect: vi.fn(),
  },
}));

import { BuffManager } from '../services/patterns/decorators/BuffManager';

describe('PhysicsSystem', () => {
  let mockPool: any;
  let mockPlayer: Player;
  let mockState: GameState;
  let mockOnGameOver: () => void;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock stats
    vi.mocked(BuffManager.getDecoratedStats).mockReturnValue({
      getArmor: () => mockPlayer.armor,
      getMagnet: () => mockPlayer.magnet,
      getSpeed: () => mockPlayer.speed,
      getDodge: () => mockPlayer.dodge,
    } as any);

    // Mock PoolManager
    mockPool = {
      activeBullets: [],
      activeParticles: [],
      activeFloatingTexts: [],
      activeEnemies: [],
      activeGems: [],
      getParticle: vi.fn(() => ({
        active: true,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        color: '#fff',
        radius: 2,
        life: 1,
      })),
      getGem: vi.fn(),
      getFloatingText: vi.fn(),
    };

    // Mock Player
    mockPlayer = {
      x: 400,
      y: 300,
      radius: 12,
      color: '#22c55e',
      hp: 100,
      maxHp: 100,
      baseDamage: 15,
      fireRate: 300,
      speed: 4,
      luck: 0,
      lifesteal: 0,
      dodge: 0,
      critChance: 0.1,
      projectiles: 1,
      area: 1,
      exp: 0,
      nextLevelExp: 100,
      level: 1,
      armor: 0,
      magnet: 1,
    };

    // Mock GameState
    mockState = {
      shake: 0,
      critFlash: 0,
      critFlashColor: '#fff',
      lastFireTime: 0,
      fireTimer: 0,
      dashTrail: [],
      dashTrailAccumulator: 0,
      bgCandles: [],
      currentBg: { r: 15, g: 23, b: 42 },
      spawnTimer: 0,
      lastTime: 0,
      levelUpFreeze: 0,
      isDashing: false,
      dashTimer: 0,
      dashCooldownTimer: 0,
      isGameOverTriggered: false,
    };

    mockOnGameOver = vi.fn();
  });

  describe('updateEntities', () => {
    it('should update bullet positions based on velocity', () => {
      mockPool.activeBullets = [{ x: 100, y: 100, vx: 10, vy: 5, active: true }];

      PhysicsSystem.updateEntities(mockPool as PoolManager, 1, 800, 600);

      expect(mockPool.activeBullets[0].x).toBe(110);
      expect(mockPool.activeBullets[0].y).toBe(105);
    });

    it('should deactivate bullets that go off screen', () => {
      mockPool.activeBullets = [{ x: -150, y: 100, vx: -10, vy: 0, active: true }];

      PhysicsSystem.updateEntities(mockPool as PoolManager, 1, 800, 600);

      expect(mockPool.activeBullets[0].active).toBe(false);
    });

    it('should update particle positions and life', () => {
      mockPool.activeParticles = [{ x: 100, y: 100, vx: 2, vy: -2, life: 1, active: true }];

      PhysicsSystem.updateEntities(mockPool as PoolManager, 1, 800, 600);

      expect(mockPool.activeParticles[0].x).toBe(102);
      expect(mockPool.activeParticles[0].y).toBe(98);
      expect(mockPool.activeParticles[0].life).toBeLessThan(1);
    });

    it('should deactivate particles when life reaches 0', () => {
      mockPool.activeParticles = [{ x: 100, y: 100, vx: 0, vy: 0, life: 0.01, active: true }];

      PhysicsSystem.updateEntities(mockPool as PoolManager, 1, 800, 600);

      expect(mockPool.activeParticles[0].active).toBe(false);
    });

    it('should update floating text positions and fade', () => {
      mockPool.activeFloatingTexts = [{ x: 100, y: 200, life: 1, active: true }];

      PhysicsSystem.updateEntities(mockPool as PoolManager, 1, 800, 600);

      expect(mockPool.activeFloatingTexts[0].y).toBeLessThan(200);
      expect(mockPool.activeFloatingTexts[0].life).toBeLessThan(1);
    });

    it('should scale movement by delta time factor', () => {
      mockPool.activeBullets = [{ x: 100, y: 100, vx: 10, vy: 0, active: true }];

      // Half speed
      PhysicsSystem.updateEntities(mockPool as PoolManager, 0.5, 800, 600);

      expect(mockPool.activeBullets[0].x).toBe(105);
    });
  });

  describe('handleCollisions', () => {
    it('should not damage player when dashing', () => {
      const mockEnemy = {
        x: 405,
        y: 300,
        radius: 15,
        active: true,
        health: 100,
        behavior: { move: vi.fn() },
      };
      mockPool.activeEnemies = [mockEnemy];
      mockState.isDashing = true;
      mockPlayer.hp = 100;

      PhysicsSystem.handleCollisions(
        mockPool as PoolManager,
        mockPlayer,
        mockState,
        1,
        800,
        600,
        mockOnGameOver
      );

      expect(mockPlayer.hp).toBe(100); // No damage
    });

    it('should reduce damage to player based on decorated armor', () => {
      const mockEnemy = {
        x: 405,
        y: 300,
        radius: 15,
        active: true,
        health: 100,
        behavior: { move: vi.fn() },
      };
      mockPool.activeEnemies = [mockEnemy];
      mockPlayer.hp = 100;

      // Diminishing returns formula:
      // armorReduction = armor / (armor + 10)
      // damage = 0.8 * (1 - armorReduction)
      // With armor 4: reduction = 4/14 ≈ 0.286, damage = 0.8 * 0.714 ≈ 0.571
      vi.mocked(BuffManager.getDecoratedStats).mockReturnValue({
        getArmor: () => 4,
        getMagnet: () => 1,
        getDodge: () => 0,
      } as any);

      PhysicsSystem.handleCollisions(
        mockPool as PoolManager,
        mockPlayer,
        mockState,
        1,
        800,
        600,
        mockOnGameOver
      );

      // Use closeTo for floating point comparison
      expect(mockPlayer.hp).toBeCloseTo(100 - 0.571, 2);
    });

    it('should avoid damage when dodge is successful', () => {
      const mockEnemy = {
        x: 400 + 15,
        y: 300,
        radius: 10,
        active: true,
        health: 100,
        behavior: { move: vi.fn() },
      };
      mockPool.activeEnemies = [mockEnemy];
      mockPlayer.hp = 100;
      mockPool.getFloatingText.mockReturnValue({
        active: false,
        x: 0,
        y: 0,
        text: '',
        color: '',
        life: 0,
        size: 0,
      });

      // 100% Dodge Chance
      vi.mocked(BuffManager.getDecoratedStats).mockReturnValue({
        getArmor: () => 0,
        getMagnet: () => 1,
        getDodge: () => 1.0,
      } as any);

      // Force Math.random to return 0.1 (successful dodge since 0.1 < 0.5 (max dodge))
      vi.spyOn(Math, 'random').mockReturnValue(0.1);

      PhysicsSystem.handleCollisions(
        mockPool as PoolManager,
        mockPlayer,
        mockState,
        1,
        800,
        600,
        mockOnGameOver
      );

      // Should ensure no damage taken
      expect(mockPlayer.hp).toBe(100);

      // Should show 'DODGE!' text
      expect(mockPool.getFloatingText).toHaveBeenCalled();
    });

    it('should deactivate off-screen enemies', () => {
      const mockEnemy = {
        x: -500,
        y: 300,
        radius: 15,
        active: true,
        health: 100,
        behavior: { move: vi.fn() },
      };
      mockPool.activeEnemies = [mockEnemy];

      PhysicsSystem.handleCollisions(
        mockPool as PoolManager,
        mockPlayer,
        mockState,
        1,
        800,
        600,
        mockOnGameOver
      );

      expect(mockEnemy.active).toBe(false);
    });

    it('should collect gems when player touches them', () => {
      mockPool.activeGems = [{ x: 405, y: 300, radius: 5, value: 10, active: true }];
      mockPlayer.exp = 0;

      PhysicsSystem.handleCollisions(
        mockPool as PoolManager,
        mockPlayer,
        mockState,
        1,
        800,
        600,
        mockOnGameOver
      );

      expect(mockPool.activeGems[0].active).toBe(false);
      expect(mockPlayer.exp).toBe(10);
    });

    it('should pull gems towards player within decorated magnet range', () => {
      mockPool.activeGems = [{ x: 450, y: 300, radius: 5, value: 10, active: true }];

      // GEM_MAGNET_BASE_RANGE (30) + Magnet (100) = 130
      vi.mocked(BuffManager.getDecoratedStats).mockReturnValue({
        getMagnet: () => 100,
        getArmor: () => 0,
        getDodge: () => 0,
      } as any);

      const initialX = mockPool.activeGems[0].x;

      PhysicsSystem.handleCollisions(
        mockPool as PoolManager,
        mockPlayer,
        mockState,
        1,
        800,
        600,
        mockOnGameOver
      );

      expect(mockPool.activeGems[0].x).toBeLessThan(initialX);
    });
  });

  describe('bullet-enemy collisions', () => {
    it('should damage enemy when bullet hits', () => {
      const mockEnemy = {
        x: 500,
        y: 300,
        radius: 15,
        active: true,
        health: 100,
        maxHealth: 100,
        behavior: { move: vi.fn() },
      };
      mockPool.activeEnemies = [mockEnemy];
      mockPool.activeBullets = [
        { x: 500, y: 300, radius: 5, damage: 25, active: true, isCrit: false, isSuperCrit: false },
      ];

      PhysicsSystem.handleCollisions(
        mockPool as PoolManager,
        mockPlayer,
        mockState,
        1,
        800,
        600,
        mockOnGameOver
      );

      expect(mockEnemy.health).toBe(75);
      expect(mockPool.activeBullets[0].active).toBe(false);
    });

    it('should spawn floating text on hit', () => {
      const mockEnemy = {
        x: 500,
        y: 300,
        radius: 15,
        active: true,
        health: 100,
        behavior: { move: vi.fn() },
      };
      mockPool.activeEnemies = [mockEnemy];
      mockPool.activeBullets = [
        { x: 500, y: 300, radius: 5, damage: 25, active: true, isCrit: false, isSuperCrit: false },
      ];

      PhysicsSystem.handleCollisions(
        mockPool as PoolManager,
        mockPlayer,
        mockState,
        1,
        800,
        600,
        mockOnGameOver
      );

      expect(mockPool.getFloatingText).toHaveBeenCalled();
    });

    it('should trigger crit flash on crit hit', () => {
      const mockEnemy = {
        x: 500,
        y: 300,
        radius: 15,
        active: true,
        health: 100,
        behavior: { move: vi.fn() },
      };
      mockPool.activeEnemies = [mockEnemy];
      mockPool.activeBullets = [
        { x: 500, y: 300, radius: 5, damage: 50, active: true, isCrit: true, isSuperCrit: false },
      ];

      PhysicsSystem.handleCollisions(
        mockPool as PoolManager,
        mockPlayer,
        mockState,
        1,
        800,
        600,
        mockOnGameOver
      );

      expect(mockState.critFlash).toBeGreaterThan(0);
    });

    it('should apply knockback to enemy on hit', () => {
      const mockEnemy = {
        x: 500,
        y: 300,
        radius: 15,
        active: true,
        health: 100,
        behavior: { move: vi.fn() },
      };
      mockPool.activeEnemies = [mockEnemy];
      // Bullet moving RIGHT (vx = 10)
      mockPool.activeBullets = [
        {
          x: 500,
          y: 300,
          radius: 5,
          damage: 25,
          active: true,
          vx: 10,
          vy: 0,
          isCrit: false,
          isSuperCrit: false,
        },
      ];

      const initialX = mockEnemy.x;

      PhysicsSystem.handleCollisions(
        mockPool as PoolManager,
        mockPlayer,
        mockState,
        1,
        800,
        600,
        mockOnGameOver
      );

      expect(mockEnemy.x).toBeGreaterThan(initialX);
    });
  });
});
