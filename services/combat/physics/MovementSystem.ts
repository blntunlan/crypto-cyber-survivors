import { type IPoolManager } from '../../interfaces/IPoolManager';
import { type Player, type Enemy, type Bullet } from '../../../types';
import { ParticleConfigService } from '../../system/ParticleConfigService';
import { DeviceBenchmarkService } from '../../system/DeviceBenchmarkService';
import { type PerformanceConfig } from '../../../types/DeviceProfile';
import { GAME_ENGINE, SEPARATION } from '../../../constants';
import { type IMovementSystem } from '../../interfaces/IPhysicsSubsystems';
import { enemyGrid } from '../SpatialGrid';

/**
 * Phase 1 VFX — QuantumBullet trail tunables.
 *
 * Kept co-located with the update loop so the zero-alloc contract is obvious:
 * these constants never allocate and are read by the MovementSystem tick only.
 * Keep in sync with `WEAPON_REGISTRY.quantum_bullet.visual.params` until a
 * renderer-owned config module unifies both ends (later phases).
 */
const QUANTUM_TRAIL_LIFE_MS = 180;
const SPREAD_TRAIL_LIFE_MS = 200;
const BOOMERANG_TRAIL_LIFE_MS = 380;
const TRAIL_MAX_POINTS = 16;
/** 1000ms / 60fps ≈ 16.667ms per engine-normalized frame. */
const QUANTUM_TRAIL_MS_PER_FRAME = 1000 / 60;
const BOOMERANG_CURVE_AMOUNT = 40;
const NUKE_SHOCKWAVE_LIFE_MS = 650;
const NUKE_SHOCKWAVE_START_RADIUS = 5;

/**
 * Returns the trail life-ms for a bullet whose weapon uses a trail-producing
 * renderKind. Returns 0 for bullets that don't need a trail. Zero-alloc:
 * plain string compare + number return.
 */
function trailLifeMsFor(weaponId: string | undefined): number {
  if (weaponId === 'quantum_bullet') return QUANTUM_TRAIL_LIFE_MS;
  if (weaponId === 'hyper_cannon') return QUANTUM_TRAIL_LIFE_MS;
  if (weaponId === 'spread_shot') return SPREAD_TRAIL_LIFE_MS;
  if (weaponId === 'boomerang') return BOOMERANG_TRAIL_LIFE_MS;
  return 0;
}

function easeInOutSine(k: number): number {
  return 0.5 - 0.5 * Math.cos(k * Math.PI);
}

/**
 * MovementSystem - Handles positional updates for all physics-enabled entities.
 *
 * This system is responsible for:
 * - Enemy movement toward player via behaviors
 * - Enemy separation steering (prevents clumping)
 * - Bullet trajectory updates with trail effects
 * - Particle lifetime and motion
 * - Floating text ascent and fade-out
 * - Speed lines (visual flair during high speed)
 * - Enemy death animations (scaling progress)
 */
export class MovementSystem implements IMovementSystem {
  private static readonly SEPARATION_CONTEXT = {
    enemy: null as unknown as Enemy,
    sepX: 0,
    sepY: 0,
    neighborCount: 0,
  };

  private static handleSeparationNeighbor(
    neighbor: Enemy,
    ctx: typeof MovementSystem.SEPARATION_CONTEXT
  ): void {
    const enemy = ctx.enemy;
    // Skip self and dying enemies
    if (neighbor === enemy || neighbor.isDying || !neighbor.active) {
      return;
    }

    const dx = enemy.x - neighbor.x;
    const dy = enemy.y - neighbor.y;
    const distSq = dx * dx + dy * dy;

    // Skip if too far (optimization)
    if (distSq > SEPARATION.SKIP_DIST_SQ) {
      return;
    }

    // Minimum distance = combined radii + buffer
    const minDist = enemy.radius + neighbor.radius + SEPARATION.BUFFER_PX;
    const minDistSq = minDist * minDist;

    // Only apply force if overlapping or very close
    if (distSq < minDistSq) {
      let dist = Math.sqrt(distSq);
      let dxForce = dx;
      let dyForce = dy;

      // Zero distance fallback: push in a random direction
      // This is critical to break clumping when enemies are at exact same coordinates
      if (dist < 0.01) {
        const angle = Math.random() * Math.PI * 2;
        dxForce = Math.cos(angle);
        dyForce = Math.sin(angle);
        dist = 1.0; // Use a virtual distance of 1px for force calculation
      }

      const overlap = minDist - dist;

      // Soft falloff: closer = stronger push
      const force = (overlap / minDist) * SEPARATION.STRENGTH;

      // Accumulate separation vector (direction away from neighbor)
      ctx.sepX += (dxForce / dist) * force;
      ctx.sepY += (dyForce / dist) * force;
      ctx.neighborCount++;
    }
  }

