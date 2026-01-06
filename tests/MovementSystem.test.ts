/**
 * MovementSystem Tests
 *
 * Tests physics movement for enemies, bullets, particles, and effects.
 * Also tests enemy movement strategies (ChaseStrategy, ZigZagStrategy, etc.)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MovementSystem } from '../services/physics/MovementSystem';
import { PoolManager } from '../services/PoolManager';
import {
  ChaseStrategy,
  StraightStrategy,
  ZigZagStrategy,
  CircleStrategy,
  SlowApproachStrategy,
  ExplosiveStrategy,
  GrowingStrategy,
  createMovementStrategy,
  createMarketMovementStrategy,
} from '../strategies/EnemyBehaviors';
import type { Player, Bullet, Particle, FloatingText } from '../types';
import type { GameEnemy } from '../factories/EnemyFactory';

// Mock DeviceBenchmarkService
vi.mock('../services/DeviceBenchmarkService', () => ({
  DeviceBenchmarkService: {
    getPerformanceConfig: () => ({
      particleMultiplier: 1.0,
      maxEnemies: 100,
      maxBullets: 200,
    }),
  },
}));

// Mock ParticleConfigService
vi.mock('../services/ParticleConfigService', () => ({
  ParticleConfigService: {
    trail: {
      spawnChance: 0.3,
      life: 0.5,
      radiusMultiplier: 0.5,
      speedMultiplier: 0.2,
    },
  },
}));

// Helper to create mock enemy
function createMockEnemy(overrides: Partial<GameEnemy> = {}): GameEnemy {
  const chaseStrategy = new ChaseStrategy();
  return {
    x: 100,
    y: 100,
    radius: 15,
    health: 10,
    maxHealth: 10,
    speed: 2,
    color: '#ff0000',
    type: 'bear',
    active: true,
    hasEnteredScreen: false,
    behavior: chaseStrategy,
    spawnTimer: 0.5,
    isDying: false,
    deathProgress: 0,
    xpValue: 10,
    valueMultiplier: 1,
    goldValue: 5,
    hasTriggeredNearMiss: false,
    ...overrides,
  } as GameEnemy;
}

// Helper to create mock player
function createMockPlayer(overrides: Partial<Player> = {}): Player {
  return {
    x: 400,
    y: 300,
    radius: 20,
    speed: 5,
    hp: 100,
    maxHp: 100,
    color: '#00ff00',
    level: 1,
    exp: 0,
    nextLevelExp: 100,
    baseDamage: 10,
    critChance: 0.05,
    critMultiplier: 2,
    fireRate: 5,
    projectileCount: 1,
    projectileArea: 1,
    armor: 0,
    luck: 0,
    ...overrides,
  } as Player;
}

// Helper to create mock bullet
function createMockBullet(overrides: Partial<Bullet> = {}): Bullet {
  return {
    x: 200,
    y: 200,
    vx: 10,
    vy: 0,
    radius: 5,
    color: '#ffff00',
    active: true,
    damage: 10,
    isCrit: false,
    ...overrides,
  } as Bullet;
}

// Helper to create mock particle
function createMockParticle(overrides: Partial<Particle> = {}): Particle {
  return {
    x: 150,
    y: 150,
    vx: 2,
    vy: -2,
    radius: 3,
    color: '#ffffff',
    life: 1.0,
    active: true,
    ...overrides,
  } as Particle;
}

// Helper to create mock floating text
function createMockFloatingText(overrides: Partial<FloatingText> = {}): FloatingText {
  return {
    x: 300,
    y: 300,
    text: '10',
    color: '#ffff00',
    life: 1.0,
    active: true,
    fontSize: 16,
    ...overrides,
  } as FloatingText;
}

describe('MovementSystem', () => {
  let pool: PoolManager;

  beforeEach(() => {
    pool = new PoolManager();
    // Seed random for deterministic tests where needed
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Enemy Movement', () => {
    it('should move enemies towards player', () => {
      const enemy = createMockEnemy({ x: 100, y: 100 });
      const player = createMockPlayer({ x: 200, y: 100 }); // Player to the right

      pool.activeEnemies.push(enemy);
      const initialX = enemy.x;

      MovementSystem.update(pool, 1.0, 800, 600, player);

      // Enemy should move towards player (to the right)
      expect(enemy.x).toBeGreaterThan(initialX);
    });

    it('should mark enemy as entered screen when visible', () => {
      const enemy = createMockEnemy({ x: 50, y: 50, hasEnteredScreen: false });
      const player = createMockPlayer();

      pool.activeEnemies.push(enemy);

      MovementSystem.update(pool, 1.0, 800, 600, player);

      expect(enemy.hasEnteredScreen).toBe(true);
    });

    it('should not mark off-screen enemy as entered', () => {
      const enemy = createMockEnemy({ x: -100, y: -100, hasEnteredScreen: false });
      const player = createMockPlayer();

      pool.activeEnemies.push(enemy);

      MovementSystem.update(pool, 1.0, 800, 600, player);

      expect(enemy.hasEnteredScreen).toBe(false);
    });
  });

  describe('Bullet Movement', () => {
    it('should move bullets based on velocity', () => {
      const bullet = createMockBullet({ x: 100, y: 100, vx: 10, vy: 5 });
      pool.activeBullets.push(bullet);

      MovementSystem.update(pool, 1.0, 800, 600, createMockPlayer());

      expect(bullet.x).toBe(110); // 100 + 10 * 1.0
      expect(bullet.y).toBe(105); // 100 + 5 * 1.0
    });

    it('should deactivate bullets that go off screen', () => {
      const bullet = createMockBullet({ x: 850, y: 300, vx: 100, vy: 0 });
      pool.activeBullets.push(bullet);

      MovementSystem.update(pool, 1.0, 800, 600, createMockPlayer());

      // After moving: x = 850 + 100 = 950, which is > 800 + 100 = 900
      expect(bullet.active).toBe(false);
    });

    it('should keep bullets active within bounds', () => {
      const bullet = createMockBullet({ x: 400, y: 300, vx: 5, vy: 0 });
      pool.activeBullets.push(bullet);

      MovementSystem.update(pool, 1.0, 800, 600, createMockPlayer());

      expect(bullet.active).toBe(true);
    });
  });

  describe('Particle Movement', () => {
    it('should move particles and decrease life', () => {
      const particle = createMockParticle({ x: 100, y: 100, vx: 5, vy: -5, life: 1.0 });
      pool.activeParticles.push(particle);

      MovementSystem.update(pool, 1.0, 800, 600, createMockPlayer());

      expect(particle.x).toBe(105); // 100 + 5 * 1.0
      expect(particle.y).toBe(95); // 100 + (-5) * 1.0
      expect(particle.life).toBeLessThan(1.0);
    });

    it('should deactivate particles when life reaches zero', () => {
      const particle = createMockParticle({ life: 0.01 });
      pool.activeParticles.push(particle);

      MovementSystem.update(pool, 1.0, 800, 600, createMockPlayer());

      expect(particle.active).toBe(false);
    });
  });

  describe('Floating Text Movement', () => {
    it('should move floating text upward and decrease life', () => {
      const text = createMockFloatingText({ y: 300, life: 1.0 });
      pool.activeFloatingTexts.push(text);

      MovementSystem.update(pool, 1.0, 800, 600, createMockPlayer());

      expect(text.y).toBeLessThan(300); // Moves up
      expect(text.life).toBeLessThan(1.0);
    });

    it('should deactivate floating text when life reaches zero', () => {
      const text = createMockFloatingText({ life: 0.01 });
      pool.activeFloatingTexts.push(text);

      MovementSystem.update(pool, 1.0, 800, 600, createMockPlayer());

      expect(text.active).toBe(false);
    });
  });

  describe('Dying Enemy Animation', () => {
    it('should progress death animation for dying enemies', () => {
      const enemy = createMockEnemy({ isDying: true, deathProgress: 0 });
      pool.activeEnemies.push(enemy);

      MovementSystem.update(pool, 1.0, 800, 600, createMockPlayer());

      expect(enemy.deathProgress).toBeGreaterThan(0);
    });

    it('should deactivate enemy when death animation completes', () => {
      const enemy = createMockEnemy({ isDying: true, deathProgress: 0.99 });
      pool.activeEnemies.push(enemy);

      MovementSystem.update(pool, 1.0, 800, 600, createMockPlayer());

      expect(enemy.active).toBe(false);
      expect(enemy.isDying).toBe(false);
      expect(enemy.deathProgress).toBe(0);
    });
  });

  describe('Delta Time Factor', () => {
    it('should scale movement by delta time factor', () => {
      const bullet = createMockBullet({ x: 100, y: 100, vx: 10, vy: 0 });
      pool.activeBullets.push(bullet);

      // Half speed (30 FPS equivalent)
      MovementSystem.update(pool, 0.5, 800, 600, createMockPlayer());

      expect(bullet.x).toBe(105); // 100 + 10 * 0.5
    });
  });
});

describe('Enemy Movement Strategies', () => {
  describe('ChaseStrategy', () => {
    it('should move enemy directly towards player', () => {
      const strategy = new ChaseStrategy();
      const enemy = createMockEnemy({ x: 0, y: 0, speed: 10 });

      strategy.move(enemy, 100, 0, 1.0); // Player at (100, 0)

      expect(enemy.x).toBe(10); // Moved 10 units right
      expect(enemy.y).toBe(0); // No vertical movement
    });

    it('should handle diagonal movement', () => {
      const strategy = new ChaseStrategy();
      const enemy = createMockEnemy({ x: 0, y: 0, speed: Math.sqrt(2) });

      strategy.move(enemy, 100, 100, 1.0); // Player at diagonal

      // Should move equally in both directions (normalized)
      expect(enemy.x).toBeCloseTo(1, 5);
      expect(enemy.y).toBeCloseTo(1, 5);
    });

    it('should not move if already at player position', () => {
      const strategy = new ChaseStrategy();
      const enemy = createMockEnemy({ x: 100, y: 100 });

      strategy.move(enemy, 100, 100, 1.0); // Same position

      expect(enemy.x).toBe(100);
      expect(enemy.y).toBe(100);
    });

    it('should have correct name', () => {
      expect(new ChaseStrategy().name).toBe('chase');
    });
  });

  describe('StraightStrategy', () => {
    it('should move slower than chase strategy', () => {
      const straightStrategy = new StraightStrategy(0.7);
      const chaseStrategy = new ChaseStrategy();

      const enemy1 = createMockEnemy({ x: 0, y: 0, speed: 10 });
      const enemy2 = createMockEnemy({ x: 0, y: 0, speed: 10 });

      straightStrategy.move(enemy1, 100, 0, 1.0);
      chaseStrategy.move(enemy2, 100, 0, 1.0);

      expect(enemy1.x).toBeLessThan(enemy2.x); // Straight is slower
      expect(enemy1.x).toBe(7); // 10 * 0.7
    });

    it('should use custom speed multiplier', () => {
      const strategy = new StraightStrategy(0.5);
      const enemy = createMockEnemy({ x: 0, y: 0, speed: 10 });

      strategy.move(enemy, 100, 0, 1.0);

      expect(enemy.x).toBe(5); // 10 * 0.5
    });

    it('should have correct name', () => {
      expect(new StraightStrategy().name).toBe('straight');
    });
  });

  describe('ZigZagStrategy', () => {
    it('should move with perpendicular oscillation', () => {
      const strategy = new ZigZagStrategy(3, 0.1);
      const enemy = createMockEnemy({ x: 0, y: 0, speed: 10 });

      // Capture initial position
      strategy.move(enemy, 100, 0, 1.0);
      const y1 = enemy.y;

      // Move more
      strategy.move(enemy, 100, 0, 1.0);
      const y2 = enemy.y;

      // Should have some vertical movement due to zigzag
      expect(Math.abs(y1) + Math.abs(y2)).toBeGreaterThan(0);
    });

    it('should progress towards player despite zigzag', () => {
      const strategy = new ZigZagStrategy(3, 0.1);
      const enemy = createMockEnemy({ x: 0, y: 0, speed: 10 });

      // Multiple moves
      for (let i = 0; i < 10; i++) {
        strategy.move(enemy, 100, 0, 1.0);
      }

      expect(enemy.x).toBeGreaterThan(50); // Should have progressed towards player
    });

    it('should have correct name', () => {
      expect(new ZigZagStrategy().name).toBe('zigzag');
    });
  });

  describe('CircleStrategy', () => {
    it('should circle when far from player', () => {
      const strategy = new CircleStrategy(0.02);
      const enemy = createMockEnemy({ x: 0, y: 0, speed: 5 });

      // Player at (300, 0) - far away (> 200 approach threshold)
      strategy.move(enemy, 300, 0, 1.0);

      // Should move towards circling position, not directly at player
      // The exact position depends on angle, but it should move
      expect(Math.abs(enemy.x) + Math.abs(enemy.y)).toBeGreaterThan(0);
    });

    it('should approach directly when close to player', () => {
      const strategy = new CircleStrategy(0.02);
      const enemy = createMockEnemy({ x: 50, y: 0, speed: 5 });

      // Player at (100, 0) - close (< 200 approach threshold)
      strategy.move(enemy, 100, 0, 1.0);

      // Should move directly towards player
      expect(enemy.x).toBeGreaterThan(50);
    });

    it('should have correct name', () => {
      expect(new CircleStrategy().name).toBe('circle');
    });
  });

  describe('SlowApproachStrategy', () => {
    it('should move at reduced speed', () => {
      const strategy = new SlowApproachStrategy(0.5);
      const enemy = createMockEnemy({ x: 0, y: 0, speed: 10 });

      strategy.move(enemy, 100, 0, 1.0);

      expect(enemy.x).toBe(5); // 10 * 0.5
    });

    it('should have correct name', () => {
      expect(new SlowApproachStrategy().name).toBe('slowApproach');
    });
  });

  describe('ExplosiveStrategy', () => {
    it('should move faster when close to player', () => {
      const strategy = new ExplosiveStrategy();

      // Far from player
      const enemyFar = createMockEnemy({ x: 0, y: 0, speed: 10 });
      strategy.move(enemyFar, 300, 0, 1.0); // 300 units away (> 150 rush distance)
      const farMovement = enemyFar.x;

      // Close to player
      const enemyClose = createMockEnemy({ x: 0, y: 0, speed: 10 });
      strategy.move(enemyClose, 100, 0, 1.0); // 100 units away (< 150 rush distance)
      const closeMovement = enemyClose.x;

      expect(closeMovement).toBeGreaterThan(farMovement); // Should be 1.5x faster
    });

    it('should have correct name', () => {
      expect(new ExplosiveStrategy().name).toBe('explosive');
    });
  });

  describe('GrowingStrategy', () => {
    it('should move with wave pattern', () => {
      const strategy = new GrowingStrategy();
      const enemy = createMockEnemy({ x: 0, y: 100, speed: 10 });

      strategy.move(enemy, 100, 100, 1.0);

      // Should move towards player with some wave offset
      expect(enemy.x).toBeGreaterThan(0);
    });

    it('should have correct name', () => {
      expect(new GrowingStrategy().name).toBe('growing');
    });
  });
});

describe('Strategy Factory', () => {
  describe('createMovementStrategy', () => {
    it('should create whale strategy', () => {
      const strategy = createMovementStrategy('whale');
      expect(strategy.name).toBe('slowApproach');
    });

    it('should create fud strategy', () => {
      const strategy = createMovementStrategy('fud');
      expect(strategy.name).toBe('zigzag');
    });

    it('should create bull strategy', () => {
      const strategy = createMovementStrategy('bull');
      expect(strategy.name).toBe('circle');
    });

    it('should create liquidator strategy', () => {
      const strategy = createMovementStrategy('liquidator');
      expect(strategy.name).toBe('explosive');
    });

    it('should create pumpdump strategy', () => {
      const strategy = createMovementStrategy('pumpdump');
      expect(strategy.name).toBe('growing');
    });

    it('should default to chase strategy for unknown types', () => {
      const strategy = createMovementStrategy('unknown');
      expect(strategy.name).toBe('chase');
    });

    it('should default to chase strategy for bear type', () => {
      const strategy = createMovementStrategy('bear');
      expect(strategy.name).toBe('chase');
    });
  });

  describe('createMarketMovementStrategy', () => {
    it('should create straight strategy for favorable market', () => {
      const strategy = createMarketMovementStrategy('straight');
      expect(strategy.name).toBe('straight');
    });

    it('should create zigzag strategy for unfavorable market', () => {
      const strategy = createMarketMovementStrategy('zigzag');
      expect(strategy.name).toBe('zigzag');
    });

    it('should create chase strategy for neutral market', () => {
      const strategy = createMarketMovementStrategy('chase');
      expect(strategy.name).toBe('chase');
    });

    it('should create circle strategy', () => {
      const strategy = createMarketMovementStrategy('circle');
      expect(strategy.name).toBe('circle');
    });
  });
});
