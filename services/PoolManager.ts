/**
 * PoolManager - High-Performance Object Pool Pattern
 *
 * Optimized for O(1) retrieval and minimal iteration overhead.
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
import { marketStateService } from './MarketStateService';
import { audio } from './audio';

interface Activatable {
  active: boolean;
}

/**
 * ObjectPool - A generic, high-performance object pooling container.
 */
class ObjectPool<T extends { active: boolean }> {
  public active: T[] = [];
  public free: T[] = [];
  private maxActive: number;

  constructor(maxActive: number) {
    this.maxActive = maxActive;
  }

  get(factory: () => T, initializer?: (obj: T) => void): T {
    // If at capacity, recycle oldest
    if (this.active.length >= this.maxActive) {
      const oldest = this.active.shift();
      if (oldest) {
        oldest.active = false;
        this.free.push(oldest);
      }
    }

    let obj = this.free.pop();
    obj ??= factory();

    obj.active = true;
    if (initializer) initializer(obj);

    this.active.push(obj);
    return obj;
  }

  release(obj: T): void {
    obj.active = false;
    const index = this.active.indexOf(obj);
    if (index > -1) {
      this.active.splice(index, 1);
      this.free.push(obj);
    }
  }

  cleanup(): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const item = this.active[i];
      if (item && !item.active) {
        const removed = this.active.splice(i, 1)[0];
        if (removed) this.free.push(removed);
      }
    }
  }

  clear(): void {
    while (this.active.length) {
      const item = this.active.pop();
      if (item) {
        item.active = false;
        this.free.push(item);
      }
    }
  }

  trim(maxFree: number): void {
    if (this.free.length > maxFree) {
      this.free.length = maxFree;
    }
  }
}

export class PoolManager {
  private enemies: ObjectPool<GameEnemy>;
  private bullets: ObjectPool<Bullet>;
  private gems: ObjectPool<Gem>;
  private particles: ObjectPool<Particle>;
  private floatingTexts: ObjectPool<FloatingText>;
  private speedLines: ObjectPool<SpeedLine>;

  private static readonly MAX_ACTIVE = {
    enemies: 150,
    bullets: 200,
    gems: 300,
    particles: 400,
    floatingTexts: 50,
    speedLines: 50,
  };

  constructor() {
    this.enemies = new ObjectPool<GameEnemy>(PoolManager.MAX_ACTIVE.enemies);
    this.bullets = new ObjectPool<Bullet>(PoolManager.MAX_ACTIVE.bullets);
    this.gems = new ObjectPool<Gem>(PoolManager.MAX_ACTIVE.gems);
    this.particles = new ObjectPool<Particle>(PoolManager.MAX_ACTIVE.particles);
    this.floatingTexts = new ObjectPool<FloatingText>(PoolManager.MAX_ACTIVE.floatingTexts);
    this.speedLines = new ObjectPool<SpeedLine>(PoolManager.MAX_ACTIVE.speedLines);
  }

  // Preserve public array access for external systems (e.g. PhysicsSystem)
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
   * Pre-warm pools.
   */
  preWarm(config?: {
    enemies?: number;
    bullets?: number;
    particles?: number;
    gems?: number;
    texts?: number;
  }): void {
    const counts = {
      enemies: config?.enemies ?? 30,
      bullets: config?.bullets ?? 80,
      particles: config?.particles ?? 150,
      gems: config?.gems ?? 20,
      texts: config?.texts ?? 30,
    };

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
      });
    }
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

    Logger.debug(`[PoolManager] Pre-warmed pools`);
  }

  release<T extends Activatable>(obj: T, activeList: T[], freeList: T[]) {
    // Legacy support or generic release
    obj.active = false;
    const index = activeList.indexOf(obj);
    if (index > -1) {
      activeList.splice(index, 1);
      freeList.push(obj);
    }
  }

  getEnemy(
    x: number,
    y: number,
    difficulty: number,
    position: MarketPosition,
    enemyType: string = 'bear'
  ): GameEnemy {
    const aggroMultiplier = marketStateService.getState()?.enemyAggroMultiplier ?? 1.0;

    return this.enemies.get(
      () => enemyFactory.createEnemy(enemyType, x, y, difficulty, position, aggroMultiplier),
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
        obj.active = true;

        // CRITICAL: Reset spawn animation state for recycled enemies
        obj.spawnTimer = 0; // Will be set to 1 when entering screen
        obj.hasEnteredScreen = false; // Must detect screen entry again

        // Reset death animation state
        obj.isDying = false;
        obj.deathProgress = 0;

        // Reset near miss flag
        obj.hasTriggeredNearMiss = false;
      }
    );
  }

  getWhaleEnemy(
    x: number,
    y: number,
    difficulty: number,
    position: MarketPosition,
    tier: WhaleTier
  ): GameEnemy {
    const tierConfig = WHALE_TIER_CONFIGS[tier];

    // Play whale arrival sound
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
        obj.active = true;

        // CRITICAL: Reset spawn animation state for recycled enemies
        obj.spawnTimer = 0;
        obj.hasEnteredScreen = false;
        obj.isDying = false;
        obj.deathProgress = 0;
        obj.hasTriggeredNearMiss = false;
      }
    );
  }

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
      () => ({ active: true, x, y, vx, vy, damage, radius, color, isCrit, isSuperCrit }),
      obj =>
        Object.assign(obj, {
          x,
          y,
          vx,
          vy,
          damage,
          radius,
          color,
          isCrit,
          isSuperCrit,
          active: true,
        })
    );
  }

  getGem(x: number, y: number, value: number, radius: number, color: string, isRare: boolean): Gem {
    return this.gems.get(
      () => ({ active: true, x, y, radius, color, value, isRare, vx: 0, vy: 0, magnetized: false }),
      obj =>
        Object.assign(obj, {
          x,
          y,
          radius,
          color,
          value,
          isRare,
          active: true,
          vx: 0,
          vy: 0,
          magnetized: false,
        })
    );
  }

  getParticle(x: number, y: number, vx: number, vy: number, color: string): Particle {
    return this.particles.get(
      () => ({ active: true, x, y, vx, vy, color, radius: 2, life: 1 }),
      obj => Object.assign(obj, { x, y, vx, vy, color, radius: 2, life: 1, active: true })
    );
  }

  getFloatingText(x: number, y: number, text: string, color: string, size: number): FloatingText {
    return this.floatingTexts.get(
      () => ({ active: true, x, y, text, color, size, life: 1 }),
      obj => Object.assign(obj, { x, y, text, color, size, life: 1, active: true })
    );
  }

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
        })
    );
  }

  cleanup(): void {
    this.enemies.cleanup();
    this.bullets.cleanup();
    this.gems.cleanup();
    this.particles.cleanup();
    this.floatingTexts.cleanup();
    this.speedLines.cleanup();
  }

  clearAll(): void {
    this.enemies.clear();
    this.bullets.clear();
    this.gems.clear();
    this.particles.clear();
    this.floatingTexts.clear();
    this.speedLines.clear();
    this.trimFreeLists();
  }

  trimFreeLists(maxPoolSize: number = 50): void {
    this.enemies.trim(maxPoolSize);
    this.bullets.trim(maxPoolSize * 2);
    this.gems.trim(maxPoolSize);
    this.particles.trim(maxPoolSize * 3);
    this.floatingTexts.trim(maxPoolSize);
    this.speedLines.trim(maxPoolSize);
  }
}
