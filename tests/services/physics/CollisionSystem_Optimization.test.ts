import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CollisionSystem } from '../../../services/physics/CollisionSystem';
import { type IPhysicsContext } from '../../../services/physics/PhysicsTypes';
import { type Player, type GameState, type Bullet } from '../../../types';
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
    handleEnemyDeath: vi.fn((_pool, enemy) => {
      enemy.isDying = true;
    }),
  },
}));

vi.mock('../../../services/ThemeService', () => ({
  ThemeService: {
    isRetro: vi.fn(() => false),
  },
}));

describe('CollisionSystem Optimization', () => {
  let mockContext: IPhysicsContext;
  let mockPool: any;
  let mockPlayer: Player;
  let mockState: GameState;
  let onGameOver: any;
  let collisionSystem: CollisionSystem;

  beforeEach(() => {
    vi.clearAllMocks();

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

    collisionSystem = new CollisionSystem(mockContext);

    mockPool = {
      activeEnemies: [],
      activeInteractables: [],
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

  it('should handle multiple lethal bullets hitting same enemy in same frame', () => {
    // Setup enemy with low health
    const enemy = {
      x: 100,
      y: 100,
      radius: 20,
      active: true,
      health: 5,
      maxHealth: 100,
      behavior: { move: vi.fn() },
    };
    mockPool.activeEnemies = [enemy];

    // Setup two lethal bullets
    const bullet1 = { x: 100, y: 100, radius: 5, active: true, damage: 10, vx: 0, vy: 0 } as Bullet;
    const bullet2 = { x: 100, y: 100, radius: 5, active: true, damage: 10, vx: 0, vy: 0 } as Bullet;

    // Mock grid to return both bullets
    vi.mocked(mockContext.bulletGrid.forEachNearby).mockImplementation(
      (_x: number, _y: number, callback: (b: any) => void) => {
        callback(bullet1);
        callback(bullet2);
      }
    );

    collisionSystem.update(mockPool, mockPlayer, mockState, 1, 800, 600, onGameOver);

    // Expect death to be handled EXACTLY once
    expect(CombatResolutionService.handleEnemyDeath).toHaveBeenCalledTimes(1);

    // Expect both bullets to be deactivated (or maybe only one if we stop processing?)
    // If we stop processing, bullet2 might remain active?
    // Let's see what happens. If we optimize to early return, bullet2 won't be processed.
    // If bullet2 is not processed, it remains active?
    // That's acceptable behavior for "bullet passed through dying enemy".
    // But verify what happens.
  });
});
