import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CombatSystem } from '../../services/CombatSystem';
import { type IPoolManager } from '../../services/interfaces/IPoolManager';
import { type Player, type GameState, type Enemy } from '../../types';
import { BuffManager } from '../../services/patterns/decorators/BuffManager';
import { CheatManager } from '../../services/CheatManager';
import { COLORS, COMBAT } from '../../constants';

// Mock dependencies
vi.mock('../../services/renderers/CullingUtils', () => ({
  createViewportBounds: vi.fn(() => ({})),
  isCircleVisible: vi.fn(x => x < 1000), // Mock visibility: invisible if x >= 1000
}));

vi.mock('../../services/patterns/decorators/BuffManager', () => ({
  BuffManager: {
    isInitialized: vi.fn(() => false),
    getDecoratedStats: vi.fn(),
  },
}));

vi.mock('../../services/CheatManager', () => ({
  CheatManager: {
    isForcedCrit: vi.fn(() => false),
    isForcedSuperCrit: vi.fn(() => false),
  },
}));

vi.mock('../../services/ScreenService', () => ({
  screenService: {
    isMobile: vi.fn(() => false),
  },
}));

// Mock Audio
const mockAudio: any = {
  playShoot: vi.fn(),
  playHit: vi.fn(),
  playCrit: vi.fn(),
  playGem: vi.fn(),
  playLevelUp: vi.fn(),
  playDeath: vi.fn(),
  playButton: vi.fn(),
  setVolume: vi.fn(),
  getVolume: vi.fn(() => 1),
  getMuted: vi.fn(() => false),
  toggleMute: vi.fn(() => false),
};

// Mock Pool Manager
const mockPool: IPoolManager = {
  activeEnemies: [],
  activeBullets: [],
  activeGems: [],
  activeParticles: [],
  activeFloatingTexts: [],
  activeSpeedLines: [],
  activeInteractables: [],
  preWarm: vi.fn(),
  getEnemy: vi.fn(),
  getWhaleEnemy: vi.fn(),
  getBullet: vi.fn(),
  getGem: vi.fn(),
  getParticle: vi.fn(),
  getFloatingText: vi.fn(),
  getSpeedLine: vi.fn(),
  getInteractable: vi.fn(),
  cleanup: vi.fn(),
  clearAll: vi.fn(),
  trimFreeLists: vi.fn(),
};

// Mock Objects
const mockPlayer: Player = {
  x: 0,
  y: 0,
  hp: 100,
  maxHp: 100,
  exp: 0,
  level: 1,
  nextLevelExp: 100,
  baseDamage: 10,
  fireRate: 400,
  speed: 5,
  defense: 0,
  luck: 0,
  critChance: 0.1,
  critDamage: 1.5,
  area: 1,
  projectiles: 1,
  magnetRadius: 100,
  radius: 10,
} as any;

const mockGameState: GameState = {
  fireTimer: 0,
  isPlaying: true,
  isPaused: false,
  isGameOver: false,
  score: 0,
  wave: 1,
  enemiesKilled: 0,
  gameTime: 0,
} as any;

