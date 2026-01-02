import { type PoolManager } from '../PoolManager';
import { ParticleConfigService } from '../ParticleConfigService';
import { DeviceBenchmarkService } from '../DeviceBenchmarkService';
import { type PerformanceConfig } from '../../types/DeviceProfile';

/**
 * MovementSystem - Handles positional updates for all physics-enabled entities.
 * Includes trail effects for bullets and lifetime management for temporary entities.
 */
export class MovementSystem {
  /**
   * Update all entities that only require simple velocity-based movement.
   */
  public static update(pool: PoolManager, dtFactor: number, width: number, height: number): void {
    const perfConfig = DeviceBenchmarkService.getPerformanceConfig();

    this.updateBullets(pool, dtFactor, width, height, perfConfig);
    this.updateParticles(pool, dtFactor);
    this.updateFloatingTexts(pool, dtFactor);
  }

  private static updateBullets(
    pool: PoolManager,
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

      // TRAIL EFFECT: Spawn small particles behind bullets periodically
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

      // Check bounds (with buffer)
      if (bullet.x < -100 || bullet.x > width + 100 || bullet.y < -100 || bullet.y > height + 100) {
        bullet.active = false;
      }
    });
  }

  private static updateParticles(pool: PoolManager, dtFactor: number): void {
    pool.activeParticles.forEach(part => {
      part.x += part.vx * dtFactor;
      part.y += part.vy * dtFactor;
      part.life -= 0.02 * dtFactor;
      if (part.life <= 0) part.active = false;
    });
  }

  private static updateFloatingTexts(pool: PoolManager, dtFactor: number): void {
    pool.activeFloatingTexts.forEach(text => {
      text.y -= 1.5 * dtFactor;
      text.life -= 0.025 * dtFactor;
      if (text.life <= 0) text.active = false;
    });
  }
}