  /** Frame counter for throttled separation updates */
  private frameCounter: number = 0;

  /**
   * Main update entry point for all moving entities.
   *
   * @param pool - The object pool manager containing active entities
   * @param dtFactor - Delta time factor (scaled to 60fps)
   * @param width - Canvas width for screen boundary checks
   * @param height - Canvas height for screen boundary checks
   * @param player - Current player state for AI targeting
   */
  public update(
    pool: IPoolManager,
    dtFactor: number,
    width: number,
    height: number,
    player: Player
  ): void {
    const perfConfig = DeviceBenchmarkService.getPerformanceConfig();

    // Increment frame counter for throttled updates
    this.frameCounter++;

    this.updateEnemies(pool, dtFactor, player, width, height);
    this.updateBullets(pool, dtFactor, width, height, perfConfig, player);
    this.updateParticles(pool, dtFactor);
    this.updateFloatingTexts(pool, dtFactor);
    this.updateSpeedLines(pool, dtFactor);
    this.updateImpactRings(pool, dtFactor);
    this.updateDyingEnemies(pool, dtFactor);
  }

  /**
   * Update enemy positions and entry/spawn progress.
   */
  private updateEnemies(
    pool: IPoolManager,
    dtFactor: number,
    player: Player,
    width: number,
    height: number
  ): void {
    // Check if this is a separation frame (throttled for performance)
    const shouldApplySeparation = this.frameCounter % SEPARATION.THROTTLE_FRAMES === 0;

    for (let i = 0, len = pool.activeEnemies.length; i < len; i++) {
      const e = pool.activeEnemies[i];
      if (e === undefined || e.isDying) {
        continue;
      }

      // Update spawn animation progress
      if (e.hasEnteredScreen && e.spawnTimer !== undefined && e.spawnTimer > 0) {
        e.spawnTimer -= GAME_ENGINE.SPAWN_ANIMATION_DECAY * dtFactor;
        if (e.spawnTimer < 0) {
          e.spawnTimer = 0;
        }
      }

      // Execute AI behavior move logic
      e.behavior.move(e, player.x, player.y, dtFactor);

      // Apply separation steering to prevent clumping (throttled)
      if (shouldApplySeparation && e.hasEnteredScreen) {
        this.applySeparation(e, player);
      }

      if (!e.hasEnteredScreen) {
        // Mark as entered screen when any part of the enemy is visible
        const margin = e.radius;
        const isVisible =
          e.x > -margin &&
          e.x < width + margin &&
          e.y > -margin &&
          e.y < height + margin;

        if (isVisible) {
          e.hasEnteredScreen = true;
          e.spawnTimer = GAME_ENGINE.SPAWN_ANIMATION_INITIAL;
        }
      }
    }
  }

  /**
   * Update speed line transparency and position.
   */
  private updateSpeedLines(pool: IPoolManager, dtFactor: number): void {
    for (let i = 0, len = pool.activeSpeedLines.length; i < len; i++) {
      const line = pool.activeSpeedLines[i];
      if (line === undefined) continue;

      line.x += line.vx * dtFactor;
      line.y += line.vy * dtFactor;
      line.opacity -= line.decay * dtFactor;

      if (line.opacity <= 0) {
        line.active = false;
      }
    }
  }

  private updateImpactRings(pool: IPoolManager, dtFactor: number): void {
    for (let i = 0, len = pool.activeImpactRings.length; i < len; i++) {
      const ring = pool.activeImpactRings[i];
      if (ring === undefined) continue;

      ring.life -= GAME_ENGINE.IMPACT_RING_LIFE_DECAY * dtFactor;
      if (ring.life <= 0) {
        ring.active = false;
        continue;
      }

      const progress = 1 - ring.life;
      ring.radius = ring.startRadius + (ring.maxRadius - ring.startRadius) * progress;
    }
  }

