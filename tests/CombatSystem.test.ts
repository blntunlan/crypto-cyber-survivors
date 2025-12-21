/**
 * CombatSystem Tests
 *
 * Tests for combat mechanics including auto-fire, targeting, and bullet spawning.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CombatSystem } from '../services/CombatSystem';
import { type Player, type GameState } from '../types';
import { type PoolManager } from '../services/poolManager';

// Mock audio service
vi.mock('../services/audioService', () => ({
  audio: {
    playShoot: vi.fn(),
    playCrit: vi.fn(),
  },
}));

describe('CombatSystem', () => {
  let mockPool: any;
  let mockPlayer: Player;
  let mockState: GameState;

  beforeEach(() => {
    vi.clearAllMocks();

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
      bgCandles: [],
      currentBg: { r: 15, g: 23, b: 42 },
      spawnTimer: 0,
      lastTime: 0,
      levelUpFreeze: 0,
      isDashing: false,
      dashTimer: 0,
      dashCooldownTimer: 0,
      dashTrailAccumulator: 0,
    };
  });

  describe('processAutoFire', () => {
    it('should not fire when no enemies exist', () => {
      mockPool.activeEnemies = [];

      CombatSystem.processAutoFire(mockPool as PoolManager, mockPlayer, mockState, 1000);

      expect(mockPool.getBullet).not.toHaveBeenCalled();
    });

    it('should not fire when fire rate cooldown is active', () => {
      mockPool.activeEnemies = [{ x: 500, y: 300, radius: 15, speed: 2 }];
      mockState.fireTimer = 100; // Accumulated 100ms
      mockPlayer.fireRate = 300;

      CombatSystem.processAutoFire(mockPool as PoolManager, mockPlayer, mockState, 100); // +100 = 200 total

      expect(mockPool.getBullet).not.toHaveBeenCalled();
      expect(mockState.fireTimer).toBe(200);
    });

    it('should fire when cooldown has passed and enemy exists', () => {
      mockPool.activeEnemies = [{ x: 500, y: 300, radius: 15, speed: 2 }];
      mockState.fireTimer = 0;
      mockPlayer.fireRate = 300;

      CombatSystem.processAutoFire(mockPool as PoolManager, mockPlayer, mockState, 400);

      expect(mockPool.getBullet).toHaveBeenCalled();
    });

    it('should reset fireTimer when firing', () => {
      mockPool.activeEnemies = [{ x: 500, y: 300, radius: 15, speed: 2 }];
      mockState.fireTimer = 0;
      mockPlayer.fireRate = 300;

      CombatSystem.processAutoFire(mockPool as PoolManager, mockPlayer, mockState, 1000);

      expect(mockState.fireTimer).toBe(0);
    });

    it('should fire multiple projectiles when player has projectiles > 1', () => {
      mockPool.activeEnemies = [{ x: 500, y: 300, radius: 15, speed: 2 }];
      mockPlayer.projectiles = 3;
      mockState.lastFireTime = 0;

      CombatSystem.processAutoFire(mockPool as PoolManager, mockPlayer, mockState, 1000);

      expect(mockPool.getBullet).toHaveBeenCalledTimes(3);
    });
  });

  describe('targeting', () => {
    it('should target the nearest enemy', () => {
      // Far enemy
      mockPool.activeEnemies = [
        { x: 700, y: 300, radius: 15, speed: 2 }, // 300 units away
        { x: 450, y: 300, radius: 15, speed: 2 }, // 50 units away (closer)
      ];
      mockState.lastFireTime = 0;

      CombatSystem.processAutoFire(mockPool as PoolManager, mockPlayer, mockState, 1000);

      // Bullet should be fired towards the closer enemy (450, 300)
      const bulletCallArgs = mockPool.getBullet.mock.calls[0];
      const vx = bulletCallArgs[2]; // velocity x
      const vy = bulletCallArgs[3]; // velocity y

      // Direction should be roughly towards (450, 300) from (400, 300)
      // That's positive X direction, near-zero Y
      expect(vx).toBeGreaterThan(0);
      expect(Math.abs(vy)).toBeLessThan(1); // Nearly horizontal
    });
  });

  describe('damage calculation', () => {
    it('should use base damage for normal shots', () => {
      mockPool.activeEnemies = [{ x: 500, y: 300, radius: 15, speed: 2 }];
      mockPlayer.baseDamage = 20;
      mockPlayer.critChance = 0; // No crits
      mockState.lastFireTime = 0;

      CombatSystem.processAutoFire(mockPool as PoolManager, mockPlayer, mockState, 1000);

      const bulletCallArgs = mockPool.getBullet.mock.calls[0];
      const damage = bulletCallArgs[4];

      expect(damage).toBe(20);
    });

    it('should apply player area to bullet radius', () => {
      mockPool.activeEnemies = [{ x: 500, y: 300, radius: 15, speed: 2 }];
      mockPlayer.area = 2; // Double area
      mockPlayer.critChance = 0;
      mockState.lastFireTime = 0;

      CombatSystem.processAutoFire(mockPool as PoolManager, mockPlayer, mockState, 1000);

      const bulletCallArgs = mockPool.getBullet.mock.calls[0];
      const radius = bulletCallArgs[5];

      // Default radius is 4 * area
      expect(radius).toBe(8);
    });
  });

  describe('bullet spawning', () => {
    it('should spawn bullet at player position', () => {
      mockPool.activeEnemies = [{ x: 500, y: 300, radius: 15, speed: 2 }];
      mockPlayer.x = 100;
      mockPlayer.y = 200;
      mockState.lastFireTime = 0;

      CombatSystem.processAutoFire(mockPool as PoolManager, mockPlayer, mockState, 1000);

      const bulletCallArgs = mockPool.getBullet.mock.calls[0];
      const bulletX = bulletCallArgs[0];
      const bulletY = bulletCallArgs[1];

      expect(bulletX).toBe(100);
      expect(bulletY).toBe(200);
    });

    it('should spread projectiles when firing multiple', () => {
      mockPool.activeEnemies = [{ x: 500, y: 300, radius: 15, speed: 2 }];
      mockPlayer.projectiles = 3;
      mockState.lastFireTime = 0;

      CombatSystem.processAutoFire(mockPool as PoolManager, mockPlayer, mockState, 1000);

      // Get all velocity vectors
      const velocities = mockPool.getBullet.mock.calls.map((call: number[]) => ({
        vx: call[2],
        vy: call[3],
      }));

      // All 3 bullets should have different angles (spread)
      const angles = velocities.map((v: { vx: number; vy: number }) => Math.atan2(v.vy, v.vx));

      // Check that angles are different
      expect(angles[0]).not.toBe(angles[1]);
      expect(angles[1]).not.toBe(angles[2]);
    });
  });

  describe('crit behavior', () => {
    it('should pass crit flags to bullet', () => {
      mockPool.activeEnemies = [{ x: 500, y: 300, radius: 15, speed: 2 }];
      mockPlayer.critChance = 0; // No crits for predictable test
      mockState.lastFireTime = 0;

      CombatSystem.processAutoFire(mockPool as PoolManager, mockPlayer, mockState, 1000);

      const bulletCallArgs = mockPool.getBullet.mock.calls[0];
      const isCrit = bulletCallArgs[7];
      const isSuperCrit = bulletCallArgs[8];

      expect(isCrit).toBe(false);
      expect(isSuperCrit).toBe(false);
    });
  });
});
