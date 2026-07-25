/**
 * MovementSystem Tests
 *
 * Tests physics movement for enemies, bullets, particles, and effects.
 * Also tests enemy movement strategies (ChaseStrategy, ZigZagStrategy, etc.)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MovementSystem } from '../services/combat/physics/MovementSystem';
import { enemyGrid } from '../services/combat/SpatialGrid';
import { PoolManager } from '../services/combat/PoolManager';
import {
  ChaseStrategy,
  StraightStrategy,
  ZigZagStrategy,
  CircleStrategy,
  SlowApproachStrategy,
  ExplosiveStrategy,
  GrowingStrategy,
  AbsorbStrategy,
  PredictiveStrategy,
  createMovementStrategy,
  createMarketMovementStrategy,
} from '../strategies/EnemyBehaviors';
import type { Player, Bullet, Particle, FloatingText } from '../types';
import type { GameEnemy } from '../factories/EnemyFactory';

// Mock DeviceBenchmarkService
vi.mock('../services/system/DeviceBenchmarkService', () => ({
  DeviceBenchmarkService: {
    getPerformanceConfig: () => ({
      particleMultiplier: 1.0,
      maxEnemies: 100,
      maxBullets: 200,
    }),
  },
}));

// Mock ParticleConfigService
vi.mock('../services/system/ParticleConfigService', () => ({
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
  let movementSystem: MovementSystem;

  beforeEach(() => {
    pool = PoolManager.getInstance();
    movementSystem = new MovementSystem();
    // Seed random for deterministic tests where needed
    let randVal = 0.5;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      randVal = (randVal + 0.13) % 1.0;
      return randVal;
    });
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

      movementSystem.update(pool, 1.0, 800, 600, player);

      // Enemy should move towards player (to the right)
      expect(enemy.x).toBeGreaterThan(initialX);
    });

    it('should mark enemy as entered screen when visible', () => {
      const enemy = createMockEnemy({ x: 50, y: 50, hasEnteredScreen: false });
      const player = createMockPlayer();

      pool.activeEnemies.push(enemy);

      movementSystem.update(pool, 1.0, 800, 600, player);

      expect(enemy.hasEnteredScreen).toBe(true);
    });

    it('should not mark off-screen enemy as entered', () => {
      const enemy = createMockEnemy({ x: -100, y: -100, hasEnteredScreen: false });
      const player = createMockPlayer();

      pool.activeEnemies.push(enemy);

      movementSystem.update(pool, 1.0, 800, 600, player);

      expect(enemy.hasEnteredScreen).toBe(false);
    });

    it('should set spawnTimer and mark as entered when first appearing on screen', () => {
      const enemy = createMockEnemy({
        x: 50,
        y: 50,
        hasEnteredScreen: false,
        spawnTimer: 0,
      });
      pool.activeEnemies.push(enemy);

      movementSystem.update(pool, 1.0, 800, 600, createMockPlayer());

      expect(enemy.hasEnteredScreen).toBe(true);
      expect(enemy.spawnTimer).toBe(1.0);
    });

    it('should decrement spawnTimer for enemies already on screen', () => {
      const enemy = createMockEnemy({
        hasEnteredScreen: true,
        spawnTimer: 1.0,
      });
      pool.activeEnemies.push(enemy);

      movementSystem.update(pool, 1.0, 800, 600, createMockPlayer());

      expect(enemy.spawnTimer).toBeCloseTo(0.9);
    });

    it('should not move dying enemies', () => {
      const enemy = createMockEnemy({
        x: 100,
        y: 100,
        isDying: true,
      });
      const player = createMockPlayer({ x: 200, y: 100 });

      pool.activeEnemies.push(enemy);

      movementSystem.update(pool, 1.0, 800, 600, player);

      expect(enemy.x).toBe(100); // Should not have moved
    });

    it('applies and expires enemy movement slow from game-time updates', () => {
      pool.clearAll();
      const move = vi.fn();
      const enemy = createMockEnemy({
        hasEnteredScreen: true,
        movementSlowTimerMs: 2500,
        movementSlowMultiplier: 0.5,
        behavior: { name: 'slow-test', move },
      });
      const player = createMockPlayer();
      pool.activeEnemies.push(enemy);

      movementSystem.update(pool, 1, 800, 600, player);

      expect(move).toHaveBeenLastCalledWith(enemy, player.x, player.y, 0.5);

      for (let update = 1; update < 150; update++) {
        movementSystem.update(pool, 1, 800, 600, player);
      }

      expect(enemy.movementSlowTimerMs).toBe(0);
      expect(enemy.movementSlowMultiplier).toBe(1);

      movementSystem.update(pool, 1, 800, 600, player);
      expect(move).toHaveBeenLastCalledWith(enemy, player.x, player.y, 1);
      pool.clearAll();
    });

    it('clears movement slow state before a dying enemy returns to the pool', () => {
      pool.clearAll();
      const move = vi.fn();
      const enemy = createMockEnemy({
        isDying: true,
        movementSlowTimerMs: 2000,
        movementSlowMultiplier: 0.5,
        behavior: { name: 'dying-slow-test', move },
      });
      pool.activeEnemies.push(enemy);

      movementSystem.update(pool, 1, 800, 600, createMockPlayer());

      expect(enemy.movementSlowTimerMs).toBe(0);
      expect(enemy.movementSlowMultiplier).toBe(1);
      expect(move).not.toHaveBeenCalled();
      pool.clearAll();
    });
  });

  describe('Bullet Movement', () => {
    it('reuses a fixed trail buffer across updates', () => {
      const bullet = createMockBullet({
        x: 100,
        y: 100,
        vx: 0,
        vy: 0,
        weaponId: 'quantum_bullet',
      });
      pool.activeBullets.push(bullet);

      movementSystem.update(pool, 1, 800, 600, createMockPlayer());
      const trail = bullet.trail as unknown as {
        x: Float32Array;
        y: Float32Array;
        age: Float32Array;
        count: number;
      };
      const xBuffer = trail.x;
      const yBuffer = trail.y;
      const ageBuffer = trail.age;

      for (let i = 0; i < 100; i++) {
        movementSystem.update(pool, 1, 800, 600, createMockPlayer());
      }

      expect(trail.x).toBe(xBuffer);
      expect(trail.y).toBe(yBuffer);
      expect(trail.age).toBe(ageBuffer);
      expect(trail.count).toBeLessThanOrEqual(16);
    });

    it('should move bullets based on velocity', () => {
      const bullet = createMockBullet({ x: 100, y: 100, vx: 10, vy: 5 });
      pool.activeBullets.push(bullet);

      movementSystem.update(pool, 1.0, 800, 600, createMockPlayer());

      expect(bullet.x).toBe(110); // 100 + 10 * 1.0
      expect(bullet.y).toBe(105); // 100 + 5 * 1.0
    });

    it('should deactivate bullets that go off screen', () => {
      const bullet = createMockBullet({ x: 850, y: 300, vx: 100, vy: 0 });
      pool.activeBullets.push(bullet);

      movementSystem.update(pool, 1.0, 800, 600, createMockPlayer());

      // After moving: x = 850 + 100 = 950, which is > 800 + 100 = 900
      expect(bullet.active).toBe(false);
    });

    it('should keep bullets active within bounds', () => {
      const bullet = createMockBullet({ x: 400, y: 300, vx: 5, vy: 0 });
      pool.activeBullets.push(bullet);

      movementSystem.update(pool, 1.0, 800, 600, createMockPlayer());

      expect(bullet.active).toBe(true);
    });
  });

  describe('Particle Movement', () => {
    it('should move particles and decrease life', () => {
      const particle = createMockParticle({ x: 100, y: 100, vx: 5, vy: -5, life: 1.0 });
      pool.activeParticles.push(particle);

      movementSystem.update(pool, 1.0, 800, 600, createMockPlayer());

      expect(particle.x).toBe(105); // 100 + 5 * 1.0
      expect(particle.y).toBe(95); // 100 + (-5) * 1.0
      expect(particle.life).toBeLessThan(1.0);
    });

    it('should deactivate particles when life reaches zero', () => {
      const particle = createMockParticle({ life: 0.01 });
      pool.activeParticles.push(particle);

      movementSystem.update(pool, 1.0, 800, 600, createMockPlayer());

      expect(particle.active).toBe(false);
    });
  });

  describe('Floating Text Movement', () => {
    it('should move floating text upward and decrease life', () => {
      const text = createMockFloatingText({ y: 300, life: 1.0 });
      pool.activeFloatingTexts.push(text);

      movementSystem.update(pool, 1.0, 800, 600, createMockPlayer());

      expect(text.y).toBeLessThan(300); // Moves up
      expect(text.life).toBeLessThan(1.0);
    });

    it('applies pooled reward travel velocity while preserving ascent', () => {
      const text = createMockFloatingText({ x: 300, y: 300, vx: -2, vy: 0.5 });
      pool.activeFloatingTexts.push(text);

      movementSystem.update(pool, 1.0, 800, 600, createMockPlayer());

      expect(text.x).toBe(298);
      expect(text.y).toBe(299);
    });

    it.each([
      ['above', 100, -1.2],
      ['well below', 700, 1.2],
    ] as const)(
      'velocity-only cache reveal reduces distance to a player %s the cache',
      (_direction, playerY, velocityY) => {
        const text = createMockFloatingText({
          x: 300,
          y: 300,
          vx: 0,
          vy: velocityY,
          velocityOnly: true,
        });
        const initialDistance = Math.abs(playerY - text.y);
        pool.activeFloatingTexts.push(text);

        movementSystem.update(pool, 1, 800, 800, createMockPlayer({ y: playerY }));

        expect(Math.abs(playerY - text.y)).toBeLessThan(initialDistance);
      }
    );

    it('keeps reduced-motion pooled text stationary while its life decays', () => {
      const text = createMockFloatingText({
        x: 300,
        y: 300,
        vx: -2,
        vy: 0.5,
        stationary: true,
      });
      pool.activeFloatingTexts.push(text);

      movementSystem.update(pool, 1.0, 800, 600, createMockPlayer());

      expect(text.x).toBe(300);
      expect(text.y).toBe(300);
      expect(text.life).toBeLessThan(1);
    });

    it('should deactivate floating text when life reaches zero', () => {
      const text = createMockFloatingText({ life: 0.01 });
      pool.activeFloatingTexts.push(text);

      movementSystem.update(pool, 1.0, 800, 600, createMockPlayer());

      expect(text.active).toBe(false);
    });
  });

  describe('Impact Ring Movement', () => {
    it('should expand impact rings and decrease life', () => {
      const ring = pool.getImpactRing(100, 100, 8, 40, '#ff0000', 3);

      movementSystem.update(pool, 1.0, 800, 600, createMockPlayer());

      expect(ring.radius).toBeGreaterThan(8);
      expect(ring.life).toBeLessThan(1);
      expect(ring.active).toBe(true);
    });

    it('should deactivate impact rings when life reaches zero', () => {
      const ring = pool.getImpactRing(100, 100, 8, 40, '#ff0000', 3);
      ring.life = 0.01;

      movementSystem.update(pool, 1.0, 800, 600, createMockPlayer());

      expect(ring.active).toBe(false);
    });
  });

  describe('Dying Enemy Animation', () => {
    it('should progress death animation for dying enemies', () => {
      const enemy = createMockEnemy({ isDying: true, deathProgress: 0 });
      pool.activeEnemies.push(enemy);

      movementSystem.update(pool, 1.0, 800, 600, createMockPlayer());

      expect(enemy.deathProgress).toBeGreaterThan(0);
    });

    it('should deactivate enemy when death animation completes', () => {
      const enemy = createMockEnemy({ isDying: true, deathProgress: 0.99 });
      pool.activeEnemies.push(enemy);

      movementSystem.update(pool, 1.0, 800, 600, createMockPlayer());

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
      movementSystem.update(pool, 0.5, 800, 600, createMockPlayer());

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

describe('PredictiveStrategy', () => {
  it('normalizes observed player velocity by delta time', () => {
    const fullFrameStrategy = new PredictiveStrategy();
    const halfFrameStrategy = new PredictiveStrategy();
    const fullFrameEnemy = createMockEnemy({ x: 0, y: 0, speed: 10 });
    const halfFrameEnemy = createMockEnemy({ x: 0, y: 0, speed: 10 });

    fullFrameStrategy.move(fullFrameEnemy, 100, 0, 1);
    halfFrameStrategy.move(halfFrameEnemy, 105, 5, 0.5);
    fullFrameEnemy.x = 0;
    fullFrameEnemy.y = 0;
    halfFrameEnemy.x = 0;
    halfFrameEnemy.y = 0;

    fullFrameStrategy.move(fullFrameEnemy, 110, 10, 1);
    halfFrameStrategy.move(halfFrameEnemy, 110, 10, 0.5);

    expect(halfFrameEnemy.x * 2).toBeCloseTo(fullFrameEnemy.x, 10);
    expect(halfFrameEnemy.y * 2).toBeCloseTo(fullFrameEnemy.y, 10);
  });
});

describe('AbsorbStrategy', () => {
  it('preserves every growth pulse across a large delta', () => {
    const splitStrategy = new AbsorbStrategy();
    const combinedStrategy = new AbsorbStrategy();
    const splitEnemy = createMockEnemy({
      x: 0,
      y: 0,
      speed: 0,
      radius: 10,
      damage: 10,
    });
    const combinedEnemy = createMockEnemy({
      x: 0,
      y: 0,
      speed: 0,
      radius: 10,
      damage: 10,
    });

    splitStrategy.move(splitEnemy, 100, 0, 180);
    splitStrategy.move(splitEnemy, 100, 0, 180);
    combinedStrategy.move(combinedEnemy, 100, 0, 360);

    expect(combinedEnemy.radius).toBe(splitEnemy.radius);
    expect(combinedEnemy.damage).toBe(splitEnemy.damage);
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

describe('Enemy Separation Steering', () => {
  let pool: PoolManager;
  let movementSystem: MovementSystem;

  beforeEach(() => {
    pool = PoolManager.getInstance();
    movementSystem = new MovementSystem();
    let randVal = 0.5;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      randVal = (randVal + 0.13) % 1.0;
      return randVal;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const updateGrid = () => {
    enemyGrid.clear();
    pool.activeEnemies.forEach(e => enemyGrid.insert(e));
  };

  it('should push overlapping enemies apart', () => {
    // Two enemies at exact same position - should be pushed apart
    const enemy1 = createMockEnemy({
      x: 100,
      y: 100,
      radius: 15,
      hasEnteredScreen: true,
    });
    const enemy2 = createMockEnemy({
      x: 100,
      y: 100,
      radius: 15,
      hasEnteredScreen: true,
    });

    pool.activeEnemies.push(enemy1, enemy2);

    // Run update multiple times to trigger separation (it's throttled)
    for (let i = 0; i < 10; i++) {
      updateGrid();
      movementSystem.update(pool, 1.0, 800, 600, createMockPlayer());
    }

    // Enemies should have moved apart
    const dx = enemy2.x - enemy1.x;
    const dy = enemy2.y - enemy1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // After separation, distance should be greater than 0
    expect(distance).toBeGreaterThan(0);
  });

  it('should not affect enemies that are far apart', () => {
    // Two enemies far apart - should not affect each other
    const enemy1 = createMockEnemy({
      x: 100,
      y: 100,
      radius: 15,
      hasEnteredScreen: true,
    });
    const enemy2 = createMockEnemy({
      x: 500,
      y: 500,
      radius: 15,
      hasEnteredScreen: true,
    });

    pool.activeEnemies.push(enemy1, enemy2);

    // Store initial positions (after behavior movement)
    const player = createMockPlayer({ x: 300, y: 300 });

    // Run one update to apply behavior
    movementSystem.update(pool, 1.0, 800, 600, player);
    const enemy1XAfter1 = enemy1.x;
    const enemy2XAfter1 = enemy2.x;

    // Run more updates
    for (let i = 0; i < 5; i++) {
      updateGrid();
      movementSystem.update(pool, 1.0, 800, 600, player);
    }

    // Both enemies should only move towards player, not be affected by separation
    // (since they're far apart)
    expect(enemy1.x).toBeGreaterThan(enemy1XAfter1); // Moved towards player
    expect(enemy2.x).toBeLessThan(enemy2XAfter1); // Moved towards player (from right)
  });

  it('should not apply separation to dying enemies', () => {
    const enemy1 = createMockEnemy({
      x: 100,
      y: 100,
      radius: 15,
      hasEnteredScreen: true,
      isDying: true,
    });
    const enemy2 = createMockEnemy({
      x: 100,
      y: 100,
      radius: 15,
      hasEnteredScreen: true,
    });

    pool.activeEnemies.push(enemy1, enemy2);

    for (let i = 0; i < 6; i++) {
      updateGrid();
      movementSystem.update(pool, 1.0, 800, 600, createMockPlayer());
    }

    // Dying enemy should not have moved due to separation
    // (only death animation progress should change)
    expect(enemy1.x).toBe(100);
    expect(enemy1.y).toBe(100);
  });

  it('should not apply separation to enemies that have not entered screen', () => {
    const enemy1 = createMockEnemy({
      x: -100,
      y: -100,
      radius: 15,
      hasEnteredScreen: false,
    });
    const enemy2 = createMockEnemy({
      x: -100,
      y: -100,
      radius: 15,
      hasEnteredScreen: false,
    });

    pool.activeEnemies.push(enemy1, enemy2);

    for (let i = 0; i < 6; i++) {
      updateGrid();
      movementSystem.update(pool, 1.0, 800, 600, createMockPlayer());
    }

    // Both enemies should only be affected by behavior movement, not separation
    // (since hasEnteredScreen is false, separation is skipped)
    // They'll move towards player but separation won't apply
    const dx = enemy2.x - enemy1.x;
    const dy = enemy2.y - enemy1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Distance should be 0 since both move identically towards player
    expect(distance).toBe(0);
  });

  it('should handle multiple overlapping enemies in a group', () => {
    // Create a cluster of enemies at the same position
    const enemies = [];
    for (let i = 0; i < 5; i++) {
      enemies.push(
        createMockEnemy({
          // Add tiny offsets to break perfect symmetry even with mocked random
          x: 200 + i * 0.1,
          y: 200 + i * 0.1,
          radius: 15,
          hasEnteredScreen: true,
        })
      );
    }

    pool.activeEnemies.push(...enemies);

    // Run many updates to spread them out
    for (let i = 0; i < 100; i++) {
      updateGrid();
      movementSystem.update(pool, 1.0, 800, 600, createMockPlayer());
    }

    // Check that enemies have spread out
    const uniquePositions = new Set<string>();
    enemies.forEach(e => {
      uniquePositions.add(`${e.x.toFixed(2)},${e.y.toFixed(2)}`);
    });

    // Should have more than 1 unique position after spreading
    expect(uniquePositions.size).toBeGreaterThan(1);
  });
});
