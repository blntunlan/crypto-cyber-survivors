import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PhysicsSystem } from '../../services/PhysicsSystem';
import { type Player, type GameState } from '../../types';
import { type PoolManager } from '../../services/PoolManager';

// Mock dependencies
vi.mock('../../services/AudioService', () => ({
  audio: {
    playHit: vi.fn(),
    playCrit: vi.fn(),
    playGem: vi.fn(),
  },
}));

vi.mock('../../services/CheatManager', () => ({
  CheatManager: {
    isGodMode: vi.fn(() => false),
  },
}));

vi.mock('../../services/DifficultyManager', () => ({
  DifficultyManager: {
    recordKill: vi.fn(),
  },
}));

vi.mock('../../services/ComboSystem', () => ({
  ComboSystem: {
    getXpMultiplier: vi.fn(() => 1),
  },
}));

vi.mock('../../services/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()),
  },
}));

vi.mock('../../services/spawners/BuffGemSpawner', () => ({
  BuffGemSpawner: {
    getActiveGems: vi.fn(() => []),
    collectGem: vi.fn(),
  },
}));

vi.mock('../../services/patterns/decorators/BuffManager', () => ({
  BuffManager: {
    addEffect: vi.fn(),
    isInitialized: vi.fn(() => false),
    getDecoratedStats: vi.fn(() => ({
      getMagnet: vi.fn(() => 0),
      getArmor: vi.fn(() => 0),
      getSpeed: vi.fn(() => 4),
      getDamage: vi.fn(() => 10),
      getCritChance: vi.fn(() => 0),
      getLuck: vi.fn(() => 0),
    })),
  },
}));

// Mock SpatialGrid to avoid forEachNearby issues
vi.mock('../../services/SpatialGrid', () => ({
  bulletGrid: {
    clear: vi.fn(),
    insertAll: vi.fn(),
    getNearby: vi.fn(() => []),
    forEachNearby: vi.fn(),
  },
  enemyGrid: {
    clear: vi.fn(),
    insertAll: vi.fn(),
    getNearby: vi.fn(() => []),
    forEachNearby: vi.fn(),
  },
}));

