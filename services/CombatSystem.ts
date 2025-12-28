import { type Player, type GameState } from '../types';
import { type PoolManager } from './PoolManager';
import { audio } from './AudioService';
import { COLORS, GAME_ENGINE } from '../constants';
import { ParticleConfigService } from './ParticleConfigService';
import { CheatManager } from './CheatManager';
import { createViewportBounds, isCircleVisible } from './renderers/CullingUtils';

interface NearestEnemy {
  x: number;
  y: number;
  dist: number;
  speed: number;
}

/**
 * CombatSystem handles all firing and combat-related logic.
 * Extracted from GameEngine for better separation of concerns.
 */
export class CombatSystem {
  /**
   * Process auto-fire logic for the player.
   * Finds nearest enemy and fires projectiles at it.
   *
   * @param pool - The pool manager containing active entities
   * @param player - The player entity
   * @param state - Current game state
   * @param time - Current timestamp
   * @returns Updated lastFireTime if fired, otherwise returns current value
   */
  public static processAutoFire(
    pool: PoolManager,
    player: Player,
    state: GameState,
    deltaMs: number,
    screenWidth?: number,
    screenHeight?: number
  ): void {
    state.fireTimer += deltaMs;

    // Cap fire rate to prevent performance issues (minimum 50ms = 20 shots/sec)
    const MIN_FIRE_RATE = 50;
    const effectiveFireRate = Math.max(MIN_FIRE_RATE, player.fireRate);

    // Check fire rate cooldown
    if (state.fireTimer < effectiveFireRate) {
      return;
    }

    // Find nearest enemy (only on-screen enemies)
    const nearest = this.findNearestEnemy(pool, player, screenWidth, screenHeight);
    if (!nearest) {
      return;
    }

    // Fire projectiles
    this.fireBullets(pool, player, nearest, state, 0);
    state.fireTimer = 0;

    // Dynamic audio based on fire rate and projectile count
    const fireRateMultiplier = 200 / player.fireRate; // Higher for faster firing
    audio.playShoot(fireRateMultiplier, player.projectiles);
  }

  /**
   * Find the nearest enemy to the player.
   *
   * @param pool - The pool manager containing active entities
   * @param player - The player entity
   * @returns Nearest enemy position and distance, or null if no enemies
   */
  private static findNearestEnemy(
    pool: PoolManager,
    player: Player,
    screenWidth?: number,
    screenHeight?: number
  ): NearestEnemy | null {
    // Create viewport bounds to filter on-screen enemies only
    // If screen dimensions not provided, consider all enemies (fallback)
    const viewportBounds =
      screenWidth && screenHeight
        ? createViewportBounds(screenWidth, screenHeight, 0) // No padding - only truly visible enemies
        : null;

    return pool.activeEnemies.reduce<NearestEnemy | null>((best, enemy) => {
      // Skip off-screen enemies to prevent shooting at invisible targets
      if (viewportBounds) {
        const enemyRadius = enemy.radius || 20; // Default enemy radius
        if (!isCircleVisible(enemy.x, enemy.y, enemyRadius, viewportBounds)) {
          return best;
        }
      }

      const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      if (!best || dist < best.dist) {
        return { x: enemy.x, y: enemy.y, dist, speed: enemy.speed };
      }
      return best;
    }, null);
  }