  /**
   * Update bullet positions and spawn trail particles.
   */
  private updateBullets(
    pool: IPoolManager,
    dtFactor: number,
    width: number,
    height: number,
    perfConfig: PerformanceConfig,
    player: Player
  ): void {
    const trailCfg = ParticleConfigService.trail;
    const particleMultiplier = perfConfig.particleMultiplier;
    // Convert engine-normalized dtFactor (1.0 == one 60fps frame) to ms for
    // time-based trail aging. Avoids reading raw timestamps (pause-safe).
    const dtMs = dtFactor * QUANTUM_TRAIL_MS_PER_FRAME;

    const bullets = pool.activeBullets;
    for (let i = 0; i < bullets.length; i++) {
      const bullet = bullets[i]!;
      const handledByWeapon = this.updateWeaponSpecificBullet(
        bullet,
        dtFactor,
        dtMs,
        player,
        pool
      );

      if (!handledByWeapon) {
        bullet.x += bullet.vx * dtFactor;
        bullet.y += bullet.vy * dtFactor;
      }

      this.updateProjectileTrail(bullet, dtMs);

      if (handledByWeapon) {
        continue;
      }

      // Spawn trail particles based on performance settings
      if (Math.random() < trailCfg.spawnChance * particleMultiplier) {
        const offX =
          (Math.random() - GAME_ENGINE.TRAIL_SPAWN_OFFSET_FACTOR) *
          GAME_ENGINE.TRAIL_SPAWN_OFFSET_MAX;
        const offY =
          (Math.random() - GAME_ENGINE.TRAIL_SPAWN_OFFSET_FACTOR) *
          GAME_ENGINE.TRAIL_SPAWN_OFFSET_MAX;
        const trailPart = pool.getParticle(
          bullet.x + offX,
          bullet.y + offY,
          -bullet.vx * trailCfg.speedMultiplier,
          -bullet.vy * trailCfg.speedMultiplier,
          bullet.color
        );
        trailPart.life = trailCfg.life;
        trailPart.radius = bullet.radius * trailCfg.radiusMultiplier;
      }

      // Cleanup bullets that go far off-screen
      if (
        bullet.x < -GAME_ENGINE.BULLET_OFFSCREEN_THRESHOLD ||
        bullet.x > width + GAME_ENGINE.BULLET_OFFSCREEN_THRESHOLD ||
        bullet.y < -GAME_ENGINE.BULLET_OFFSCREEN_THRESHOLD ||
        bullet.y > height + GAME_ENGINE.BULLET_OFFSCREEN_THRESHOLD
      ) {
        bullet.active = false;
      }
    }
  }

  private updateWeaponSpecificBullet(
    bullet: Bullet,
    dtFactor: number,
    dtMs: number,
    player: Player,
    pool: IPoolManager
  ): boolean {
    switch (bullet.weaponId) {
      case 'laser':
        bullet.age = (bullet.age ?? 0) + dtMs;
        if (bullet.maxAge !== undefined && bullet.age >= bullet.maxAge) {
          bullet.active = false;
        }
        return true;
      case 'orbit_shield':
        this.updateOrbitBullet(bullet, dtMs, player);
        return true;
      case 'boomerang':
        this.updateBoomerangBullet(bullet, dtFactor, dtMs, player, pool);
        return true;
      case 'aoe_nuke':
        this.updateNukeBullet(bullet, dtFactor, dtMs, pool);
        return true;
      default:
        return false;
    }
  }

  private updateProjectileTrail(bullet: Bullet, dtMs: number): void {
    const trailLifeMs = trailLifeMsFor(bullet.weaponId);
    if (trailLifeMs <= 0) return;

    let trail = bullet.trail;
    if (trail === undefined) {
      trail = [];
      bullet.trail = trail;
    }

    for (let i = 0; i < trail.length; i++) {
      trail[i]!.age += dtMs;
    }
    while (trail.length > 0 && trail[0]!.age > trailLifeMs) {
      trail.shift();
    }
    while (trail.length >= TRAIL_MAX_POINTS) {
      trail.shift();
    }
    trail.push({ x: bullet.x, y: bullet.y, age: 0 });
  }

  private updateOrbitBullet(bullet: Bullet, dtMs: number, player: Player): void {
    const angle = (bullet.orbitAngle ?? 0) + (bullet.orbitSpeed ?? 0) * dtMs;
    const radius = bullet.orbitRadius ?? 55;
    bullet.orbitAngle = angle % (Math.PI * 2);
    bullet.x = player.x + Math.cos(bullet.orbitAngle) * radius;
    bullet.y = player.y + Math.sin(bullet.orbitAngle) * radius;
  }

