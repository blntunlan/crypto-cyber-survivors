import {
  type Bullet,
  type Gem,
  type Particle,
  type FloatingText,
  type SpeedLine,
  type ImpactRing,
  type Interactable,
  MarketPosition,
  type CryptoPair,
  type EnemyIntent,
} from '../../types';
import {
  EnemyFactory,
  enemyFactory,
  type GameEnemy,
} from '../../factories/EnemyFactory';
import { Logger } from '../system/Logger';
import {
  WHALE_TIER_CONFIGS,
  type WhaleTier,
  type RSIEnemyModifier,
  NEUTRAL_ENEMY_MODIFIER,
} from '../../types/indicators';
import { type IPoolManager } from '../interfaces/IPoolManager';
import { audio } from '../audio';
import { type EnemyId } from '../../config/EnemyRegistry';
import { POOL } from '../../constants';
import { RESET_PRIORITY, ResetOrchestrator } from '../core/ResetOrchestrator';

/**
 * ObjectPool - A generic, high-performance object pooling container.
 * Manages 'active' and 'free' lists for efficient object recycling.
 */
class ObjectPool<T extends { active: boolean; poolIndex?: number }> {
  public active: T[] = [];
  public free: T[] = [];
  private maxActive: number;

  constructor(maxActive: number) {
    this.maxActive = maxActive;
  }

  /**
   * Retrieves an object from the pool.
   * If full, recycles the object at index 0 (O(1) swap-and-pop).
   */
  get(factory: () => T, initializer?: (obj: T) => void): T {
    if (this.active.length >= this.maxActive) {
      // O(1) recycling: Swap-and-Pop from index 0
      const oldest = this.active[0];
      if (oldest) {
        oldest.active = false;
        oldest.poolIndex = undefined;
        this.free.push(oldest);

        const last = this.active.pop();
        if (last && this.active.length > 0) {
          this.active[0] = last;
          last.poolIndex = 0;
        }
      }
    }

    let obj = this.free.pop();
    obj ??= factory();

    obj.active = true;
    if (initializer) {
      initializer(obj);
    }

    obj.poolIndex = this.active.length;
    this.active.push(obj);
    return obj;
  }

  /**
   * Explicitly releases an object back into the free pool.
   * Uses poolIndex for O(1) lookup instead of indexOf O(N).
   */
  release(obj: T): void {
    const index = obj.poolIndex;
    if (index !== undefined && index > -1 && index < this.active.length) {
      obj.active = false;
      obj.poolIndex = undefined;
      this.free.push(obj);

      const last = this.active.pop();
      if (last && index < this.active.length) {
        this.active[index] = last;
        last.poolIndex = index;
      }
    }
  }

  /**
   * Scans the active pool and moves any deactivated objects to the free pool.
   * Updates poolIndex for remaining objects to keep O(1) capability.
   */
  cleanup(): void {
    const active = this.active;
    let writeIndex = 0;
    for (let readIndex = 0; readIndex < active.length; readIndex++) {
      const obj = active[readIndex]!;
      if (obj.active) {
        active[writeIndex] = obj;
        obj.poolIndex = writeIndex;
        writeIndex++;
      } else {
        obj.active = false;
        obj.poolIndex = undefined;
        this.free.push(obj);
      }
    }
    active.length = writeIndex;
  }

  /**
   * Deactivates and moves all objects to the free pool.
   */
  clear(): void {
    while (this.active.length) {
      const item = this.active.pop();
      if (item) {
        item.active = false;
        item.poolIndex = undefined;
        this.free.push(item);
      }
    }
  }

  /**
   * Controls the size of the free list.
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
  private static instance: PoolManager | null = null;
  private enemies: ObjectPool<GameEnemy>;
  private bullets: ObjectPool<Bullet>;
  private gems: ObjectPool<Gem>;
  private particles: ObjectPool<Particle>;
  private floatingTexts: ObjectPool<FloatingText>;
  private speedLines: ObjectPool<SpeedLine>;
  private impactRings: ObjectPool<ImpactRing>;
  private interactables: ObjectPool<Interactable>;
  private unregisterResetHandler: (() => void) | null = null;

  constructor() {
    this.enemies = new ObjectPool<GameEnemy>(POOL.MAX_ACTIVE.ENEMIES);
    this.bullets = new ObjectPool<Bullet>(POOL.MAX_ACTIVE.BULLETS);
    this.gems = new ObjectPool<Gem>(POOL.MAX_ACTIVE.GEMS);
    this.particles = new ObjectPool<Particle>(POOL.MAX_ACTIVE.PARTICLES);
    this.floatingTexts = new ObjectPool<FloatingText>(POOL.MAX_ACTIVE.FLOATING_TEXTS);
    this.speedLines = new ObjectPool<SpeedLine>(POOL.MAX_ACTIVE.SPEED_LINES);
    this.impactRings = new ObjectPool<ImpactRing>(POOL.MAX_ACTIVE.IMPACT_RINGS);
    // Use a conservative limit for interactables as they are sparse
    this.interactables = new ObjectPool<Interactable>(50);
    this.unregisterResetHandler = ResetOrchestrator.registerResetHandler(
      RESET_PRIORITY.GAME_SYSTEMS,
      'PoolManager',
      () => this.clearAll()
    );
  }

  /**
   * Get the singleton instance of PoolManager
   */
  public static getInstance(): PoolManager {
    return (PoolManager.instance ??= new PoolManager());
  }

