/**
 * PoolManager - High-Performance Object Pool Pattern
 *
 * Optimized for O(1) retrieval and minimal iteration overhead.
 * Handles recycling of game entities like enemies, bullets, gems, and particles
 * to prevent GC pressure and memory leaks in intensive combat sessions.
 */

import {
  type Bullet,
  type Gem,
  type Particle,
  type FloatingText,
  type MarketPosition,
  type SpeedLine,
} from '../types';
import { enemyFactory, type GameEnemy } from '../factories/EnemyFactory';
import { Logger } from './Logger';
import { WHALE_TIER_CONFIGS, type WhaleTier } from '../types/indicators';
import { type IPoolManager } from './interfaces/IPoolManager';
import { MarketStateService as marketStateService } from './MarketStateService';
import { audio } from './audio';
import { type EnemyId } from '../config/EnemyRegistry';
import { POOL } from '../constants';

/**
 * ObjectPool - A generic, high-performance object pooling container.
 * Manages 'active' and 'free' lists for efficient object recycling.
 */
class ObjectPool<T extends { active: boolean }> {
  public active: T[] = [];
  public free: T[] = [];
  private maxActive: number;

  constructor(maxActive: number) {
    this.maxActive = maxActive;
  }

  /**
   * Retrieves an object from the pool, initializing it as necessary.
   * If the pool has reached capacity, it recycles the oldest active object.
   *
   * @param factory - Creator function for new objects.
   * @param initializer - Function to reset the state of a recycled object.
   */
  get(factory: () => T, initializer?: (obj: T) => void): T {
    // Capacity Check: If at limit, recycle the oldest active object (O(1) shift)
    if (this.active.length >= this.maxActive) {
      const oldest = this.active.shift();
      if (oldest) {
        oldest.active = false;
        this.free.push(oldest);
      }
    }

    // Attempt to pull from free list first, otherwise instantiate
    let obj = this.free.pop();
    obj ??= factory();

    obj.active = true;
    if (initializer) {
      initializer(obj);
    }

    this.active.push(obj);
    return obj;
  }

  /**
   * Explicitly releases an object back into the free pool.
   * Uses Swap-and-Pop (O(1)) instead of Splice (O(N)) to prevent frame drops.
   */
  release(obj: T): void {
    const index = this.active.indexOf(obj);
    if (index > -1) {
      obj.active = false;
      this.free.push(obj);

      const last = this.active.pop();
      if (last && index < this.active.length) {
        this.active[index] = last;
      }
    }
  }

  /**
   * Scans the active pool and moves any deactivated objects to the free pool.
   * Uses Swap-and-Pop optimization for O(N) total complexity instead of O(N^2).
   */
  cleanup(): void {
    const active = this.active;
    let i = active.length - 1;
    while (i >= 0) {
      if (!active[i]!.active) {
        this.free.push(active[i]!);

        // Fast swap-and-pop
        const last = active.pop();
        if (last && i < active.length) {
          active[i] = last;
        }
      }
      i--;
    }
  }

  /**
   * Deactivates and moves all objects to the free pool.
   */
  clear(): void {
    while (this.active.length) {
      const item = this.active.pop();
      if (item) {
        item.active = false;
        this.free.push(item);
      }
    }
  }

  /**
   * Controls the size of the free list to free up memory during idle periods.
   */
  trim(maxFree: number): void {
    if (this.free.length > maxFree) {
      this.free.length = maxFree;
    }
  }
}

/**
 * PoolManager Class
 *
 * Central registry for all object pools used in the game.
 * Implements IPoolManager to provide a type-safe interface for game systems.
 */
export class PoolManager implements IPoolManager {
  private enemies: ObjectPool<GameEnemy>;
  private bullets: ObjectPool<Bullet>;
  private gems: ObjectPool<Gem>;
  private particles: ObjectPool<Particle>;
  private floatingTexts: ObjectPool<FloatingText>;
  private speedLines: ObjectPool<SpeedLine>;

  constructor() {
    this.enemies = new ObjectPool<GameEnemy>(POOL.MAX_ACTIVE.ENEMIES);
    this.bullets = new ObjectPool<Bullet>(POOL.MAX_ACTIVE.BULLETS);
    this.gems = new ObjectPool<Gem>(POOL.MAX_ACTIVE.GEMS);
    this.particles = new ObjectPool<Particle>(POOL.MAX_ACTIVE.PARTICLES);
    this.floatingTexts = new ObjectPool<FloatingText>(POOL.MAX_ACTIVE.FLOATING_TEXTS);
    this.speedLines = new ObjectPool<SpeedLine>(POOL.MAX_ACTIVE.SPEED_LINES);
  }

