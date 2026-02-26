/**
 * CombatSystem Tests
 *
 * Tests for combat mechanics including auto-fire, targeting, and bullet spawning.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CombatSystem } from '../services/combat/CombatSystem';
import { type Player, type GameState, MarketPosition } from '../types';
import { type PoolManager } from '../services/combat/PoolManager';

// Mock audio service
vi.mock('../services/audio', () => ({
  audio: {
    playShoot: vi.fn(),
    playCrit: vi.fn(),
  },
}));

// Mock BuffManager
vi.mock('../services/patterns/decorators/BuffManager', () => ({
  BuffManager: {
    isInitialized: vi.fn(() => true),
    getDecoratedStats: vi.fn(),
  },
}));

import { BuffManager } from '../services/patterns/decorators/BuffManager';

describe('CombatSystem', () => {
  let mockPool: any;
  let mockPlayer: Player;
  let mockState: GameState;
  let combatSystem: CombatSystem;

  beforeEach(() => {
    vi.clearAllMocks();
    combatSystem = CombatSystem.getInstance();

    // Default mock stats
    vi.mocked(BuffManager.getDecoratedStats).mockReturnValue({
      getFireRate: () => mockPlayer.fireRate,
      getDamage: () => mockPlayer.baseDamage,
      getProjectiles: () => mockPlayer.projectiles,
      getArea: () => mockPlayer.area,
      getLuck: () => mockPlayer.luck,
      getCritChance: () => mockPlayer.critChance,
    } as any);

    // Mock PoolManager
    mockPool = {
      activeEnemies: [],
      getBullet: vi.fn(),
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
      critChance: 0.1,
      critDamage: 2.0,
      projectiles: 1,
      area: 1,
      exp: 0,
      nextLevelExp: 100,
      level: 1,
      armor: 0,
      magnet: 1,
      lifesteal: 0,
      dodge: 0,
      regen: 0,
      invulnerabilityTimer: 0,
    };

    // Mock GameState
    mockState = {
      shake: 0,
      critFlash: 0,
      critFlashColor: '#fff',
      lastFireTime: 0,
      fireTimer: 0,
      dashTrail: [],
      bgCandles: [],
      currentBg: { r: 15, g: 23, b: 42 },
      spawnTimer: 0,
      lastTime: 0,
      bgUpdateFrameCounter: 0,
      levelUpFreeze: 0,
      isDashing: false,
      dashTimer: 0,
      dashCooldownTimer: 0,
      dashTrailAccumulator: 0,
      isGameOverTriggered: false,
      damageIndicators: [],
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
      atrPercent: 1,
      spawnRateMultiplier: 1,
      marketPosition: MarketPosition.LONG,
      isMoving: false,
      lastMoveX: 0,
    };
  });

  describe('processAutoFire', () => {
    it('should not fire when no enemies exist', () => {
      mockPool.activeEnemies = [];

      combatSystem.processAutoFire(
        mockPool as PoolManager,
        mockPlayer,
        mockState,
        1000
      );

      expect(mockPool.getBullet).not.toHaveBeenCalled();
    });

    it('should not fire when fire rate cooldown is active', () => {
      mockPool.activeEnemies = [{ x: 500, y: 300, radius: 15, speed: 2, active: true }];
      mockState.fireTimer = 100; // Accumulated 100ms
      mockPlayer.fireRate = 300;

      combatSystem.processAutoFire(mockPool as PoolManager, mockPlayer, mockState, 100); // +100 = 200 total

      expect(mockPool.getBullet).not.toHaveBeenCalled();
      expect(mockState.fireTimer).toBe(200);
    });

    it('should fire when cooldown has passed and enemy exists', () => {
      mockPool.activeEnemies = [{ x: 500, y: 300, radius: 15, speed: 2, active: true }];
      mockState.fireTimer = 0;
      mockPlayer.fireRate = 300;

      combatSystem.processAutoFire(mockPool as PoolManager, mockPlayer, mockState, 400);

      expect(mockPool.getBullet).toHaveBeenCalled();
    });

    it('should use decorated fire rate if BuffManager is initialized', () => {
      mockPool.activeEnemies = [{ x: 500, y: 300, radius: 15, speed: 2, active: true }];
      mockState.fireTimer = 0;

      // Decorated fire rate is 100ms
      vi.mocked(BuffManager.getDecoratedStats).mockReturnValue({
        getFireRate: () => 100,
        getProjectiles: () => 1,
        getDamage: () => 10,
        getArea: () => 1,
        getLuck: () => 0,
        getCritChance: () => 0.1,
      } as any);

      combatSystem.processAutoFire(mockPool as PoolManager, mockPlayer, mockState, 150);

      expect(mockPool.getBullet).toHaveBeenCalled();
    });

    it('should preserve fireTimer overflow when firing', () => {
      mockPool.activeEnemies = [{ x: 500, y: 300, radius: 15, speed: 2, active: true }];
      mockState.fireTimer = 0;
      mockPlayer.fireRate = 300;

      combatSystem.processAutoFire(
        mockPool as PoolManager,
        mockPlayer,
        mockState,
        1000
      );

      expect(mockState.fireTimer).toBe(700);
    });

    it('should fire multiple projectiles when player has projectiles > 1', () => {
      mockPool.activeEnemies = [{ x: 500, y: 300, radius: 15, speed: 2, active: true }];
      mockPlayer.projectiles = 3;
      mockState.lastFireTime = 0;

      combatSystem.processAutoFire(
        mockPool as PoolManager,
        mockPlayer,
        mockState,
        1000
      );

      expect(mockPool.getBullet).toHaveBeenCalledTimes(3);
    });
  });

  describe('targeting', () => {
    it('should target the nearest enemy', () => {
      // Far enemy
      mockPool.activeEnemies = [
        { x: 700, y: 300, radius: 15, speed: 2, active: true }, // 300 units away
        { x: 450, y: 300, radius: 15, speed: 2, active: true }, // 50 units away (closer)
      ];
      mockState.lastFireTime = 0;

      combatSystem.processAutoFire(
        mockPool as PoolManager,
        mockPlayer,
        mockState,
        1000
      );

      // Bullet should be fired towards the closer enemy (450, 300)
      const bulletCallArgs = mockPool.getBullet.mock.calls[0];
      const vx = bulletCallArgs[2]; // velocity x
      const vy = bulletCallArgs[3]; // velocity y

      // Direction should be roughly towards (450, 300) from (400, 300)
      // That's positive X direction, near-zero Y
      expect(vx).toBeGreaterThan(0);
      expect(Math.abs(vy)).toBeLessThan(5); // Increased tolerance for lead shooting
    });

    it('should not target off-screen enemies when screen dimensions provided', () => {
      // Enemy is outside the screen (screen is 800x600, enemy at x=1000)
      mockPool.activeEnemies = [
        { x: 1000, y: 300, radius: 15, speed: 2, active: true },
      ];
      mockState.fireTimer = 0;
      mockPlayer.fireRate = 300;

      // Provide screen dimensions - enemy is off-screen
      combatSystem.processAutoFire(
        mockPool as PoolManager,
        mockPlayer,
        mockState,
        1000,
        800,
        600
      );

      expect(mockPool.getBullet).not.toHaveBeenCalled();
    });

    it('should target on-screen enemy when screen dimensions provided', () => {
      // Enemy is inside the screen (screen is 800x600, enemy at x=500)
      mockPool.activeEnemies = [{ x: 500, y: 300, radius: 15, speed: 2, active: true }];
      mockState.fireTimer = 0;
      mockPlayer.fireRate = 300;

      // Provide screen dimensions - enemy is on-screen
      combatSystem.processAutoFire(
        mockPool as PoolManager,
        mockPlayer,
        mockState,
        1000,
        800,
        600
      );

      expect(mockPool.getBullet).toHaveBeenCalled();
    });

    it('should skip off-screen enemies and target on-screen one', () => {
      // Two enemies: one off-screen (closer), one on-screen (farther)
      mockPool.activeEnemies = [
        { x: -100, y: 300, radius: 15, speed: 2, active: true }, // Off-screen (left), 500 units away
        { x: 600, y: 300, radius: 15, speed: 2, active: true }, // On-screen, 200 units away
      ];
      mockState.fireTimer = 0;
      mockPlayer.fireRate = 300;

      combatSystem.processAutoFire(
        mockPool as PoolManager,
        mockPlayer,
        mockState,
        1000,
        800,
        600
      );

      // Bullet should target the on-screen enemy (600, 300)
      const bulletCallArgs = mockPool.getBullet.mock.calls[0];
      const vx = bulletCallArgs[2]; // velocity x

      // Direction should be positive X (towards 600, not -100)
      expect(vx).toBeGreaterThan(0);
    });
  });

  describe('damage calculation', () => {
    it('should use decorated damage for normal shots', () => {
      mockPool.activeEnemies = [{ x: 500, y: 300, radius: 15, speed: 2, active: true }];

      vi.mocked(BuffManager.getDecoratedStats).mockReturnValue({
        getFireRate: () => 300,
        getDamage: () => 50, // Decorated damage
        getProjectiles: () => 1,
        getArea: () => 1,
        getLuck: () => 0,
        getCritChance: () => 0,
      } as any);

      combatSystem.processAutoFire(
        mockPool as PoolManager,
        mockPlayer,
        mockState,
        1000
      );

      const bulletCallArgs = mockPool.getBullet.mock.calls[0];
      const damage = bulletCallArgs[4];

      expect(damage).toBe(50);
    });

    it('should apply decorated area to bullet radius', () => {
      mockPool.activeEnemies = [{ x: 500, y: 300, radius: 15, speed: 2, active: true }];

      vi.mocked(BuffManager.getDecoratedStats).mockReturnValue({
        getFireRate: () => 300,
        getDamage: () => 15,
        getProjectiles: () => 1,
        getArea: () => 2.0, // Decorated area
        getLuck: () => 0,
        getCritChance: () => 0,
      } as any);

      combatSystem.processAutoFire(
        mockPool as PoolManager,
        mockPlayer,
        mockState,
        1000
      );

      const bulletCallArgs = mockPool.getBullet.mock.calls[0];
      expect(bulletCallArgs).toBeDefined();
      const radius = bulletCallArgs![5];

      // Default radius is 4. area=2.0 -> 8. BUT with mobileMultiplier (default 1.25 on desktop) -> 10.
      expect(radius).toBe(11.25);
    });
  });

  describe('bullet spawning', () => {
    it('should spawn bullet at player position', () => {
      mockPool.activeEnemies = [{ x: 500, y: 300, radius: 15, speed: 2, active: true }];
      mockPlayer.x = 100;
      mockPlayer.y = 200;
      mockState.lastFireTime = 0;

      combatSystem.processAutoFire(
        mockPool as PoolManager,
        mockPlayer,
        mockState,
        1000
      );

      const bulletCallArgs = mockPool.getBullet.mock.calls[0];
      expect(bulletCallArgs).toBeDefined();
      const bulletX = bulletCallArgs![0];
      const bulletY = bulletCallArgs![1];

      expect(bulletX).toBe(100);
      expect(bulletY).toBe(200);
    });

    it('should spread projectiles when firing multiple', () => {
      mockPool.activeEnemies = [{ x: 500, y: 300, radius: 15, speed: 2, active: true }];

      vi.mocked(BuffManager.getDecoratedStats).mockReturnValue({
        getFireRate: () => 300,
        getDamage: () => 15,
        getProjectiles: () => 3, // Decorated projectiles
        getArea: () => 1,
        getLuck: () => 0,
        getCritChance: () => 0,
      } as any);

      combatSystem.processAutoFire(
        mockPool as PoolManager,
        mockPlayer,
        mockState,
        1000
      );

      // Get all velocity vectors
      const calls = mockPool.getBullet.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const velocities = calls.map((call: any[]) => ({
        vx: call[2],
        vy: call[3],
      }));

      // All 3 bullets should have different angles (spread)
      const angles = velocities.map((v: { vx: number; vy: number }) =>
        Math.atan2(v.vy, v.vx)
      );

      // Check that angles are different
      expect(angles[0]).not.toBe(angles[1]);
      expect(angles[1]).not.toBe(angles[2]);
    });
  });

  describe('crit behavior', () => {
    it('should pass crit flags to bullet', () => {
      mockPool.activeEnemies = [{ x: 500, y: 300, radius: 15, speed: 2, active: true }];

      vi.mocked(BuffManager.getDecoratedStats).mockReturnValue({
        getFireRate: () => 300,
        getDamage: () => 15,
        getProjectiles: () => 1,
        getArea: () => 1,
        getLuck: () => 0,
        getCritChance: () => 0, // No crits
      } as any);

      combatSystem.processAutoFire(
        mockPool as PoolManager,
        mockPlayer,
        mockState,
        1000
      );

      const bulletCallArgs = mockPool.getBullet.mock.calls[0];
      expect(bulletCallArgs).toBeDefined();
      const isCrit = bulletCallArgs![7];
      const isSuperCrit = bulletCallArgs![8];

      expect(isCrit).toBe(false);
      expect(isSuperCrit).toBe(false);
    });
  });
});
