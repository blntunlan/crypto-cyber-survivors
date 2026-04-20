import { type IPoolManager } from '../../interfaces/IPoolManager';
import { type Player, type Enemy } from '../../../types';
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
const TRAIL_MAX_POINTS = 16;
/** 1000ms / 60fps ≈ 16.667ms per engine-normalized frame. */
const QUANTUM_TRAIL_MS_PER_FRAME = 1000 / 60;

/**
 * Returns the trail life-ms for a bullet whose weapon uses a trail-producing
 * renderKind. Returns 0 for bullets that don't need a trail. Zero-alloc:
 * plain string compare + number return.
 */
function trailLifeMsFor(weaponId: string | undefined): number {
  if (weaponId === 'quantum_bullet') return QUANTUM_TRAIL_LIFE_MS;
  if (weaponId === 'spread_shot') return SPREAD_TRAIL_LIFE_MS;
  return 0;
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
    this.updateBullets(pool, dtFactor, width, height, perfConfig);
    this.updateParticles(pool, dtFactor);
    this.updateFloatingTexts(pool, dtFactor);
    this.updateSpeedLines(pool, dtFactor);
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

    pool.activeEnemies.forEach(e => {
      if (e.isDying) {
        return;
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
    });
  }

  /**
   * Update speed line transparency and position.
   */
  private updateSpeedLines(pool: IPoolManager, dtFactor: number): void {
    pool.activeSpeedLines.forEach(line => {
      line.x += line.vx * dtFactor;
      line.y += line.vy * dtFactor;
      line.opacity -= line.decay * dtFactor;

      if (line.opacity <= 0) {
        line.active = false;
      }
    });
  }

  /**
   * Update bullet positions and spawn trail particles.
   */
  private updateBullets(
    pool: IPoolManager,
    dtFactor: number,
    width: number,
    height: number,
    perfConfig: PerformanceConfig
  ): void {
    const trailCfg = ParticleConfigService.trail;
    const particleMultiplier = perfConfig.particleMultiplier;
    // Convert engine-normalized dtFactor (1.0 == one 60fps frame) to ms for
    // time-based trail aging. Avoids reading raw timestamps (pause-safe).
    const dtMs = dtFactor * QUANTUM_TRAIL_MS_PER_FRAME;

    pool.activeBullets.forEach(bullet => {
      bullet.x += bullet.vx * dtFactor;
      bullet.y += bullet.vy * dtFactor;

      // --- Phase 1+2 VFX: per-weapon bullet trails ---
      // Per-weapon trail sampling. Lazy-init on first tick (pool recycle
      // resets `trail` to undefined so this fires once per new projectile).
      // Zero-allocation steady-state: exactly one push per frame, plus one
      // shift when oldest points age out. No filter/map/new in the loop.
      const trailLifeMs = trailLifeMsFor(bullet.weaponId);
      if (trailLifeMs > 0) {
        let trail = bullet.trail;
        if (trail === undefined) {
          trail = [];
          bullet.trail = trail;
        }
        // Age existing points in-place.
        for (let i = 0; i < trail.length; i++) {
          trail[i]!.age += dtMs;
        }
        // Drop aged-out points from the head (FIFO ring behavior).
        while (trail.length > 0 && trail[0]!.age > trailLifeMs) {
          trail.shift();
        }
        // Cap on total points as a belt-and-braces bound in case of lag spikes.
        while (trail.length >= TRAIL_MAX_POINTS) {
          trail.shift();
        }
        trail.push({ x: bullet.x, y: bullet.y, age: 0 });
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
    });
  }

  /**
   * Update particle positions and fade-out life.
   */
  private updateParticles(pool: IPoolManager, dtFactor: number): void {
    const damping = Math.pow(GAME_ENGINE.PARTICLE_DAMPING, dtFactor);

    pool.activeParticles.forEach(part => {
      part.x += part.vx * dtFactor;
      part.y += part.vy * dtFactor;

      // Apply friction for more organic feel (prevents infinite floating)
      part.vx *= damping;
      part.vy *= damping;

      part.life -= GAME_ENGINE.PARTICLE_LIFE_DECAY * dtFactor;
      if (part.life <= 0) {
        part.active = false;
      }
    });
  }

  /**
   * Update floating text ascent and fading progress.
   */
  private updateFloatingTexts(pool: IPoolManager, dtFactor: number): void {
    pool.activeFloatingTexts.forEach(text => {
      text.y -= GAME_ENGINE.FLOATING_TEXT_SPEED * dtFactor;
      text.life -= GAME_ENGINE.FLOATING_TEXT_LIFE_DECAY * dtFactor;
      if (text.life <= 0) {
        text.active = false;
      }
    });
  }

  /**
   * Update progress for enemies in the 'dying' state (death animation).
   */
  private updateDyingEnemies(pool: IPoolManager, dtFactor: number): void {
    pool.activeEnemies.forEach(enemy => {
      if (enemy.isDying) {
        enemy.deathProgress =
          (enemy.deathProgress ?? 0) + GAME_ENGINE.ENEMY_DEATH_POP_SPEED * dtFactor;

        if (enemy.deathProgress >= 1) {
          enemy.active = false;
          enemy.isDying = false;
          enemy.deathProgress = 0;
        }
      }
    });
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
    let sepX = 0;
    let sepY = 0;
    let neighborCount = 0;

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

      sepX += (fx / pdist) * pForce;
      sepY += (fy / pdist) * pForce;
      neighborCount++;
    }

    // 2. Separation from other Enemies
    enemyGrid.forEachNearby(enemy.x, enemy.y, neighbor => {
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
        sepX += (dxForce / dist) * force;
        sepY += (dyForce / dist) * force;
        neighborCount++;
      }
    });

    // Apply accumulated separation force
    if (neighborCount > 0) {
      // Clamp force to prevent jittering in dense swarms
      const clampedX = Math.max(
        -SEPARATION.MAX_FORCE,
        Math.min(SEPARATION.MAX_FORCE, sepX)
      );
      const clampedY = Math.max(
        -SEPARATION.MAX_FORCE,
        Math.min(SEPARATION.MAX_FORCE, sepY)
      );

      enemy.x += clampedX;
      enemy.y += clampedY;
    }
  }
}
