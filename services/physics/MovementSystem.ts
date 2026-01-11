import { type IPoolManager } from '../interfaces/IPoolManager';
import { type Player } from '../../types';
import { ParticleConfigService } from '../ParticleConfigService';
import { DeviceBenchmarkService } from '../DeviceBenchmarkService';
import { type PerformanceConfig } from '../../types/DeviceProfile';
import { GAME_ENGINE } from '../../constants';
import { type IMovementSystem } from '../interfaces/IPhysicsSubsystems';

/**
 * MovementSystem - Handles positional updates for all physics-enabled entities.
 */
export class MovementSystem implements IMovementSystem {
  /**
   * Update all entities that only require simple velocity-based movement.
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

  private updateEnemies(
    pool: IPoolManager,
    dtFactor: number,
    player: Player,
    width: number,
    height: number
  ): void {
    pool.activeEnemies.forEach(e => {
      if (e.isDying) return;

      // Update spawn animation timer
      if (e.hasEnteredScreen && e.spawnTimer !== undefined && e.spawnTimer > 0) {
        e.spawnTimer -= 0.1 * dtFactor;
        if (e.spawnTimer < 0) e.spawnTimer = 0;
      }

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
          e.spawnTimer = 1.0;
        }
      }
    });
  }

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

      if (Math.random() < trailCfg.spawnChance * particleMultiplier) {
        const offX = (Math.random() - 0.5) * 4;
        const offY = (Math.random() - 0.5) * 4;
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

      if (
        bullet.x < -100 ||
        bullet.x > width + 100 ||
        bullet.y < -100 ||
        bullet.y > height + 100
      ) {
        bullet.active = false;
      }
    });
  }

  private updateParticles(pool: IPoolManager, dtFactor: number): void {
    pool.activeParticles.forEach(part => {
      part.x += part.vx * dtFactor;
      part.y += part.vy * dtFactor;
      part.life -= 0.02 * dtFactor;
      if (part.life <= 0) part.active = false;
    });
  }

  private updateFloatingTexts(pool: IPoolManager, dtFactor: number): void {
    pool.activeFloatingTexts.forEach(text => {
      text.y -= 1.5 * dtFactor;
      text.life -= 0.025 * dtFactor;
      if (text.life <= 0) text.active = false;
    });
  }

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