  /**
   * Fire bullets towards the target position.
   *
   * @param pool - The pool manager to spawn bullets
   * @param player - The player entity
   * @param target - Target position to fire at
   * @param state - Current game state (unused but kept for future extensions)
   * @param time - Current timestamp (unused but kept for future extensions)
   */
  private static fireBullets(
    pool: PoolManager,
    player: Player,
    target: NearestEnemy,
    _state: GameState,
    _time: number
  ): void {
    const luckBonus = player.luck * 0.02;
    const isSuperCrit =
      CheatManager.isForcedSuperCrit() || Math.random() < (player.critChance + luckBonus) * 0.2;
    const isCrit =
      !isSuperCrit &&
      (CheatManager.isForcedCrit() || Math.random() < player.critChance + luckBonus);

    // IMPROVED LEAD SHOOTING LOGIC
    // Uses quadratic intercept calculation for more accurate predictions

    // 1. Calculate enemy velocity vector (most enemies move towards player)
    const distSafe = target.dist || 1;
    const enemyVx = ((player.x - target.x) / distSafe) * target.speed;
    const enemyVy = ((player.y - target.y) / distSafe) * target.speed;

    // 2. Relative position and velocity
    const relX = target.x - player.x;
    const relY = target.y - player.y;
    const bulletSpeed = GAME_ENGINE.BULLET_SPEED;

    // 3. Solve quadratic equation for intercept time: |P + V*t| = bulletSpeed * t
    // a*t^2 + b*t + c = 0
    const a = enemyVx * enemyVx + enemyVy * enemyVy - bulletSpeed * bulletSpeed;
    const b = 2 * (relX * enemyVx + relY * enemyVy);
    const c = relX * relX + relY * relY;

    let interceptTime = 0;
    if (Math.abs(a) < 0.0001) {
      // Linear case (enemy speed ≈ bullet speed)
      if (Math.abs(b) > 0.0001) {
        interceptTime = -c / b;
      }
    } else {
      const discriminant = b * b - 4 * a * c;
      if (discriminant >= 0) {
        const sqrtD = Math.sqrt(discriminant);
        const t1 = (-b - sqrtD) / (2 * a);
        const t2 = (-b + sqrtD) / (2 * a);
        // Use the smallest positive time
        if (t1 > 0 && t2 > 0) {
          interceptTime = Math.min(t1, t2);
        } else if (t1 > 0) {
          interceptTime = t1;
        } else if (t2 > 0) {
          interceptTime = t2;
        }
      }
    }

    // 4. Apply distance-based lead factor (reduce prediction for close enemies)
    const minLeadDistance = 100; // No lead for enemies closer than this
    const maxLeadDistance = 400; // Full lead for enemies farther than this
    const leadFactor = Math.min(
      1,
      Math.max(0, (target.dist - minLeadDistance) / (maxLeadDistance - minLeadDistance))
    );

    // 5. Clamp intercept time to prevent extreme predictions
    const maxInterceptTime = 60; // Max ~60 frames of prediction
    interceptTime = Math.min(interceptTime, maxInterceptTime) * leadFactor;

    // 6. Calculate predicted target position
    const predictedX = target.x + enemyVx * interceptTime;
    const predictedY = target.y + enemyVy * interceptTime;

    const baseAngle = Math.atan2(predictedY - player.y, predictedX - player.x);

    let damage = player.baseDamage;
    if (isSuperCrit) {
      damage *= 4;
    } else if (isCrit) {
      damage *= 2;
    }

    // Fire all projectiles with spread
    for (let i = 0; i < player.projectiles; i++) {
      const spread = GAME_ENGINE.PROJECTILE_SPREAD;
      const angleOffset = (i - (player.projectiles - 1) / 2) * spread;
      const finalAngle = baseAngle + angleOffset;

      const baseRadius = isSuperCrit ? 9 : isCrit ? 6 : 4;
      const typeMultiplier = isSuperCrit
        ? ParticleConfigService.bullets.superCritSizeMultiplier
        : isCrit
          ? ParticleConfigService.bullets.critSizeMultiplier
          : 1.0;

      // Cap area to prevent excessively large bullets at max upgrades
      const MAX_AREA_MULTIPLIER = 3.0;
      const effectiveArea = Math.min(player.area, MAX_AREA_MULTIPLIER);

      const bulletRadius =
        baseRadius *
        effectiveArea *
        ParticleConfigService.bullets.baseSizeMultiplier *
        typeMultiplier;
      const bulletColor = isSuperCrit ? COLORS.SUPER_CRIT : isCrit ? COLORS.CRIT : COLORS.BULLET;

      pool.getBullet(
        player.x,
        player.y,
        Math.cos(finalAngle) * GAME_ENGINE.BULLET_SPEED,
        Math.sin(finalAngle) * GAME_ENGINE.BULLET_SPEED,
        damage,
        bulletRadius,
        bulletColor,
        isCrit,
        isSuperCrit
      );
    }
  }
}