  /**
   * Resets the singleton instance (primarily for testing)
   */
  public static resetInstance(): void {
    PoolManager.instance?.dispose();
    PoolManager.instance = null;
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
  get activeImpactRings(): ImpactRing[] {
    return this.impactRings.active;
  }
  get activeInteractables(): Interactable[] {
    return this.interactables.active;
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
    speedLines?: number;
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
        elapsedLifetime: 0,
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
        isCrit: false,
        vx: 0,
        vy: 0,
      });
    }

    // Pre-allocate speed lines
    const speedLinesCount = config?.speedLines ?? 20; // Default count
    for (let i = 0; i < speedLinesCount; i++) {
      this.speedLines.free.push({
        active: false,
        x: 0,
        y: 0,
        length: 0,
        angle: 0,
        opacity: 0,
        width: 0,
        decay: 0,
        vx: 0,
        vy: 0,
        radius: 0,
        color: '',
      });
    }

    // Pre-allocate enemies (Fixes first-spawn freeze)
    for (let i = 0; i < counts.enemies; i++) {
      // Create a dummy 'bear' enemy to populate the pool
      const dummyEnemy = enemyFactory.createEnemy(
        'bear',
        -1000,
        -1000,
        1,
        MarketPosition.LONG
      );
      dummyEnemy.active = false;
      this.enemies.free.push(dummyEnemy);
    }

    Logger.debug(`[PoolManager] Pre-warmed pools with counts:`, counts);
  }

  /**
   * O(1) Releases for individual entities
   */
  releaseEnemy(enemy: GameEnemy): void {
    this.enemies.release(enemy);
  }

  releaseBullet(bullet: Bullet): void {
    this.bullets.release(bullet);
  }

  releaseGem(gem: Gem): void {
    this.gems.release(gem);
  }

  releaseParticle(particle: Particle): void {
    this.particles.release(particle);
  }

  releaseFloatingText(text: FloatingText): void {
    this.floatingTexts.release(text);
  }

  releaseSpeedLine(line: SpeedLine): void {
    this.speedLines.release(line);
  }

  releaseImpactRing(ring: ImpactRing): void {
    this.impactRings.release(ring);
  }

  releaseInteractable(interactable: Interactable): void {
    this.interactables.release(interactable);
  }

  /**
   * Retrieves a regular enemy from the pool, applying market aggro multipliers.
   */
  getEnemy(
    x: number,
    y: number,
    difficulty: number,
    position: MarketPosition,
    enemyType?: EnemyId,
    _pair?: CryptoPair,
    damageMultiplier: number = 1.0,
    speedMultiplier: number = 1.0,
    rsiModifier: RSIEnemyModifier = NEUTRAL_ENEMY_MODIFIER,
    hpMultiplier: number = 1.0,
    intent?: EnemyIntent,
    powerTier: number = 0
  ): GameEnemy {
    const currentEnemyType = enemyType ?? 'bear';

    return this.enemies.get(
      () =>
        enemyFactory.createEnemy(
          currentEnemyType,
          x,
          y,
          difficulty,
          position,
          rsiModifier,
          damageMultiplier,
          hpMultiplier,
          intent,
          powerTier
        ),
      obj => {
        enemyFactory.createEnemy(
          currentEnemyType,
          x,
          y,
          difficulty,
          position,
          rsiModifier,
          damageMultiplier,
          hpMultiplier,
          intent,
          powerTier,
          obj
        );
        // Apply extra speed multiplier if provided (e.g. from global effects)
        obj.speed *= speedMultiplier;
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
    tier: WhaleTier,
    damageMultiplier: number = 1.0,
    speedMultiplier: number = 1.0,
    rsiModifier: RSIEnemyModifier = NEUTRAL_ENEMY_MODIFIER,
    hpMultiplier: number = 1.0,
    intent: EnemyIntent = 'boss',
    powerTier: number = 0
  ): GameEnemy {
    const tierConfig = WHALE_TIER_CONFIGS[tier];
    audio.playWhaleArrival();

    return this.enemies.get(
      () => {
        const e = enemyFactory.createEnemy(
          'whale',
          x,
          y,
          difficulty,
          position,
          rsiModifier,
          damageMultiplier,
          hpMultiplier,
          intent,
          powerTier
        );
        if (tierConfig) {
          e.radius *= tierConfig.sizeMultiplier;
          e.health *= tierConfig.healthMultiplier;
          e.maxHealth = e.health;
          e.valueMultiplier = tierConfig.valueMultiplier;
        }
        e.speed *= speedMultiplier;
        return e;
      },
      obj => {
        // Use the target-based mutation pattern for whales too
        enemyFactory.createEnemy(
          'whale',
          x,
          y,
          difficulty,
          position,
          rsiModifier,
          damageMultiplier,
          hpMultiplier,
          intent,
          powerTier,
          obj
        );

        if (tierConfig) {
          obj.radius *= tierConfig.sizeMultiplier;
          obj.health *= tierConfig.healthMultiplier;
          obj.maxHealth = obj.health;
          obj.valueMultiplier = tierConfig.valueMultiplier;
        }
        obj.speed *= speedMultiplier;
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
        // --- Phase 0 VFX scaffolding: clear optional state on recycle ---
        // Critical: recycled bullets otherwise leak weapon-specific state
        // (trails, phases, orbit flags, hit-sets) across unrelated weapons.
        obj.weaponId = undefined;
        obj.age = undefined;
        obj.maxAge = undefined;
        if (obj.trail !== undefined) {
          // Preserve the existing array (avoid GC churn) but drop contents.
          obj.trail.length = 0;
          obj.trail = undefined;
        }
        obj.spawnX = undefined;
        obj.spawnY = undefined;
        obj.targetX = undefined;
        obj.targetY = undefined;
        obj.curveSign = undefined;
        obj.isOrbiter = undefined;
        obj.orbitAngle = undefined;
        obj.orbitRadius = undefined;
        obj.orbitSpeed = undefined;
        obj.phase = undefined;
        obj.phaseMs = undefined;
        obj.shockwaveRadius = undefined;
        obj.shockwaveMaxRadius = undefined;
        obj.beamAngle = undefined;
        obj.beamLength = undefined;
        if (obj.hitSet !== undefined) {
          obj.hitSet.clear();
          obj.hitSet = undefined;
        }
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
        obj.elapsedLifetime = 0;
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
    size: number,
    isCrit?: boolean,
    vx: number = 0,
    vy: number = 0
  ): FloatingText {
    return this.floatingTexts.get(
      () => ({ active: true, x, y, text, color, size, life: 1, isCrit, vx, vy }),
      obj => {
        obj.active = true;
        obj.x = x;
        obj.y = y;
        obj.text = text;
        obj.color = color;
        obj.size = size;
        obj.life = 1;
        obj.isCrit = isCrit;
        obj.vx = vx;
        obj.vy = vy;
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

  getImpactRing(
    x: number,
    y: number,
    startRadius: number,
    maxRadius: number,
    color: string,
    lineWidth: number
  ): ImpactRing {
    return this.impactRings.get(
      () => ({
        active: true,
        x,
        y,
        radius: startRadius,
        startRadius,
        maxRadius,
        color,
        lineWidth,
        life: 1,
      }),
      obj => {
        obj.active = true;
        obj.x = x;
        obj.y = y;
        obj.radius = startRadius;
        obj.startRadius = startRadius;
        obj.maxRadius = maxRadius;
        obj.color = color;
        obj.lineWidth = lineWidth;
        obj.life = 1;
      }
    );
  }

  /**
   * Retrieves an interactable environment object (e.g. Mining Rig).
   */
  getInteractable(
    type: 'MINING_RIG' | 'LOOT_CRATE' | 'GAS_STATION',
    x: number,
    y: number,
    health: number
  ): Interactable {
    const sizeMap = {
      MINING_RIG: 25,
      LOOT_CRATE: 20,
      GAS_STATION: 30,
    };
    const colorMap = {
      MINING_RIG: '#F7931A', // BTC Orange
      LOOT_CRATE: '#A855F7', // Purple
      GAS_STATION: '#3B82F6', // Blue
    };

    return this.interactables.get(
      () => ({
        active: true,
        type,
        x,
        y,
        health,
        maxHealth: health,
        radius: sizeMap[type],
        color: colorMap[type],
      }),
      obj => {
        obj.active = true;
        obj.type = type;
        obj.x = x;
        obj.y = y;
        obj.health = health;
        obj.maxHealth = health;
        obj.radius = sizeMap[type];
        obj.color = colorMap[type];
        obj.isHit = false;
        obj.hitTimer = 0;
      }
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
    this.impactRings.cleanup();
    this.interactables.cleanup();
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
    this.impactRings.clear();
    this.interactables.clear();
    this.trimFreeLists(POOL.TRIM_SIZE);
    EnemyFactory.resetIdCounter();
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
    this.impactRings.trim(maxPoolSize);
    this.interactables.trim(maxPoolSize);
  }

  dispose(): void {
    this.unregisterResetHandler?.();
    this.unregisterResetHandler = null;
    this.clearAll();
  }
}
