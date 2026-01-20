import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CollisionSystem } from '../../../services/physics/CollisionSystem';
import { type IPhysicsContext } from '../../../services/physics/PhysicsTypes';
import { type Player, type GameState, type Bullet } from '../../../types';
import { EventBus } from '../../../services/EventBus';
import { CombatResolutionService } from '../../../services/physics/CombatResolutionService';
import { DeviceProfile } from '../../../types/DeviceProfile';

// Mock Dependencies
vi.mock('../../../services/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(),
  },
}));

vi.mock('../../../services/physics/CombatResolutionService', () => ({
  CombatResolutionService: {
    handleEnemyDeath: vi.fn(),
  },
}));

vi.mock('../../../services/ThemeService', () => ({
  ThemeService: {
    isRetro: vi.fn(() => false),
  },
}));

describe('CollisionSystem', () => {
  let mockContext: IPhysicsContext;
  let mockPool: any; // Using any for partial mock convenience
  let mockPlayer: Player;
  let mockState: GameState;
  let onGameOver: any;
  let collisionSystem: CollisionSystem;

  beforeEach(() => {
    vi.clearAllMocks();

    // 1. Setup Mock Context
    mockContext = {
      audio: {
        playHit: vi.fn(),
        playCrit: vi.fn(),
        playGem: vi.fn(),
      },
      stats: {
        isInitialized: () => true,
        getMagnet: vi.fn(() => 100),
        getDodge: vi.fn(() => 0),
        getArmor: vi.fn(() => 0),
      },
      performance: {
        getPerformanceConfig: () => ({
          profile: DeviceProfile.MEDIUM,
          candleCount: 60,
          shadowsEnabled: true,
          glowEnabled: true,
          particleMultiplier: 1.0,
          maxEnemies: 100,
          gradientBackground: true,
          targetFPS: 60 as const,
        }),
      },
      particles: {
        collect: { count: 1, speed: 1, life: 1 },
        impact: { count: 3, speed: 2, life: 0.5 },
      },
      buffGems: {
        getActiveGems: vi.fn(() => []),
        collectGem: vi.fn(),
      },
      combo: {
        getXpMultiplier: vi.fn(() => 1),
      },
      cheat: {
        isGodMode: vi.fn(() => false),
      },
      bulletGrid: {
        getNearby: vi.fn(() => []),
        forEachNearby: vi.fn((_x: number, _y: number, _callback: (b: any) => void) => {
          // Default: no bullets nearby
        }),
      },
      constants: {
        GEM_MAGNET_BASE_RANGE: 100,
        ENEMY_OFFSCREEN_THRESHOLD: 100,
        BULLET_SPEED: 10,
        HIT_STOP_NORMAL: 5,
        HIT_STOP_CRIT: 10,
        NEAR_MISS_THRESHOLD: 50,
        getGameTime: () => 0,
      },
      statCaps: {
        MAX_MAGNET: 500,
        MAX_DODGE: 0.6,
        MAX_ARMOR: 50,
      },
    };

    // Inject the mock context
    collisionSystem = new CollisionSystem(mockContext);

    // 2. Setup Mock Data
    mockPool = {
      activeEnemies: [],
      activeInteractables: [], // Added missing property
      getFloatingText: vi.fn(),
      getParticle: vi.fn(() => ({ life: 1 })),
    };

    mockPlayer = {
      x: 0,
      y: 0,
      radius: 10,
      hp: 100,
      maxHp: 100,
      armor: 0,
      dodge: 0,
      invulnerabilityTimer: 0,
      level: 1,
      exp: 0,
      nextLevelExp: 100,
    } as Player;

    mockState = {
      shake: 0,
      critFlash: 0,
      damageIndicators: [],
      isDashing: false,
      isGameOverTriggered: false,
    } as unknown as GameState;

    onGameOver = vi.fn();
  });

  afterEach(() => {
    collisionSystem.resetContext();
  });

  describe('update (General)', () => {
    it('should cull off-screen enemies', () => {
      const offScreenEnemy = {
        x: -200, // Threshold is 100
        y: 0,
        radius: 10,
        active: true,
        isDying: false,
        behavior: { move: vi.fn() },
      };
      mockPool.activeEnemies = [offScreenEnemy];

      collisionSystem.update(mockPool, mockPlayer, mockState, 1, 800, 600, onGameOver);

      expect(offScreenEnemy.active).toBe(false);
    });

    it('should start spawn timer when enemy enters screen', () => {
      const enteringEnemy = {
        x: 50,
        y: 50,
        radius: 10,
        active: true,
        isDying: false,
        hasEnteredScreen: false,
        spawnTimer: 0,
        behavior: { move: vi.fn() },
      };
      mockPool.activeEnemies = [enteringEnemy];

      collisionSystem.update(mockPool, mockPlayer, mockState, 1, 800, 600, onGameOver);

      expect(enteringEnemy.hasEnteredScreen).toBe(true);
      expect(enteringEnemy.spawnTimer).toBeCloseTo(0.9);
    });

    it('should flush damage buffer when timer expires', () => {
      const enemy = {
        x: 100,
        y: 100,
        radius: 10,
        active: true,
        isDying: false,
        hasEnteredScreen: true,
        damageBuffer: 50,
        damageBufferTimer: 0.05, // Will drop <= 0 after 0.05 * dtFactor(1) is subtracted
        maxHealth: 100,
        behavior: { move: vi.fn() },
      };
      mockPool.activeEnemies = [enemy];

      collisionSystem.update(mockPool, mockPlayer, mockState, 1, 800, 600, onGameOver);

      // Should call getFloatingText
      expect(mockPool.getFloatingText).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.stringContaining('50'), // "50"
        expect.any(String),
        expect.any(Number)
      );
      // Buffer should reset
      expect(enemy.damageBuffer).toBe(0);
    });
  });

  describe('Player-Enemy Collision', () => {
    it('should deal damage to player when colliding', () => {
      const enemy = {
        x: 0, // Intersects with player at 0,0
        y: 0,
        radius: 10,
        active: true,
        isDying: false,
        hasEnteredScreen: true,
        behavior: { move: vi.fn() },
      };
      mockPool.activeEnemies = [enemy];

      // Force hit sound (random > 0.9)
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      collisionSystem.update(mockPool, mockPlayer, mockState, 1, 800, 600, onGameOver);

      expect(mockPlayer.hp).toBeLessThan(100);
      expect(mockContext.audio.playHit).toHaveBeenCalled();
      expect(mockState.shake).toBe(10);
    });

    it('should trigger Game Over if player hp drops to 0', () => {
      mockPlayer.hp = 0.1;
      const enemy = {
        x: 0,
        y: 0,
        radius: 10,
        active: true,
        isDying: false,
        hasEnteredScreen: true,
        behavior: { move: vi.fn() },
      };
      mockPool.activeEnemies = [enemy];

      collisionSystem.update(mockPool, mockPlayer, mockState, 1, 800, 600, onGameOver);

      expect(mockPlayer.hp).toBe(0);
      expect(onGameOver).toHaveBeenCalled();
      expect(mockState.isGameOverTriggered).toBe(true);
    });

    it('should respect God Mode (no damage)', () => {
      vi.mocked(mockContext.cheat.isGodMode).mockReturnValue(true);

      const enemy = {
        x: 0,
        y: 0,
        radius: 10,
        active: true,
        isDying: false,
        behavior: { move: vi.fn() },
      };
      mockPool.activeEnemies = [enemy];

      collisionSystem.update(mockPool, mockPlayer, mockState, 1, 800, 600, onGameOver);

      expect(mockPlayer.hp).toBe(100);
    });

    it('should apply armor reduction logic', () => {
      // Mock Armor = 10 -> Reduction should be 10 / (10+10) = 0.5 (50%)
      vi.mocked(mockContext.stats.getArmor).mockReturnValue(10);

      const enemy = {
        x: 0,
        y: 0,
        radius: 10,
        active: true,
        isDying: false,
        behavior: { move: vi.fn() },
      };
      mockPool.activeEnemies = [enemy];

      // Default damage multiplier is 0.8 * (1 - reduction)
      // Expected multiplier = 0.8 * 0.5 = 0.4
      // HP loss = 0.4 * dtFactor(1) = 0.4

      collisionSystem.update(mockPool, mockPlayer, mockState, 1, 800, 600, onGameOver);

      expect(mockPlayer.hp).toBeCloseTo(99.6, 5);
    });

    it('should succeed dodge if random check passes', () => {
      vi.mocked(mockContext.stats.getDodge).mockReturnValue(0.5);
      vi.spyOn(Math, 'random').mockReturnValue(0.1); // 0.1 < 0.5 -> Dodge Success

      const enemy = {
        x: 0,
        y: 0,
        radius: 10,
        active: true,
        isDying: false,
        behavior: { move: vi.fn() },
      };
      mockPool.activeEnemies = [enemy];

      collisionSystem.update(mockPool, mockPlayer, mockState, 1, 800, 600, onGameOver);

      expect(mockPlayer.hp).toBe(100);
      expect(mockPool.getFloatingText).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        'DODGE!',
        expect.any(String),
        expect.any(Number)
      );
    });
  });

  describe('Bullet-Enemy Collision', () => {
    it('should damage enemy and deactivate bullet', () => {
      const enemy = {
        x: 100,
        y: 100,
        radius: 20,
        active: true,
        health: 100,
        behavior: { move: vi.fn() },
      };
      mockPool.activeEnemies = [enemy];

      const bullet: Bullet = {
        x: 100,
        y: 100,
        radius: 5,
        active: true,
        damage: 10,
        vx: 0,
        vy: 0,
        color: '#fff',
      } as Bullet;

      // Mock spatial grid to call callback with our bullet
      vi.mocked(mockContext.bulletGrid.forEachNearby).mockImplementation(
        (_x: number, _y: number, callback: (b: any) => void) => {
          callback(bullet);
        }
      );

      collisionSystem.update(mockPool, mockPlayer, mockState, 1, 800, 600, onGameOver);

      expect(enemy.health).toBe(90);
      expect(bullet.active).toBe(false);
    });

    it('should show damage numbers immediately (buffering disabled)', () => {
      const enemy = {
        x: 100,
        y: 100,
        radius: 20,
        active: true,
        health: 100,
        damageBuffer: 0,
        behavior: { move: vi.fn() },
      };
      mockPool.activeEnemies = [enemy];
      const bullet = {
        x: 100,
        y: 100,
        radius: 5,
        active: true,
        damage: 10,
        vx: 0,
        vy: 0,
      } as Bullet;
      vi.mocked(mockContext.bulletGrid.forEachNearby).mockImplementation(
        (_x: number, _y: number, callback: (b: any) => void) => {
          callback(bullet);
        }
      );

      collisionSystem.update(mockPool, mockPlayer, mockState, 1, 800, 600, onGameOver);

      // Implementation now uses immediate flush (stacking disabled)
      expect(mockPool.getFloatingText).toHaveBeenCalled();
      // Buffer should be cleared after flush
      expect(enemy.damageBuffer).toBe(0);
    });

    it('should emit hitStop event on critical collision', () => {
      const enemy = {
        x: 100,
        y: 100,
        radius: 20,
        active: true,
        health: 100,
        behavior: { move: vi.fn() },
      };
      mockPool.activeEnemies = [enemy];
      const bullet = {
        x: 100,
        y: 100,
        radius: 5,
        active: true,
        damage: 10,
        vx: 0,
        vy: 0,
        isCrit: true,
      } as Bullet;
      vi.mocked(mockContext.bulletGrid.forEachNearby).mockImplementation(
        (_x: number, _y: number, callback: (b: any) => void) => {
          callback(bullet);
        }
      );

      collisionSystem.update(mockPool, mockPlayer, mockState, 1, 800, 600, onGameOver);

      expect(EventBus.emit).toHaveBeenCalledWith(
        'hitStop',
        expect.objectContaining({
          duration: 5, // HIT_STOP_NORMAL
          isCrit: true,
        })
      );
    });

    it('should handle enemy death', () => {
      const enemy = {
        x: 100,
        y: 100,
        radius: 20,
        active: true,
        health: 5, // Low HP
        behavior: { move: vi.fn() },
      };
      mockPool.activeEnemies = [enemy];
      const bullet = {
        x: 100,
        y: 100,
        radius: 5,
        active: true,
        damage: 10,
        vx: 0,
        vy: 0,
      } as Bullet;
      vi.mocked(mockContext.bulletGrid.forEachNearby).mockImplementation(
        (_x: number, _y: number, callback: (b: any) => void) => {
          callback(bullet);
        }
      );

      collisionSystem.update(mockPool, mockPlayer, mockState, 1, 800, 600, onGameOver);

      expect(enemy.health).toBeLessThanOrEqual(0);
      expect(CombatResolutionService.handleEnemyDeath).toHaveBeenCalledWith(
        mockPool,
        enemy,
        mockPlayer,
        false
      );
      // Should flush damage buffer immediately on death
      expect(mockPool.getFloatingText).toHaveBeenCalled();
    });

    it('should handle Crit hits correctly', () => {
      const enemy = {
        x: 100,
        y: 100,
        radius: 20,
        active: true,
        health: 100,
        damageBufferTimer: 0,
        behavior: { move: vi.fn() },
      };
      mockPool.activeEnemies = [enemy];
      const bullet = {
        x: 100,
        y: 100,
        radius: 5,
        active: true,
        damage: 10,
        vx: 0,
        vy: 0,
        isCrit: true,
        isSuperCrit: false,
        color: '#f00',
      } as Bullet;
      vi.mocked(mockContext.bulletGrid.forEachNearby).mockImplementation(
        (_x: number, _y: number, callback: (b: any) => void) => {
          callback(bullet);
        }
      );

      collisionSystem.update(mockPool, mockPlayer, mockState, 1, 800, 600, onGameOver);

      // Hit stop is immediate for crits
      expect(EventBus.emit).toHaveBeenCalledWith('hitStop', expect.any(Object));

      // Visuals should be immediate
      expect(mockState.critFlash).toBeGreaterThan(0);
      expect(mockPool.getParticle).toHaveBeenCalled();

      // With immediate flush (stacking disabled), floating text is shown right away
      expect(mockPool.getFloatingText).toHaveBeenCalled();
    });
  });
});