describe('CombatSystem', () => {
  let combatSystem: CombatSystem;

  beforeEach(() => {
    vi.clearAllMocks();
    combatSystem = new CombatSystem(mockAudio);
    // Reset defaults
    (mockPool as any).activeEnemies = [];
    mockGameState.fireTimer = 0;
    mockPlayer.critChance = 0.1;
    mockPlayer.baseDamage = 10;
    mockPlayer.projectiles = 1;

    // Reset cheats
    vi.mocked(CheatManager.isForcedCrit).mockReturnValue(false);
    vi.mocked(CheatManager.isForcedSuperCrit).mockReturnValue(false);

    // Reset BuffManager
    (BuffManager.isInitialized as any).mockReturnValue(false);
  });

  describe('Cooldown Management', () => {
    it('should fire bullets when cooldown is complete', () => {
      const enemy = createEnemy(100, 0);
      (mockPool as any).activeEnemies = [enemy];

      // Pass time > fireRate (400)
      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 500, 800, 600);

      expect(mockGameState.fireTimer).toBe(0); // Should reset
      expect(mockPool.getBullet).toHaveBeenCalled();
      expect(mockAudio.playShoot).toHaveBeenCalled();
    });

    it('should not fire if cooldown is incomplete', () => {
      const enemy = createEnemy(100, 0);
      (mockPool as any).activeEnemies = [enemy];

      // Pass time < fireRate
      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 100, 800, 600);

      expect(mockGameState.fireTimer).toBe(100); // Should accumulate
      expect(mockPool.getBullet).not.toHaveBeenCalled();
    });

    it('should respect capped fire rate', () => {
      const enemy = createEnemy(100, 0);
      (mockPool as any).activeEnemies = [enemy];
      // Mock super fast fire rate stats
      (BuffManager.isInitialized as any).mockReturnValue(true);
      (BuffManager.getDecoratedStats as any).mockReturnValue({
        getFireRate: () => 10, // insanely fast, should be capped at 50
        getProjectiles: () => 1,
        getLuck: () => 0,
        getCritChance: () => 0,
        getDamage: () => 10,
        getArea: () => 1,
      });

      // Pass time = 60ms (should fire if capped at 50)
      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 60, 800, 600);
      expect(mockPool.getBullet).toHaveBeenCalled();

      mockGameState.fireTimer = 0;
      // Pass time = 40ms (should NOT fire if capped at 50)
      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 40, 800, 600);
      expect(mockPool.getBullet).toHaveBeenCalledTimes(1); // No new call
    });
  });

  describe('Targeting & Culling', () => {
    it('should target nearest enemy', () => {
      const enemyNear = createEnemy(50, 0);
      const enemyFar = createEnemy(200, 0);
      (mockPool as any).activeEnemies = [enemyFar, enemyNear];

      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 500, 800, 600);

      expect(mockPool.getBullet).toHaveBeenCalled();
      const calls = vi.mocked(mockPool.getBullet).mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      const call = calls[0];
      if (!call) throw new Error('Call not found');
      const vx = call[2]; // getBullet(x, y, vx, vy, ...)
      expect(vx).toBeGreaterThan(0);
    });

    it('should calculate intercept for moving targets', () => {
      // Enemy moving UP at speed 5
      const enemy = createEnemy(100, 0);
      enemy.speed = 5;
      enemy.active = true;
      (mockPool as any).activeEnemies = [enemy];

      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 500, 800, 600);

      expect(mockPool.getBullet).toHaveBeenCalled();
      const calls = vi.mocked(mockPool.getBullet).mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      const call = calls[0];
      if (!call) throw new Error('Call not found');

      // Since enemy is moving directly at player, bullet should fire directly at enemy
      // No lead needed on Y axis
      const vy = call[3];
      expect(Math.abs(vy as number)).toBeLessThan(0.1);
    });

    it('should ignore off-screen enemies', () => {
      const enemyFar = createEnemy(2000, 0); // x=2000 is mocked as invisible
      (mockPool as any).activeEnemies = [enemyFar];

      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 500, 800, 600);

      expect(mockPool.getBullet).not.toHaveBeenCalled();
    });
  });

  describe('Damage & Crits', () => {
    it('should handle normal damage', () => {
      const enemy = createEnemy(100, 0);
      (mockPool as any).activeEnemies = [enemy];
      mockPlayer.critChance = 0; // No crit

      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 500, 800, 600);

      expect(mockPool.getBullet).toHaveBeenCalled();
      const call = vi.mocked(mockPool.getBullet).mock.calls[0];
      if (!call) throw new Error('Call not found');

      expect(call[4]).toBe(10); // Damage
      expect(call[7]).toBe(false); // isCrit
      expect(call[8]).toBe(false); // isSuperCrit
      expect(call[6]).toBe(COLORS.BULLET); // Color
    });

    it('should handle critical hits', () => {
      const enemy = createEnemy(100, 0);
      (mockPool as any).activeEnemies = [enemy];

      // Force crit via probability
      vi.spyOn(Math, 'random').mockReturnValue(0.05); // < 0.1 (critChance)
      mockPlayer.critChance = 0.1;

      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 500, 800, 600);

      expect(mockPool.getBullet).toHaveBeenCalled();
      const call = vi.mocked(mockPool.getBullet).mock.calls[0];
      if (!call) throw new Error('Call not found');
      const expectedDamage = 10 * COMBAT.CRIT_DAMAGE_MULTIPLIER;

      expect(call[4]).toBe(expectedDamage);
      expect(call[7]).toBe(true); // isCrit
      expect(call[6]).toBe(COLORS.CRIT);
    });

    it('should handle super crits via CheatManager', () => {
      const enemy = createEnemy(100, 0);
      (mockPool as any).activeEnemies = [enemy];

      vi.mocked(CheatManager.isForcedSuperCrit).mockReturnValue(true);

      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 500, 800, 600);

      expect(mockPool.getBullet).toHaveBeenCalled();
      const call = vi.mocked(mockPool.getBullet).mock.calls[0];
      if (!call) throw new Error('Call not found');
      const expectedDamage = 10 * COMBAT.SUPER_CRIT_DAMAGE_MULTIPLIER;

      expect(call[4]).toBe(expectedDamage);
      expect(call[8]).toBe(true); // isSuperCrit
      expect(call[6]).toBe(COLORS.SUPER_CRIT);
    });
  });

  describe('Projectile Spawning', () => {
    it('should spawn multiple projectiles with spread', () => {
      const enemy = createEnemy(100, 0);
      (mockPool as any).activeEnemies = [enemy];

      // 3 Projectiles
      mockPlayer.projectiles = 3;

      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 500, 800, 600);

      expect(mockPool.getBullet).toHaveBeenCalledTimes(3);

      const calls = vi.mocked(mockPool.getBullet).mock.calls;

      // Check spread angles
      // Center (index 1) should be straight (vy ~ 0)
      const centerCall = calls[1];
      if (centerCall) {
        expect(Math.abs(centerCall[3])).toBeLessThan(0.1);
      }

      // Top/Bottom (indices 0 and 2) should have y component
      const topCall = calls[0];
      const bottomCall = calls[2];

      if (topCall && bottomCall) {
        expect(topCall[3]).not.toBe(0);
        expect(bottomCall[3]).not.toBe(0);
      }
    });

    it('should scale projectile size based on area stat', () => {
      const enemy = createEnemy(100, 0);
      (mockPool as any).activeEnemies = [enemy];
      mockPlayer.area = 2.0;

      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 500, 800, 600);

      expect(mockPool.getBullet).toHaveBeenCalled();
      const call = vi.mocked(mockPool.getBullet).mock.calls[0];
      if (!call) throw new Error('Call not found');
      const radius = call[5];

      // Base radius * area(2) * multipliers
      expect(radius).toBeGreaterThan(COMBAT.PROJECTILE_RADIUS_BASE);
    });
  });
});

function createEnemy(x: number, y: number): Enemy {
  return {
    x,
    y,
    active: true,
    radius: 10,
    hp: 10,
    maxHp: 10,
    speed: 1,
    type: 'basic',
    damage: 1,
    xpValue: 1,
    id: Math.random(),
  } as any;
}