  private updateBoomerangBullet(
    bullet: Bullet,
    dtFactor: number,
    dtMs: number,
    player: Player,
    pool: IPoolManager
  ): void {
    const maxAge = bullet.maxAge ?? 1550;
    const previousX = bullet.x;
    const previousY = bullet.y;
    bullet.age = (bullet.age ?? 0) + dtMs;

    if (bullet.age >= maxAge) {
      bullet.active = false;
      return;
    }

    const t = bullet.age / maxAge;
    const wasReturning = bullet.phase === 'return';
    const returning = t >= 0.5;
    if (returning && !wasReturning) {
      bullet.phase = 'return';
      bullet.hitSet?.clear();

      // Spawn apex sparks (fuchsia)
      const sparkCount = 14;
      for (let i = 0; i < sparkCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const vx = Math.cos(angle) * (1 + Math.random() * 3);
        const vy = Math.sin(angle) * (1 + Math.random() * 3);
        const p = pool.getParticle(bullet.x, bullet.y, vx, vy, '#d946ef');
        p.life = 0.5 + Math.random() * 0.3;
      }
    }

    const spawnX = bullet.spawnX ?? previousX;
    const spawnY = bullet.spawnY ?? previousY;
    const targetX = bullet.targetX ?? spawnX + bullet.vx * 80;
    const targetY = bullet.targetY ?? spawnY + bullet.vy * 80;
    const segT = returning ? easeInOutSine((t - 0.5) / 0.5) : easeInOutSine(t / 0.5);
    const ax = returning ? targetX : spawnX;
    const ay = returning ? targetY : spawnY;
    const bx = returning ? player.x : targetX;
    const by = returning ? player.y : targetY;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const offset =
      Math.sin(segT * Math.PI) * BOOMERANG_CURVE_AMOUNT * (bullet.curveSign ?? 1);

    bullet.x = ax + dx * segT + (-dy / len) * offset;
    bullet.y = ay + dy * segT + (dx / len) * offset;
    if (dtFactor > 0) {
      bullet.vx = (bullet.x - previousX) / dtFactor;
      bullet.vy = (bullet.y - previousY) / dtFactor;
    }

    const pdx = player.x - bullet.x;
    const pdy = player.y - bullet.y;
    if (returning && pdx * pdx + pdy * pdy < 18 * 18) {
      bullet.active = false;
    }
  }

  private updateNukeBullet(
    bullet: Bullet,
    dtFactor: number,
    dtMs: number,
    pool: IPoolManager
  ): void {
    bullet.age = (bullet.age ?? 0) + dtMs;

    if (bullet.phase === 'shockwave') {
      const maxRadius = bullet.shockwaveMaxRadius ?? 68;
      const k = Math.min(1, bullet.age / NUKE_SHOCKWAVE_LIFE_MS);
      bullet.shockwaveRadius =
        NUKE_SHOCKWAVE_START_RADIUS + (maxRadius - NUKE_SHOCKWAVE_START_RADIUS) * k;
      bullet.radius = bullet.shockwaveRadius;
      if (k >= 1) {
        bullet.active = false;
      }
      return;
    }

    bullet.x += bullet.vx * dtFactor;
    bullet.y += bullet.vy * dtFactor;
    if (bullet.maxAge !== undefined && bullet.age >= bullet.maxAge) {
      this.detonateNuke(bullet, pool);
    }
  }

  private detonateNuke(bullet: Bullet, pool: IPoolManager): void {
    bullet.phase = 'shockwave';
    bullet.age = 0;
    bullet.vx = 0;
    bullet.vy = 0;
    bullet.shockwaveRadius = NUKE_SHOCKWAVE_START_RADIUS;
    bullet.radius = NUKE_SHOCKWAVE_START_RADIUS;
    bullet.hitSet?.clear();
    spawnNukeDetonationParticles(bullet.x, bullet.y, pool);
  }

  /**
   * Update particle positions and fade-out life.
   */
  private updateParticles(pool: IPoolManager, dtFactor: number): void {
    const damping = Math.pow(GAME_ENGINE.PARTICLE_DAMPING, dtFactor);

    for (let i = 0, len = pool.activeParticles.length; i < len; i++) {
      const part = pool.activeParticles[i];
      if (part === undefined) continue;

      part.x += part.vx * dtFactor;
      part.y += part.vy * dtFactor;

      // Apply friction for more organic feel (prevents infinite floating)
      part.vx *= damping;
      part.vy *= damping;

      part.life -= GAME_ENGINE.PARTICLE_LIFE_DECAY * dtFactor;
      if (part.life <= 0) {
        part.active = false;
      }
    }
  }