describe('PhysicsSystem Edge Cases', () => {
  let mockPool: any;
  let mockPlayer: Player;
  let mockState: GameState;
  let mockOnGameOver: () => void;
  let physicsSystem: PhysicsSystem;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPool = {
      activeBullets: [],
      activeParticles: [],
      activeFloatingTexts: [],
      activeEnemies: [],
      activeGems: [],
      activeInteractables: [],
      activeSpeedLines: [],
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
      cleanup: vi.fn(),
    };

    mockPlayer = {
      x: 400,
      y: 300,
      radius: 10,
      hp: 100,
      maxHp: 100,
      exp: 0,
      nextLevelExp: 100,
      level: 1,
      armor: 0,
      magnet: 0,
      speed: 4,
      fireRate: 300,
      baseDamage: 10,
      luck: 0,
      critChance: 0,
      projectiles: 1,
      area: 1,
      color: '#fff',
      invulnerabilityTimer: 0,
    } as any;

    mockState = {
      isDashing: false,
      isGameOverTriggered: false,
      shake: 0,
      critFlash: 0,
      critFlashColor: '#FF0000',
      lastFireTime: 0,
      fireTimer: 0,
      spawnTimer: 0,
      dashTrail: [],
      dashTrailAccumulator: 0,
      bgCandles: [],
      currentBg: { r: 15, g: 23, b: 42 },
      lastTime: 0,
      bgUpdateFrameCounter: 0,
      levelUpFreeze: 0,
      lastHeartbeatTime: 0,
      doubleDashQueued: false,
      doubleDashUsed: false,
      dashHaloOpacity: 0,
      hitStopTimer: 0,
      playerScaleX: 1,
      playerScaleY: 1,
      playerRotation: 0,
      nearMissTimer: 0,
      nearMissCooldown: 0,
      rsiVisualState: 'NEUTRAL',
      whaleEventTimer: 0,
      targetBg: { r: 15, g: 23, b: 42 },
      interactableSpawnTimer: 0,
      atrPercent: 0,
      spawnRateMultiplier: 1,
      marketPosition: 0, // Using 0 for LONG if MarketPosition is enum
      isMoving: false,
      lastMoveX: 0,
      damageIndicators: [],
    } as any;

    mockOnGameOver = vi.fn();
    physicsSystem = PhysicsSystem.getInstance();
  });

  describe('Extreme Delta Time (dtFactor)', () => {
    it('should handle dtFactor of 0 (paused/frozen)', () => {
      mockPool.activeBullets = [{ x: 100, y: 100, vx: 10, vy: 10, active: true }];
      physicsSystem.updateEntities(
        mockPool as PoolManager,
        0,
        800,
        600,
        mockPlayer as Player
      );
      expect(mockPool.activeBullets[0].x).toBe(100);
    });

    it('should handle extremely large dtFactor (lag spike)', () => {
      mockPool.activeBullets = [{ x: 100, y: 100, vx: 1, vy: 0, active: true }];
      // Simulate 1 second lag spike (60 frames)
      physicsSystem.updateEntities(
        mockPool as PoolManager,
        60,
        800,
        600,
        mockPlayer as Player
      );
      expect(mockPool.activeBullets[0].x).toBe(160);
    });

    it('should handle large dtFactor in collisions (teleportation protection)', () => {
      // If dtFactor is large, an enemy might "jump" over the player.
      // Current implementation doesn't have continuous collision detection (CCD).
      // Let's verify that a jump happens (expected behavior for non-CCD).
      const mockEnemy = {
        x: 350,
        y: 300,
        radius: 10,
        active: true,
        health: 10,
        damage: 1,
        behavior: {
          move: (e: any, _px: number, _py: number, dt: number) => {
            e.x += 100 * dt;
          },
        },
      };
      mockPool.activeEnemies = [mockEnemy];

      // Jump 1000 units in one frame (10 * 100)
      physicsSystem.updateEntities(
        mockPool as PoolManager,
        10,
        800,
        600,
        mockPlayer as Player
      );
      physicsSystem.handleCollisions(
        mockPool,
        mockPlayer,
        mockState,
        10,
        800,
        600,
        mockOnGameOver
      );

      // Now that movement happens BEFORE culling in the engine update loop,
      // the enemy should be culled in the same frame if its new position is off-screen.
      expect(mockEnemy.x).toBe(1350);
      expect(mockEnemy.active).toBe(false);
      expect(mockOnGameOver).not.toHaveBeenCalled();
    });
  });

  describe('Boundary Culling', () => {
    it('should deactivate enemies slightly off-screen (threshold)', () => {
      // Threshold is usually 100-200px
      const mockEnemy = {
        x: 1050, // Beyond 800 + threshold
        y: 300,
        radius: 10,
        active: true,
        damage: 1,
        behavior: { move: vi.fn() },
      };
      mockPool.activeEnemies = [mockEnemy];

      physicsSystem.handleCollisions(
        mockPool,
        mockPlayer,
        mockState,
        1,
        800,
        600,
        mockOnGameOver
      );
      expect(mockEnemy.active).toBe(false);
    });

    it('should NOT deactivate enemies exactly at the edge', () => {
      const mockEnemy = {
        x: 800,
        y: 300,
        radius: 10,
        active: true,
        damage: 1,
        behavior: { move: vi.fn() },
      };
      mockPool.activeEnemies = [mockEnemy];

      physicsSystem.handleCollisions(
        mockPool,
        mockPlayer,
        mockState,
        1,
        800,
        600,
        mockOnGameOver
      );
      expect(mockEnemy.active).toBe(true);
    });
  });

  describe('Player HP Edge Cases', () => {
    it('should clamp player HP at 0 and not call onGameOver twice', () => {
      const mockEnemy = {
        x: 405,
        y: 300,
        radius: 15,
        active: true,
        damage: 1,
        behavior: { move: vi.fn() },
      };
      mockPool.activeEnemies = [mockEnemy];
      mockPlayer.hp = 0.5;

      // Damage is ~0.8 per frame if no armor
      physicsSystem.handleCollisions(
        mockPool,
        mockPlayer,
        mockState,
        1,
        800,
        600,
        mockOnGameOver
      );

      expect(mockPlayer.hp).toBe(0);
      expect(mockOnGameOver).toHaveBeenCalledTimes(1);

      // Second call in next frame
      physicsSystem.handleCollisions(
        mockPool,
        mockPlayer,
        mockState,
        1,
        800,
        600,
        mockOnGameOver
      );
      expect(mockOnGameOver).toHaveBeenCalledTimes(1); // Still 1 due to isGameOverTriggered
    });
  });

  describe('XP Overflow / Level Up', () => {
    it('should handle massive XP gain in one frame', () => {
      mockPool.activeGems = [{ x: 400, y: 300, radius: 5, value: 1000, active: true }];
      mockPlayer.exp = 0;
      mockPlayer.nextLevelExp = 100;

      physicsSystem.handleCollisions(
        mockPool,
        mockPlayer,
        mockState,
        1,
        800,
        600,
        mockOnGameOver
      );

      expect(mockPlayer.exp).toBe(1000);
      expect(mockState.levelUpFreeze).toBeGreaterThan(0);
    });
  });
});
