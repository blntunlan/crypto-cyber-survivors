import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CombatSystem } from '../../services/CombatSystem';
import { type IPoolManager } from '../../services/interfaces/IPoolManager';
import { type Player, type GameState, type Enemy } from '../../types';
import { BuffManager } from '../../services/patterns/decorators/BuffManager';

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

const mockPool: IPoolManager = {
  activeEnemies: [],
  activeBullets: [],
  activeGems: [],
  activeParticles: [],
  activeFloatingTexts: [],
  activeSpeedLines: [],
  preWarm: vi.fn(),
  getEnemy: vi.fn(),
  getWhaleEnemy: vi.fn(),
  getBullet: vi.fn(),
  getGem: vi.fn(),
  getParticle: vi.fn(),
  getFloatingText: vi.fn(),
  getSpeedLine: vi.fn(),
  cleanup: vi.fn(),
  clearAll: vi.fn(),
  trimFreeLists: vi.fn(),
};

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
  // Add other required PlayerStats if necessary (since it extends PlayerStats)
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
    (mockPool as any).activeEnemies = [];
  });

  it('should fire bullets when enemy is in range and cooldown is ready', () => {
    const enemy: Enemy = {
      x: 100,
      y: 0,
      active: true,
      radius: 10,
      health: 10,
      maxHealth: 10,
      speed: 1,
      type: 'basic' as any,
      color: 'red',
    } as any;
    (mockPool as any).activeEnemies = [enemy];

    mockGameState.fireTimer = 0;

    // Pass 500ms, which is > 400ms (fireRate) and > 50ms (cap)
    combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 500, 800, 600);

    expect(mockGameState.fireTimer).toBe(0);
    expect(mockPool.getBullet).toHaveBeenCalled();
    expect(mockAudio.playShoot).toHaveBeenCalled();
  });

  it('should not fire if cooldown is not ready', () => {
    const enemy: Enemy = {
      x: 100,
      y: 0,
      active: true,
      radius: 10,
      health: 10,
      maxHealth: 10,
      speed: 1,
      type: 'basic' as any,
      color: 'red',
    } as any;
    (mockPool as any).activeEnemies = [enemy];

    mockGameState.fireTimer = 0;
    // delta 100ms < 400ms fireRate (default)
    combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 100, 800, 600);

    expect(mockPool.getBullet).not.toHaveBeenCalled();
    expect(mockGameState.fireTimer).toBe(100);
  });

  it('should not fire if no enemies are present', () => {
    (mockPool as any).activeEnemies = [];
    mockGameState.fireTimer = 0;

    combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 500, 800, 600);

    expect(mockPool.getBullet).not.toHaveBeenCalled();
  });

  it('should target nearest enemy', () => {
    const enemyNear: Enemy = {
      x: 50,
      y: 0,
      active: true,
      radius: 10,
      hp: 10,
      maxHp: 10,
      speed: 1,
      type: 'basic',
      damage: 1,
      xpValue: 1,
      id: 1,
    } as any;
    const enemyFar: Enemy = {
      x: 200,
      y: 0,
      active: true,
      radius: 10,
      hp: 10,
      maxHp: 10,
      speed: 1,
      type: 'basic',
      damage: 1,
      xpValue: 1,
      id: 2,
    } as any;
    (mockPool as any).activeEnemies = [enemyFar, enemyNear];

    // Use >400ms
    combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 500, 800, 600);

    expect(mockPool.getBullet).toHaveBeenCalledWith(
      expect.any(Number), // x
      expect.any(Number), // y
      expect.any(Number), // vx
      expect.any(Number), // vy
      expect.any(Number), // damage
      expect.any(Number), // radius
      expect.any(String), // color
      expect.any(Boolean), // isCrit
      expect.any(Boolean) // isSuperCrit
    );

    const call = (mockPool.getBullet as any).mock.calls[0];
    const vx = call[2];

    expect(vx).toBeGreaterThan(0);
  });

  it('should ignore off-screen enemies depending on visibility', () => {
    // Enemy way off screen (mocked to be invisible if x > 1000)
    const enemyFar: Enemy = {
      x: 2000,
      y: 0,
      active: true,
      radius: 10,
      hp: 10,
      maxHp: 10,
      speed: 1,
      type: 'basic',
      damage: 1,
      xpValue: 1,
      id: 1,
    } as any;
    (mockPool as any).activeEnemies = [enemyFar];

    combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 500, 800, 600);

    expect(mockPool.getBullet).not.toHaveBeenCalled();
  });

  it('should respect BuffManager modifiers', () => {
    const enemy: Enemy = {
      x: 100,
      y: 0,
      active: true,
      radius: 10,
      maxHp: 10,
      hp: 10,
      speed: 1,
      type: 'basic',
      damage: 1,
      xpValue: 1,
      id: 1,
    } as any;
    (mockPool as any).activeEnemies = [enemy];
    mockGameState.fireTimer = 0;

    (BuffManager.isInitialized as any).mockReturnValue(true);
    (BuffManager.getDecoratedStats as any).mockReturnValue({
      getFireRate: () => 60, // 60ms fire rate (valid > 50 cap)
      getProjectiles: () => 5,
      getLuck: () => 0,
      getCritChance: () => 0,
      getDamage: () => 20,
      getArea: () => 1,
    });

    // Pass delta > 60
    combatSystem.processAutoFire(mockPool, mockPlayer, mockGameState, 70, 800, 600);

    expect(mockPool.getBullet).toHaveBeenCalled();
    expect(mockAudio.playShoot).toHaveBeenCalled();
  });
});
