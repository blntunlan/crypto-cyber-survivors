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
} from '../types';
import { enemyFactory, type GameEnemy } from '../factories/EnemyFactory';
import { Logger } from './Logger';

interface Activatable {
  active: boolean;
}

export class PoolManager {
  // Active objects for faster iteration in game loop
  activeEnemies: GameEnemy[] = [];
  activeBullets: Bullet[] = [];
  activeGems: Gem[] = [];
  activeParticles: Particle[] = [];
  activeFloatingTexts: FloatingText[] = [];

  // Inactive objects for recycling (FreeLists)
  private freeEnemies: GameEnemy[] = [];
  private freeBullets: Bullet[] = [];
  private freeGems: Gem[] = [];
  private freeParticles: Particle[] = [];
  private freeFloatingTexts: FloatingText[] = [];

  // Maximum active entities to prevent memory issues
  private static readonly MAX_ACTIVE = {
    enemies: 150,
    bullets: 500,
    particles: 400,
    gems: 100,
    texts: 50,
  };

  constructor() {}

  /**
   * Pre-warm pools to prevent allocation stutters during gameplay.
   * Call this before the game starts (e.g., during loading screen).
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

    // Pre-allocate bullets
    for (let i = 0; i < counts.bullets; i++) {
      this.freeBullets.push({
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
      this.freeParticles.push({
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

    // Pre-allocate gems
    for (let i = 0; i < counts.gems; i++) {
      this.freeGems.push({
        active: false,
        x: 0,
        y: 0,
        radius: 0,
        color: '',
        value: 0,
        isRare: false,
      });
    }

    // Pre-allocate floating texts
    for (let i = 0; i < counts.texts; i++) {
      this.freeFloatingTexts.push({
        active: false,
        x: 0,
        y: 0,
        text: '',
        color: '',
        size: 0,
        life: 0,
      });
    }

    Logger.debug(
      `[PoolManager] Pre-warmed pools: ${counts.bullets} bullets, ${counts.particles} particles, ${counts.gems} gems, ${counts.texts} texts`
    );
  }

  /**
   * Helper to move object back to free list
   */
  release<T extends Activatable>(obj: T, activeList: T[], freeList: T[]) {
    obj.active = false;
    const index = activeList.indexOf(obj);
    if (index > -1) {
      activeList.splice(index, 1);
      freeList.push(obj);
    }
  }

  getEnemy(x: number, y: number, difficulty: number, position: MarketPosition): GameEnemy {
    let obj = this.freeEnemies.pop();
    if (!obj) {
      obj = enemyFactory.createRandomEnemy(x, y, difficulty, position);
    } else {
      const newEnemy = enemyFactory.createRandomEnemy(x, y, difficulty, position);
      Object.assign(obj, newEnemy);
    }
    obj.active = true;
    this.activeEnemies.push(obj);
    return obj;
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
    // Enforce limit - recycle oldest if at capacity
    if (this.activeBullets.length >= PoolManager.MAX_ACTIVE.bullets) {
      const oldest = this.activeBullets.shift();
      if (oldest) {
        oldest.active = false;
        this.freeBullets.push(oldest);
      }
    }

    let obj = this.freeBullets.pop();
    if (!obj) {
      obj = { active: true, x, y, vx, vy, damage, radius, color, isCrit, isSuperCrit };
    } else {
      obj.active = true;
      Object.assign(obj, { x, y, vx, vy, damage, radius, color, isCrit, isSuperCrit });
    }
    this.activeBullets.push(obj);
    return obj;
  }

  getGem(x: number, y: number, value: number, radius: number, color: string, isRare: boolean): Gem {
    let obj = this.freeGems.pop();
    if (!obj) {
      obj = { active: true, x, y, radius, color, value, isRare };
    } else {
      obj.active = true;
      Object.assign(obj, { x, y, radius, color, value, isRare });
    }
    this.activeGems.push(obj);
    return obj;
  }

  getParticle(x: number, y: number, vx: number, vy: number, color: string): Particle {
    // Enforce limit - recycle oldest if at capacity
    if (this.activeParticles.length >= PoolManager.MAX_ACTIVE.particles) {
      const oldest = this.activeParticles.shift();
      if (oldest) {
        oldest.active = false;
        this.freeParticles.push(oldest);
      }
    }

    let obj = this.freeParticles.pop();
    if (!obj) {
      obj = { active: true, x, y, vx, vy, color, radius: 2, life: 1 };
    } else {
      obj.active = true;
      Object.assign(obj, { x, y, vx, vy, color, radius: 2, life: 1 });
    }
    this.activeParticles.push(obj);
    return obj;
  }

  getFloatingText(x: number, y: number, text: string, color: string, size: number): FloatingText {
    let obj = this.freeFloatingTexts.pop();
    if (!obj) {
      obj = { active: true, x, y, text, color, size, life: 1 };
    } else {
      obj.active = true;
      Object.assign(obj, { x, y, text, color, size, life: 1 });
    }
    this.activeFloatingTexts.push(obj);
    return obj;
  }

  /**
   * Efficiently cleanup inactive objects from active lists
   * Should be called at the end of each update loop
   */
  cleanup(): void {
    this.moveInactive(this.activeEnemies, this.freeEnemies);
    this.moveInactive(this.activeBullets, this.freeBullets);
    this.moveInactive(this.activeGems, this.freeGems);
    this.moveInactive(this.activeParticles, this.freeParticles);
    this.moveInactive(this.activeFloatingTexts, this.freeFloatingTexts);
  }

  private moveInactive<T extends Activatable>(active: T[], free: T[]) {
    for (let i = active.length - 1; i >= 0; i--) {
      const item = active[i];
      if (item && !item.active) {
        const removed = active.splice(i, 1)[0];
        if (removed) free.push(removed);
      }
    }
  }

  clearAll(): void {
    while (this.activeEnemies.length) this.freeEnemies.push(this.activeEnemies.pop()!);
    while (this.activeBullets.length) this.freeBullets.push(this.activeBullets.pop()!);
    while (this.activeGems.length) this.freeGems.push(this.activeGems.pop()!);
    while (this.activeParticles.length) this.freeParticles.push(this.activeParticles.pop()!);
    while (this.activeFloatingTexts.length) {
      this.freeFloatingTexts.push(this.activeFloatingTexts.pop()!);
    }

    this.freeEnemies.forEach(e => (e.active = false));
    this.freeBullets.forEach(e => (e.active = false));
    this.freeGems.forEach(e => (e.active = false));
    this.freeParticles.forEach(e => (e.active = false));
    this.freeFloatingTexts.forEach(e => (e.active = false));

    // Trim free lists to prevent memory bloat after clearing
    this.trimFreeLists();
  }

  /**
   * Trim free lists to prevent unbounded memory growth.
   * Keeps a reasonable pool size for recycling while freeing excess memory.
   */
  trimFreeLists(maxPoolSize: number = 50): void {
    const trim = <T>(list: T[], max: number) => {
      if (list.length > max) {
        list.length = max;
      }
    };

    trim(this.freeEnemies, maxPoolSize);
    trim(this.freeBullets, maxPoolSize * 2); // Bullets spawn more frequently
    trim(this.freeGems, maxPoolSize);
    trim(this.freeParticles, maxPoolSize * 3); // Particles are most numerous
    trim(this.freeFloatingTexts, maxPoolSize);
  }
}