  /**
   * Update floating text ascent and fading progress.
   */
  private updateFloatingTexts(pool: IPoolManager, dtFactor: number): void {
    for (let i = 0, len = pool.activeFloatingTexts.length; i < len; i++) {
      const text = pool.activeFloatingTexts[i];
      if (text === undefined) continue;

      text.y -= GAME_ENGINE.FLOATING_TEXT_SPEED * dtFactor;
      text.life -= GAME_ENGINE.FLOATING_TEXT_LIFE_DECAY * dtFactor;
      if (text.life <= 0) {
        text.active = false;
      }
    }
  }

  /**
   * Update progress for enemies in the 'dying' state (death animation).
   */
  private updateDyingEnemies(pool: IPoolManager, dtFactor: number): void {
    for (let i = 0, len = pool.activeEnemies.length; i < len; i++) {
      const enemy = pool.activeEnemies[i];
      if (enemy === undefined) continue;

      if (enemy.isDying) {
        enemy.deathProgress =
          (enemy.deathProgress ?? 0) + GAME_ENGINE.ENEMY_DEATH_POP_SPEED * dtFactor;

        if (enemy.deathProgress >= 1) {
          enemy.active = false;
          enemy.isDying = false;
          enemy.deathProgress = 0;
        }
      }
    }
  }

  /**
   * Apply separation steering force to prevent enemy clumping.
   *
   * Uses Boids "separation" algorithm: each enemy is gently pushed away
   * from nearby neighbors that are within their combined radii.
   *
   * Performance: Uses SpatialGrid.forEachNearby for O(1) cell lookups,
   * and is called only every THROTTLE_FRAMES frames.
   *
   * @param enemy - The enemy to apply separation to
   */
  private applySeparation(enemy: Enemy, player: Player): void {
    const ctx = MovementSystem.SEPARATION_CONTEXT;
    ctx.enemy = enemy;
    ctx.sepX = 0;
    ctx.sepY = 0;
    ctx.neighborCount = 0;

    // 1. Separation from Player (prevents enemies from stacking at player's center)
    const pdx = enemy.x - player.x;
    const pdy = enemy.y - player.y;
    const pdistSq = pdx * pdx + pdy * pdy;

    // player hit box radius is tight (9px), but we use a larger visual radius for separation
    const minPlayerDist = (player.radius || 12) + enemy.radius + SEPARATION.BUFFER_PX;
    const minPlayerDistSq = minPlayerDist * minPlayerDist;

    if (pdistSq < minPlayerDistSq) {
      let pdist = Math.sqrt(pdistSq);
      let fx = pdx;
      let fy = pdy;

      if (pdist < 0.01) {
        const angle = Math.random() * Math.PI * 2;
        fx = Math.cos(angle);
        fy = Math.sin(angle);
        pdist = 1.0;
      }

      const pOverlap = minPlayerDist - pdist;
      const pForce = (pOverlap / minPlayerDist) * SEPARATION.STRENGTH * 1.5; // Slightly stronger push from player

      ctx.sepX += (fx / pdist) * pForce;
      ctx.sepY += (fy / pdist) * pForce;
      ctx.neighborCount++;
    }

    // 2. Separation from other Enemies (using zero-allocation context variant)
    enemyGrid.forEachNearbyWithContext(
      enemy.x,
      enemy.y,
      ctx,
      MovementSystem.handleSeparationNeighbor
    );

    // Apply accumulated separation force
    if (ctx.neighborCount > 0) {
      // Clamp force to prevent jittering in dense swarms
      const clampedX = Math.max(
        -SEPARATION.MAX_FORCE,
        Math.min(SEPARATION.MAX_FORCE, ctx.sepX)
      );
      const clampedY = Math.max(
        -SEPARATION.MAX_FORCE,
        Math.min(SEPARATION.MAX_FORCE, ctx.sepY)
      );

      enemy.x += clampedX;
      enemy.y += clampedY;
    }

    // Clean up reference to prevent memory leaks
    ctx.enemy = null!;
  }
}

/**
 * Spawns orange/yellow debris particles and dark smoke particles on Nuke detonation.
 */
function spawnNukeDetonationParticles(x: number, y: number, pool: IPoolManager): void {
  // Debris particles (orange/yellow)
  for (let i = 0; i < 26; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const color = Math.random() < 0.5 ? '#ff8833' : '#ffcc44';
    const p = pool.getParticle(x, y, vx, vy, color);
    p.life = 0.6 + Math.random() * 0.4;
  }
  // Smoke particles (dark brown, slowly rising)
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 1.5;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - 1.0; // drift upwards
    const p = pool.getParticle(x, y, vx, vy, '#3e2723'); // Dark brown smoke
    p.life = 0.8 + Math.random() * 0.4;
  }
}