  // Active list accessors for high-performance iterations in physics and rendering systems
  get activeEnemies() {
    return this.enemies.active;
  }
  get activeBullets() {
    return this.bullets.active;
  }
  get activeGems() {
    return this.gems.active;
  }
  get activeParticles() {
    return this.particles.active;
  }
  get activeFloatingTexts(): FloatingText[] {
    return this.floatingTexts.active;
  }
  get activeSpeedLines(): SpeedLine[] {
    return this.speedLines.active;
  }

  /**
   * Pre-instantiates a specific number of objects to reduce runtime allocation latency.
   */
  preWarm(config?: {
    enemies?: number;
    bullets?: number;
    particles?: number;
    gems?: number;
    texts?: number;
  }): void {
    const counts = {
      enemies: config?.enemies ?? POOL.PRE_WARM.ENEMIES,
      bullets: config?.bullets ?? POOL.PRE_WARM.BULLETS,
      particles: config?.particles ?? POOL.PRE_WARM.PARTICLES,
      gems: config?.gems ?? POOL.PRE_WARM.GEMS,
      texts: config?.texts ?? POOL.PRE_WARM.TEXTS,
    };

    // Pre-allocate bullets
    for (let i = 0; i < counts.bullets; i++) {
      this.bullets.free.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        damage: 0,
        radius: 0,
        color: '',
        isCrit: false,
        isSuperCrit: false,
      });
    }

    // Pre-allocate particles
    for (let i = 0; i < counts.particles; i++) {
      this.particles.free.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        color: '',
        radius: 2,
        life: 0,
        isPixel: false,
      });
    }

    // Pre-allocate gems
    for (let i = 0; i < counts.gems; i++) {
      this.gems.free.push({
        active: false,
        x: 0,
        y: 0,
        radius: 0,
        color: '',
        value: 0,
        isRare: false,
        vx: 0,
        vy: 0,
        magnetized: false,
      });
    }

    // Pre-allocate texts
    for (let i = 0; i < counts.texts; i++) {
      this.floatingTexts.free.push({
        active: false,
        x: 0,
        y: 0,
        text: '',
        color: '',
        size: 0,
        life: 0,
      });
    }

    Logger.debug(`[PoolManager] Pre-warmed pools with counts:`, counts);
  }

  /**
   * Generic release method for backward compatibility.
   */
  release<T extends { active: boolean }>(obj: T, activeList: T[], freeList: T[]) {
    obj.active = false;
    const index = activeList.indexOf(obj);
    if (index > -1) {
      activeList.splice(index, 1);
      freeList.push(obj);
    }
  }

  /**
   * Retrieves a regular enemy from the pool, applying market aggro multipliers.
   */
  getEnemy(
    x: number,
    y: number,
    difficulty: number,
    position: MarketPosition,
    enemyType: EnemyId = 'bear'
  ): GameEnemy {
    const aggroMultiplier = marketStateService.getState()?.enemyAggroMultiplier ?? 1.0;

    return this.enemies.get(
      () =>
        enemyFactory.createEnemy(
          enemyType,
          x,
          y,
          difficulty,
          position,
          aggroMultiplier
        ),
      obj => {
        const newEnemy = enemyFactory.createEnemy(
          enemyType,
          x,
          y,
          difficulty,
          position,
          aggroMultiplier
        );
        Object.assign(obj, newEnemy);

        // Ensure state is fully reset for the recycled object
        obj.active = true;
        obj.spawnTimer = 0;
        obj.hasEnteredScreen = false;
        obj.isDying = false;
        obj.deathProgress = 0;
        obj.hasTriggeredNearMiss = false;
        obj.damageBuffer = 0;
        obj.damageBufferTimer = 0;
        obj.damageBufferIsCrit = false;
        obj.damageBufferIsSuperCrit = false;
      }
    );
  }

  /**
   * Retrieves a special Whale enemy using high-tier indicator data.
   */
  getWhaleEnemy(
    x: number,
    y: number,
    difficulty: number,
    position: MarketPosition,
    tier: WhaleTier
  ): GameEnemy {
    const tierConfig = WHALE_TIER_CONFIGS[tier];
    audio.playWhaleArrival();

    return this.enemies.get(
      () => {
        const e = enemyFactory.createEnemy('whale', x, y, difficulty, position);
        if (tierConfig) {
          e.radius *= tierConfig.sizeMultiplier;
          e.health *= tierConfig.healthMultiplier;
          e.maxHealth = e.health;
          e.valueMultiplier = tierConfig.valueMultiplier;
        }
        return e;
      },
      obj => {
        const e = enemyFactory.createEnemy('whale', x, y, difficulty, position);
        if (tierConfig) {
          e.radius *= tierConfig.sizeMultiplier;
          e.health *= tierConfig.healthMultiplier;
          e.maxHealth = e.health;
          e.valueMultiplier = tierConfig.valueMultiplier;
        }
        Object.assign(obj, e);

        // Reset state
        obj.active = true;
        obj.spawnTimer = 0;
        obj.hasEnteredScreen = false;
        obj.isDying = false;
        obj.deathProgress = 0;
        obj.hasTriggeredNearMiss = false;
        obj.damageBuffer = 0;
        obj.damageBufferTimer = 0;
        obj.damageBufferIsCrit = false;
        obj.damageBufferIsSuperCrit = false;
      }
    );
  }

  /**
   * Retrieves a bullet/projectile from the pool.
   */
  getBullet(
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number,
    radius: number,
    color: string,
    isCrit: boolean,
    isSuperCrit: boolean
  ): Bullet {
    return this.bullets.get(
      () => ({
        active: true,
        x,
        y,
        vx,
        vy,
        damage,
        radius,
        color,
        isCrit,
        isSuperCrit,
      }),
      obj => {
        obj.active = true;
        obj.x = x;
        obj.y = y;
        obj.vx = vx;
        obj.vy = vy;
        obj.damage = damage;
        obj.radius = radius;
        obj.color = color;
        obj.isCrit = isCrit;
        obj.isSuperCrit = isSuperCrit;
      }
    );
  }

  /**
   * Retrieves an experience gem/orb from the pool.
   */
  getGem(
    x: number,
    y: number,
    value: number,
    radius: number,
    color: string,
    isRare: boolean
  ): Gem {
    return this.gems.get(
      () => ({
        active: true,
        x,
        y,
        radius,
        color,
        value,
        isRare,
        vx: 0,
        vy: 0,
        magnetized: false,
      }),
      obj => {
        obj.active = true;
        obj.x = x;
        obj.y = y;
        obj.radius = radius;
        obj.color = color;
        obj.value = value;
        obj.isRare = isRare;
        obj.vx = 0;
        obj.vy = 0;
        obj.magnetized = false;
      }
    );
  }

  /**
   * Retrieves a visual particle for combat effects.
   */
  getParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: string,
    isPixel: boolean = false
  ): Particle {
    return this.particles.get(
      () => ({ active: true, x, y, vx, vy, color, radius: 2, life: 1, isPixel }),
      obj => {
        obj.active = true;
        obj.x = x;
        obj.y = y;
        obj.vx = vx;
        obj.vy = vy;
        obj.color = color;
        obj.radius = 2; // Reset to default radius
        obj.life = 1; // Explicitly reset life to 1.0
        obj.isPixel = !!isPixel;
      }
    );
  }

  /**
   * Retrieves a floating UI text object (e.g. Damage numbers).
   */
  getFloatingText(
    x: number,
    y: number,
    text: string,
    color: string,
    size: number
  ): FloatingText {
    return this.floatingTexts.get(
      () => ({ active: true, x, y, text, color, size, life: 1 }),
      obj => {
        obj.active = true;
        obj.x = x;
        obj.y = y;
        obj.text = text;
        obj.color = color;
        obj.size = size;
        obj.life = 1;
      }
    );
  }

  /**
   * Retrieves a speed line visual for dash effects or market volatility.
   */
  getSpeedLine(
    x: number,
    y: number,
    length: number,
    width: number,
    angle: number,
    opacity: number
  ): SpeedLine {
    return this.speedLines.get(
      () => ({
        active: true,
        x,
        y,
        length,
        width,
        angle,
        opacity,
        decay: 0.05,
        radius: 0,
        color: '#fff',
        vx: 0,
        vy: 0,
      }),
      obj =>
        Object.assign(obj, {
          active: true,
          x,
          y,
          length,
          width,
          angle,
          opacity,
          decay: 0.05,
          radius: 0,
          color: '#fff',
          vx: 0,
          vy: 0,
        })
    );
  }

  /**
   * Performs a focused cleanup of the active pools.
   */
  cleanup(): void {
    this.enemies.cleanup();
    this.bullets.cleanup();
    this.gems.cleanup();
    this.particles.cleanup();
    this.floatingTexts.cleanup();
    this.speedLines.cleanup();
  }

  /**
   * Full reset of the entire pooling system.
   */
  clearAll(): void {
    this.enemies.clear();
    this.bullets.clear();
    this.gems.clear();
    this.particles.clear();
    this.floatingTexts.clear();
    this.speedLines.clear();
    this.trimFreeLists(POOL.TRIM_SIZE);
  }

  /**
   * Trims the free lists to reclaim memory.
   */
  trimFreeLists(maxPoolSize: number = POOL.TRIM_SIZE): void {
    this.enemies.trim(maxPoolSize);
    this.bullets.trim(maxPoolSize * 2);
    this.gems.trim(maxPoolSize);
    this.particles.trim(maxPoolSize * 3);
    this.floatingTexts.trim(maxPoolSize);
    this.speedLines.trim(maxPoolSize);
  }
}
