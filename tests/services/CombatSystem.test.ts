import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CombatSystem } from '../../services/combat/CombatSystem';
import { type IPlayerStats } from '../../services/patterns/decorators/IPlayerStats';
import { type Player, type GameState } from '../../types';
import { type GameEnemy } from '../../factories/EnemyFactory';
import { BuffManager } from '../../services/patterns/decorators/BuffManager';
import { CheatManager } from '../../services/system/CheatManager';
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

vi.mock('../../services/system/CheatManager', () => ({
  CheatManager: {
    isForcedCrit: vi.fn(() => false),
    isForcedSuperCrit: vi.fn(() => false),
  },
}));

vi.mock('../../services/system/ScreenService', () => ({
  screenService: {
    isMobile: vi.fn(() => false),
  },
}));

// Mock Audio
const mockAudio = {
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
const mockPool = {
  activeEnemies: [] as GameEnemy[],
  activeBullets: [],
  activeGems: [],
  activeParticles: [],
  activeFloatingTexts: [],
  activeSpeedLines: [],
  activeInteractables: [],
  preWarm: vi.fn(),
  getEnemy: vi.fn(),
  getWhaleEnemy: vi.fn(),
  getBullet: vi.fn(() => ({})), // Return empty object to prevent weaponId assignment error
  getGem: vi.fn(),
  getParticle: vi.fn(),
  getFloatingText: vi.fn(),
  getSpeedLine: vi.fn(),
  getInteractable: vi.fn(),
  cleanup: vi.fn(),
  clearAll: vi.fn(),
  trimFreeLists: vi.fn(),
  releaseEnemy: vi.fn(),
  releaseBullet: vi.fn(),
  releaseGem: vi.fn(),
  releaseParticle: vi.fn(),
  releaseFloatingText: vi.fn(),
  releaseSpeedLine: vi.fn(),
  releaseInteractable: vi.fn(),
  activeImpactRings: [],
  getImpactRing: vi.fn(),
  releaseImpactRing: vi.fn(),
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
} as unknown as Player;

const mockGameState: GameState = {
  fireTimer: 0,
  isPlaying: true,
  isPaused: false,
  isGameOver: false,
  score: 0,
  wave: 1,
  enemiesKilled: 0,
  gameTime: 0,
} as unknown as GameState;

describe('CombatSystem', () => {
  let combatSystem: CombatSystem;

  beforeEach(() => {
    vi.clearAllMocks();
    // Access private constructor via unknown cast to allow injection of mockAudio
    combatSystem = new (CombatSystem as unknown as new (
      audio: typeof mockAudio
    ) => CombatSystem)(mockAudio);
    // Reset defaults
    mockPool.activeEnemies = [];
    mockGameState.fireTimer = 0;
    mockPlayer.critChance = 0.1;
    mockPlayer.baseDamage = 10;
    mockPlayer.projectiles = 1;
    mockPlayer.x = 0;
    mockPlayer.y = 0;

    // Reset cheats
    vi.mocked(CheatManager.isForcedCrit).mockReturnValue(false);
    vi.mocked(CheatManager.isForcedSuperCrit).mockReturnValue(false);

    // Reset BuffManager
    vi.mocked(BuffManager.isInitialized).mockReturnValue(false);
  });

  describe('Cooldown Management', () => {
    it('should fire bullets when cooldown is complete', () => {
      const enemy = createEnemy(100, 0);
      mockPool.activeEnemies = [enemy];

      // Pass time > fireRate (400)
      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 500, 800, 600);

      expect(mockGameState.fireTimer).toBe(100); // Should accumulate (500 - 400)
      expect(mockPool.getBullet).toHaveBeenCalled();
      expect(mockAudio.playShoot).toHaveBeenCalled();
    });

    it('should not fire if cooldown is incomplete', () => {
      const enemy = createEnemy(100, 0);
      mockPool.activeEnemies = [enemy];

      // Pass time < fireRate
      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 100, 800, 600);

      expect(mockGameState.fireTimer).toBe(100); // Should accumulate
      expect(mockPool.getBullet).not.toHaveBeenCalled();
    });

    it('should respect capped fire rate', () => {
      const enemy = createEnemy(100, 0);
      mockPool.activeEnemies = [enemy];
      // Mock super fast fire rate stats
      vi.mocked(BuffManager.isInitialized).mockReturnValue(true);
      vi.mocked(BuffManager.getDecoratedStats).mockReturnValue({
        getFireRate: () => 10, // insanely fast, should be capped at 50
        getProjectiles: () => 1,
        getLuck: () => 0,
        getCritChance: () => 0,
        getDamage: () => 10,
        getArea: () => 1,
      } as unknown as IPlayerStats);

      // Pass time = 60ms (should fire if capped at 50)
      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 60, 800, 600);
      expect(mockPool.getBullet).toHaveBeenCalled();

      mockGameState.fireTimer = 0;
      // Pass time = 40ms (should NOT fire if capped at 50)
      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 40, 800, 600);
      expect(mockPool.getBullet).toHaveBeenCalledTimes(1); // No new call
    });

    it('should not fire when no enemies exist', () => {
      mockPool.activeEnemies = [];
      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 1000, 800, 600);
      expect(mockPool.getBullet).not.toHaveBeenCalled();
    });

    it('should use decorated fire rate if BuffManager is initialized', () => {
      const enemy = createEnemy(100, 0);
      mockPool.activeEnemies = [enemy];
      mockGameState.fireTimer = 0;

      vi.mocked(BuffManager.isInitialized).mockReturnValue(true);
      vi.mocked(BuffManager.getDecoratedStats).mockReturnValue({
        getFireRate: () => 100,
        getProjectiles: () => 1,
        getDamage: () => 10,
        getArea: () => 1,
        getLuck: () => 0,
        getCritChance: () => 0.1,
      } as unknown as IPlayerStats);

      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 150, 800, 600);
      expect(mockPool.getBullet).toHaveBeenCalled();
    });

    it('should preserve fireTimer overflow when firing', () => {
      const enemy = createEnemy(100, 0);
      mockPool.activeEnemies = [enemy];
      mockGameState.fireTimer = 0;
      mockPlayer.fireRate = 300;

      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 1000, 800, 600);
      expect(mockGameState.fireTimer).toBe(700); // 1000 - 300
    });
  });

  describe('Targeting & Culling', () => {
    it('should target nearest enemy', () => {
      const enemyNear = createEnemy(50, 0);
      const enemyFar = createEnemy(200, 0);
      mockPool.activeEnemies = [enemyFar, enemyNear];

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
      const enemy = createEnemy(100, 0);
      enemy.speed = 5;
      enemy.active = true;
      mockPool.activeEnemies = [enemy];

      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 500, 800, 600);

      expect(mockPool.getBullet).toHaveBeenCalled();
      const calls = vi.mocked(mockPool.getBullet).mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      const call = calls[0];
      if (!call) throw new Error('Call not found');

      const vy = call[3];
      expect(Math.abs(vy as number)).toBeLessThan(0.1);
    });

    it('should ignore off-screen enemies', () => {
      const enemyFar = createEnemy(2000, 0); // x=2000 is mocked as invisible
      mockPool.activeEnemies = [enemyFar];

      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 500, 800, 600);

      expect(mockPool.getBullet).not.toHaveBeenCalled();
    });

    it('should target on-screen enemy when screen dimensions provided', () => {
      const enemy = createEnemy(500, 0); // on-screen
      mockPool.activeEnemies = [enemy];
      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 500, 800, 600);
      expect(mockPool.getBullet).toHaveBeenCalled();
    });

    it('should skip off-screen enemies and target on-screen one', () => {
      const enemyOff = createEnemy(2000, 0); // off-screen
      const enemyOn = createEnemy(500, 0); // on-screen
      mockPool.activeEnemies = [enemyOff, enemyOn];

      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 500, 800, 600);

      expect(mockPool.getBullet).toHaveBeenCalled();
      const call = vi.mocked(mockPool.getBullet).mock.calls[0];
      expect(call).toBeDefined();
      expect(call![2]).toBeGreaterThan(0); // fires toward positive x (on-screen)
    });
  });

  describe('Damage & Crits', () => {
    it('should handle normal damage', () => {
      const enemy = createEnemy(100, 0);
      mockPool.activeEnemies = [enemy];
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
      mockPool.activeEnemies = [enemy];

      vi.spyOn(Math, 'random').mockReturnValue(0.05); // < 0.1 (critChance)
      mockPlayer.critChance = 0.1;

      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 500, 800, 600);

      expect(mockPool.getBullet).toHaveBeenCalled();
      const call = vi.mocked(mockPool.getBullet).mock.calls[0];
      if (!call) throw new Error('Call not found');
      const expectedDamage = 10 * COMBAT.CRIT_MULTIPLIER;
      expect(call[4]).toBe(expectedDamage);
      expect(call[7]).toBe(true); // isCrit
      expect(call[6]).toBe(COLORS.CRIT);
    });

    it('should handle super crits via CheatManager', () => {
      const enemy = createEnemy(100, 0);
      mockPool.activeEnemies = [enemy];

      vi.mocked(CheatManager.isForcedSuperCrit).mockReturnValue(true);

      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 500, 800, 600);

      expect(mockPool.getBullet).toHaveBeenCalled();
      const call = vi.mocked(mockPool.getBullet).mock.calls[0];
      if (!call) throw new Error('Call not found');
      const expectedDamage = 10 * COMBAT.SUPER_CRIT_MULTIPLIER;
      expect(call[4]).toBe(expectedDamage);
      expect(call[8]).toBe(true); // isSuperCrit
      expect(call[6]).toBe(COLORS.SUPER_CRIT);
    });

    it('should use decorated damage for normal shots', () => {
      const enemy = createEnemy(100, 0);
      mockPool.activeEnemies = [enemy];

      vi.mocked(BuffManager.isInitialized).mockReturnValue(true);
      vi.mocked(BuffManager.getDecoratedStats).mockReturnValue({
        getFireRate: () => 300,
        getDamage: () => 50,
        getProjectiles: () => 1,
        getArea: () => 1,
        getLuck: () => 0,
        getCritChance: () => 0,
      } as unknown as IPlayerStats);

      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 500, 800, 600);

      const call = vi.mocked(mockPool.getBullet).mock.calls[0];
      expect(call).toBeDefined();
      expect(call![4]).toBe(50);
    });
  });

  describe('Projectile Spawning', () => {
    it('should spawn bullet at player position', () => {
      const enemy = createEnemy(100, 0);
      mockPool.activeEnemies = [enemy];
      mockPlayer.x = 123;
      mockPlayer.y = 456;

      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 500, 800, 600);

      expect(mockPool.getBullet).toHaveBeenCalled();
      const call = vi.mocked(mockPool.getBullet).mock.calls[0];
      expect(call).toBeDefined();
      expect(call![0]).toBe(123);
      expect(call![1]).toBe(456);
    });

    it('should spawn multiple projectiles with spread', () => {
      const enemy = createEnemy(100, 0);
      mockPool.activeEnemies = [enemy];

      mockPlayer.projectiles = 3;

      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 500, 800, 600);

      expect(mockPool.getBullet).toHaveBeenCalledTimes(3);

      const calls = vi.mocked(mockPool.getBullet).mock.calls;

      const centerCall = calls[1];
      if (centerCall) {
        expect(Math.abs(centerCall[3])).toBeLessThan(0.1);
      }

      const topCall = calls[0];
      const bottomCall = calls[2];

      if (topCall && bottomCall) {
        expect(topCall[3]).not.toBe(0);
        expect(bottomCall[3]).not.toBe(0);
      }
    });

    it('should scale projectile size based on area stat', () => {
      const enemy = createEnemy(100, 0);
      mockPool.activeEnemies = [enemy];
      mockPlayer.area = 2.0;

      combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 500, 800, 600);

      expect(mockPool.getBullet).toHaveBeenCalled();
      const call = vi.mocked(mockPool.getBullet).mock.calls[0];
      if (!call) throw new Error('Call not found');
      const radius = call[5];

      expect(radius).toBeGreaterThan(COMBAT.PROJECTILE_RADIUS_BASE);
    });
  });
});

function createEnemy(x: number, y: number): GameEnemy {
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
    behavior: 'basic',
  } as unknown as GameEnemy;
}
