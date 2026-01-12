import { type IPoolManager } from '../interfaces/IPoolManager';
import { type Player } from '../../types';
import { ParticleConfigService } from '../ParticleConfigService';
import { DeviceBenchmarkService } from '../DeviceBenchmarkService';
import { type PerformanceConfig } from '../../types/DeviceProfile';
import { GAME_ENGINE } from '../../constants';
import { type IMovementSystem } from '../interfaces/IPhysicsSubsystems';

/**
 * MovementSystem - Handles positional updates for all physics-enabled entities.
 *
 * This system is responsible for:
 * - Enemy movement toward player via behaviors
 * - Bullet trajectory updates with trail effects
 * - Particle lifetime and motion
 * - Floating text ascent and fade-out
 * - Speed lines (visual flair during high speed)
 * - Enemy death animations (scaling progress)
 */
export class MovementSystem implements IMovementSystem {
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

    pool.activeBullets.forEach(bullet => {
      bullet.x += bullet.vx * dtFactor;
      bullet.y += bullet.vy * dtFactor;

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
    pool.activeParticles.forEach(part => {
      part.x += part.vx * dtFactor;
      part.y += part.vy * dtFactor;
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
}
