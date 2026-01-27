import { COMBAT_CONFIG } from '../../config';

export interface Point {
  x: number;
  y: number;
}

export interface TargetData extends Point {
  dist: number;
  speed: number;
}

/**
 * PredictiveTargeting - Pure logic for calculating intercept points.
 * Extracted from CombatSystem for better testability and isolation.
 */
export const PredictiveTargeting = {
  /**
   * Predicts where a target will be when a projectile arrives.
   * Optimized with quadratic formula for high-speed intercepts.
   */
  calculateIntercept(
    origin: Point,
    target: TargetData
  ): Point {
    const distSafe = target.dist || 1;
    const bulletSpeed = COMBAT_CONFIG.BULLET_SPEED;

    // Early return for very close targets
    if (distSafe < COMBAT_CONFIG.MIN_LEAD_DISTANCE) {
      return { x: target.x, y: target.y };
    }

    // Vector analysis of enemy movement relative to player
    const enemyVx = ((origin.x - target.x) / distSafe) * target.speed;
    const enemyVy = ((origin.y - target.y) / distSafe) * target.speed;

    const relX = target.x - origin.x;
    const relY = target.y - origin.y;

    // Quadratic intercept: |P + V*t| = B*t
    const enemySpeedSq = enemyVx * enemyVx + enemyVy * enemyVy;
    const bulletSpeedSq = bulletSpeed * bulletSpeed;
    const a = enemySpeedSq - bulletSpeedSq;
    const b = 2 * (relX * enemyVx + relY * enemyVy);
    const c = relX * relX + relY * relY;

    let interceptTime = 0;
    const epsilon = COMBAT_CONFIG.INTERCEPT_EPSILON;

    if (Math.abs(a) < epsilon) {
      if (Math.abs(b) > epsilon) {
        interceptTime = Math.max(0, -c / b);
      }
    } else {
      const discriminant = b * b - 4 * a * c;
      if (discriminant >= 0) {
        const sqrtD = Math.sqrt(discriminant);
        const t1 = (-b - sqrtD) / (2 * a);
        const t2 = (-b + sqrtD) / (2 * a);

        if (t1 > 0 && t2 > 0) {
          interceptTime = Math.min(t1, t2);
        } else if (t1 > 0) {
          interceptTime = t1;
        } else if (t2 > 0) {
          interceptTime = t2;
        }
      }
    }

    const maxTime = COMBAT_CONFIG.MAX_INTERCEPT_TIME_FRAMES;
    interceptTime = Math.max(0, Math.min(interceptTime, maxTime));

    const leadFactor = Math.min(
      1,
      Math.max(
        0,
        (distSafe - COMBAT_CONFIG.MIN_LEAD_DISTANCE) /
          (COMBAT_CONFIG.MAX_LEAD_DISTANCE - COMBAT_CONFIG.MIN_LEAD_DISTANCE)
      )
    );

    interceptTime *= leadFactor;

    return {
      x: target.x + enemyVx * interceptTime,
      y: target.y + enemyVy * interceptTime,
    };
  }
};
