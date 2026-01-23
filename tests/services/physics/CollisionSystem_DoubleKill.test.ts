import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CollisionSystem } from '../../../services/physics/CollisionSystem';
import { type IPhysicsContext } from '../../../services/physics/PhysicsTypes';
import { type Player, type GameState, type Bullet, type Enemy } from '../../../types';
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
    handleEnemyDeath: vi.fn((pool, enemy) => {
        enemy.isDying = true; // Simulate what the real service does
    }),
  },
}));

vi.mock('../../../services/ThemeService', () => ({
  ThemeService: {
    isRetro: vi.fn(() => false),
  },
}));

describe('CollisionSystem Double Kill Reproduction', () => {
  let mockContext: IPhysicsContext;
  let mockPool: any;
  let mockPlayer: Player;
  let mockState: GameState;
  let onGameOver: any;
  let collisionSystem: CollisionSystem;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContext = {
      audio: { playHit: vi.fn(), playCrit: vi.fn(), playGem: vi.fn() },
      stats: { isInitialized: () => true, getMagnet: vi.fn(() => 100), getDodge: vi.fn(() => 0), getArmor: vi.fn(() => 0) },
      performance: { getPerformanceConfig: () => ({ profile: DeviceProfile.MEDIUM, particleMultiplier: 1.0 }) },
      particles: { collect: { count: 1, speed: 1, life: 1 }, impact: { count: 3, speed: 2, life: 0.5 } },
      buffGems: { getActiveGems: vi.fn(() => []), collectGem: vi.fn() },
      combo: { getXpMultiplier: vi.fn(() => 1) },
      cheat: { isGodMode: vi.fn(() => false) },
      bulletGrid: {
        getNearby: vi.fn(() => []),
        forEachNearby: vi.fn(), // Will be mocked per test
      },
      constants: {
        GEM_MAGNET_BASE_RANGE: 100, ENEMY_OFFSCREEN_THRESHOLD: 100, BULLET_SPEED: 10,
        HIT_STOP_NORMAL: 5, HIT_STOP_CRIT: 10, NEAR_MISS_THRESHOLD: 50, getGameTime: () => 0
      },
      statCaps: { MAX_MAGNET: 500, MAX_DODGE: 0.6, MAX_ARMOR: 50 },
    } as unknown as IPhysicsContext;

    collisionSystem = new CollisionSystem(mockContext);

    mockPool = {
      activeEnemies: [],
      activeInteractables: [],
      getFloatingText: vi.fn(),
      getParticle: vi.fn(() => ({ life: 1 })),
    };

    mockPlayer = { x: 0, y: 0, radius: 10, hp: 100 } as Player;
    mockState = { shake: 0, critFlash: 0, damageIndicators: [], isDashing: false } as unknown as GameState;
    onGameOver = vi.fn();
  });

  it('demonstrates that handleEnemyDeath is called twice for multiple lethal hits in one frame', () => {
    const enemy: Enemy = {
      x: 100, y: 100, radius: 20, active: true, health: 10, maxHealth: 20,
      isDying: false, hasEnteredScreen: true,
      behavior: { move: vi.fn() },
    } as unknown as Enemy;

    mockPool.activeEnemies = [enemy];

    const bullet1 = { x: 100, y: 100, radius: 5, active: true, damage: 10, vx: 0, vy: 0, color: '#fff' } as Bullet;
    const bullet2 = { x: 100, y: 100, radius: 5, active: true, damage: 10, vx: 0, vy: 0, color: '#fff' } as Bullet;

    // Simulate spatial grid returning both bullets
    vi.mocked(mockContext.bulletGrid.forEachNearby).mockImplementation(
      (_x: number, _y: number, callback: (b: any) => void) => {
        callback(bullet1);
        callback(bullet2);
      }
    );

    collisionSystem.update(mockPool, mockPlayer, mockState, 1, 800, 600, onGameOver);

    // Assert that handleEnemyDeath was called ONCE (fixing the bug)
    expect(CombatResolutionService.handleEnemyDeath).toHaveBeenCalledTimes(1);

    // Verify only the first bullet applied damage (the second was skipped because enemy was dying)
    expect(enemy.health).toBe(0);
  });
});
