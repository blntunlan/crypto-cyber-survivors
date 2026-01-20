import { type Player, type GameState } from '../types';
import { type IPoolManager } from './interfaces/IPoolManager';
import { type IAudioService } from './interfaces/IAudioService';
import { audio as defaultAudio } from './AudioService';
import { COLORS, GAME_ENGINE, COMBAT } from '../constants';
import { PLAYER_STATS } from '../config/PlayerConfig';
import { screenService } from './ScreenService';
import { ParticleConfigService } from './ParticleConfigService';
import { CheatManager } from './CheatManager';
import { createViewportBounds, isCircleVisible } from './renderers/CullingUtils';
import { BuffManager } from './patterns/decorators/BuffManager';
import { type ICombatSystem } from './interfaces/ICombatSystem';
import { type IPlayerStats } from './patterns/decorators/IPlayerStats';

/**
 * Interface representing target candidates for weapon auto-aiming.
 */
interface NearestEnemy {
  x: number;
  y: number;
  dist: number;
  speed: number;
}

/**
 * CombatSystem Class
 *
 * Orchestrates the player's offensive capabilities including automatic targeting,
 * fire rate management, damage calculation (cricks/super-crits), and projectile interception.
 *
 * Uses a predictive model for aiming at moving targets to improve projectile hit rate.
 */
export class CombatSystem implements ICombatSystem {
  private audio: IAudioService;

  /**
   * Initializes the CombatSystem with a dedicated audio service.
   *
   * @param audioService - Service responsible for playing combat sounds.
   */
  constructor(audioService: IAudioService = defaultAudio) {
    this.audio = audioService;
  }

  /**
   * Process main auto-fire logic for the player.
   * Finds the most suitable target within viewport and launches projectiles.
   *
   * @param pool - The pool manager for spawning entities.
   * @param player - The player entity.
   * @param state - Current transient game state.
   * @param deltaMs - Time elapsed since last frame.
   * @param screenWidth - Actual viewport width for culling.
   * @param screenHeight - Actual viewport height for culling.
   */
  public processAutoFire(
    pool: IPoolManager,
    player: Player,
    state: GameState,
    deltaMs: number,
    screenWidth?: number,
    screenHeight?: number
  ): void {
    state.fireTimer += deltaMs;

    // Get decorated stats which include active buffs or card modifiers
    const stats = BuffManager.isInitialized() ? BuffManager.getDecoratedStats() : null;
    const effectiveFireRate = stats ? stats.getFireRate() : player.fireRate;
    const effectiveProjectiles = stats ? stats.getProjectiles() : player.projectiles;

    // Cap fire rate to prevent excessive resource usage and audio overlapping
    const cappedFireRate = Math.max(PLAYER_STATS.MAX_FIRE_RATE, effectiveFireRate);

    // Enforce cooldown interval
    if (state.fireTimer < cappedFireRate) {
      return;
    }

    // Identify target - prioritizing enemies currently visible to the player
    const nearest = this.findNearestEnemy(pool, player, screenWidth, screenHeight);
    if (!nearest) {
      return;
    }

    // Launch projectiles targeting the predicted position
    this.fireBullets(pool, player, nearest, state, 0, stats);
    state.fireTimer = 0;

    // Provide dynamic audio feedback based on firing intensity
    const fireRateMultiplier = 200 / cappedFireRate;
    this.audio.playShoot(fireRateMultiplier, effectiveProjectiles);
  }

  /**
   * Search for the nearest on-screen enemy to the player.
   * Uses squared distance calculation for optimal loop performance.
   *
   * @private
   */
  private findNearestEnemy(
    pool: IPoolManager,
    player: Player,
    screenWidth?: number,
    screenHeight?: number
  ): NearestEnemy | null {
    // Cache viewport bounds calculation to avoid redundant math in the loop
    const viewportBounds =
      screenWidth !== undefined && screenHeight !== undefined
        ? createViewportBounds(screenWidth, screenHeight, 0)
        : null;

    let bestCandidate: { x: number; y: number; distSq: number; speed: number } | null =
      null;

    // Direct iteration over all active enemies.
    const enemies = pool.activeEnemies;
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i]!;

      // Skip dead or dying enemies
      if (enemy.isDying || !enemy.active) {
        continue;
      }

      // Optimized viewport check - only calculate if bounds exist
      // This ensures we only target "rendered" or visible enemies
      if (viewportBounds) {
        const enemyRadius = enemy.radius || COMBAT.DEFAULT_ENEMY_RADIUS_FALLBACK;
        // Strict visibility check: ensuring the enemy is actually within the play area
        if (!isCircleVisible(enemy.x, enemy.y, enemyRadius, viewportBounds)) {
          continue;
        }
      }

      // Use squared distance to avoid Math.sqrt() in the hot loop
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const distSq = dx * dx + dy * dy;

      // Update best candidate if this enemy is closer than the previous best
      if (!bestCandidate || distSq < bestCandidate.distSq) {
        bestCandidate = { x: enemy.x, y: enemy.y, distSq, speed: enemy.speed };
      }
    }

    if (bestCandidate) {
      return {
        x: bestCandidate.x,
        y: bestCandidate.y,
        dist: Math.sqrt(bestCandidate.distSq), // Only one square root per fire cycle
        speed: bestCandidate.speed,
      };
    }

    return null;
  }

  /**
   * Core logic for calculating projectile properties and firing multiple bullets.
   *
   * @private
   */
  private fireBullets(
    pool: IPoolManager,
    player: Player,
    target: NearestEnemy,
    _state: GameState,
    _time: number,
    stats?: IPlayerStats | null
  ): void {
    // 1. Resolve effective stats with global limits
    const effectiveLuck = stats ? stats.getLuck() : player.luck;
    const rawCritChance = stats ? stats.getCritChance() : player.critChance;
    const effectiveCritChance = Math.min(rawCritChance, PLAYER_STATS.MAX_CRIT_CHANCE);
    const effectiveDamage = stats ? stats.getDamage() : player.baseDamage;
    const rawProjectiles = stats ? stats.getProjectiles() : player.projectiles;
    const effectiveProjectiles = Math.min(rawProjectiles, PLAYER_STATS.MAX_PROJECTILES);
    const rawArea = stats ? stats.getArea() : player.area;
    const effectiveArea = Math.min(rawArea, PLAYER_STATS.MAX_AREA);

    // 2. Roll for critical hit status
    const { isCrit, isSuperCrit } = this.calculateCritStatus(
      effectiveCritChance,
      effectiveLuck
    );

    // 3. Apply damage multipliers
    let damage = effectiveDamage;
    if (isSuperCrit) {
      damage *= COMBAT.SUPER_CRIT_DAMAGE_MULTIPLIER;
    } else if (isCrit) {
      damage *= COMBAT.CRIT_DAMAGE_MULTIPLIER;
    }

    // 4. Calculate predictive intercept position (Leading shots)
    const interceptPos = this.calculateInterceptPosition(player, target);
    const baseAngle = Math.atan2(interceptPos.y - player.y, interceptPos.x - player.x);

    // 5. Spawn projectile batch
    this.spawnProjectiles(pool, player, baseAngle, damage, effectiveProjectiles, {
      isCrit,
      isSuperCrit,
      effectiveArea,
    });
  }

  /**
   * Determined critical hit status using tiered probability model.
   *
   * @private
   */
  private calculateCritStatus(
    critChance: number,
    _luck: number
  ): { isCrit: boolean; isSuperCrit: boolean } {
    // Tiered Crit Model: Super Crits have priority but lower base chance
    const isSuperCrit =
      CheatManager.isForcedSuperCrit() || Math.random() < critChance * 0.2;
    const isCrit =
      !isSuperCrit && (CheatManager.isForcedCrit() || Math.random() < critChance);

    return { isCrit, isSuperCrit };
  }

  /**
   * Predicts where a target will be when a projectile arrives.
   * Optimized with cached calculations and early returns.
   *
   * @private
   */
  private calculateInterceptPosition(
    player: Player,
    target: NearestEnemy
  ): { x: number; y: number } {
    // Cache frequently used values
    const distSafe = target.dist || 1;
    const bulletSpeed = GAME_ENGINE.BULLET_SPEED;

    // Early return for very close targets (no prediction needed)
    if (distSafe < COMBAT.MIN_LEAD_DISTANCE) {
      return { x: target.x, y: target.y };
    }

    // Vector analysis of enemy movement relative to player
    const enemyVx = ((player.x - target.x) / distSafe) * target.speed;
    const enemyVy = ((player.y - target.y) / distSafe) * target.speed;

    const relX = target.x - player.x;
    const relY = target.y - player.y;

    // Quadratic intercept: |P + V*t| = B*t
    const enemySpeedSq = enemyVx * enemyVx + enemyVy * enemyVy;
    const bulletSpeedSq = bulletSpeed * bulletSpeed;
    const a = enemySpeedSq - bulletSpeedSq;
    const b = 2 * (relX * enemyVx + relY * enemyVy);
    const c = relX * relX + relY * relY;

    let interceptTime = 0;
    const epsilon = COMBAT.INTERCEPT_EPSILON;

    // Optimized quadratic solution with early returns
    if (Math.abs(a) < epsilon) {
      // Linear case: a ≈ 0
      if (Math.abs(b) > epsilon) {
        interceptTime = Math.max(0, -c / b);
      }
    } else {
      const discriminant = b * b - 4 * a * c;
      if (discriminant >= 0) {
        const sqrtD = Math.sqrt(discriminant);
        const t1 = (-b - sqrtD) / (2 * a);
        const t2 = (-b + sqrtD) / (2 * a);

        // Choose the smallest positive time
        if (t1 > 0 && t2 > 0) {
          interceptTime = Math.min(t1, t2);
        } else if (t1 > 0) {
          interceptTime = t1;
        } else if (t2 > 0) {
          interceptTime = t2;
        }
      }
    }

    // Clamp to reasonable limits and apply lead factor
    const maxTime = COMBAT.MAX_INTERCEPT_TIME_FRAMES;
    interceptTime = Math.max(0, Math.min(interceptTime, maxTime));

    // Smooth lead factor based on distance
    const leadFactor = Math.min(
      1,
      Math.max(
        0,
        (distSafe - COMBAT.MIN_LEAD_DISTANCE) /
          (COMBAT.MAX_LEAD_DISTANCE - COMBAT.MIN_LEAD_DISTANCE)
      )
    );

    interceptTime *= leadFactor;

    return {
      x: target.x + enemyVx * interceptTime,
      y: target.y + enemyVy * interceptTime,
    };
  }

  /**
   * Spawns physical bullets into the world with correct spread and visual properties.
   *
   * @private
   */
  private spawnProjectiles(
    pool: IPoolManager,
    player: Player,
    baseAngle: number,
    damage: number,
    count: number,
    options: { isCrit: boolean; isSuperCrit: boolean; effectiveArea: number }
  ): void {
    const { isCrit, isSuperCrit, effectiveArea } = options;

    for (let i = 0; i < count; i++) {
      const spread = GAME_ENGINE.PROJECTILE_SPREAD;
      const angleOffset = (i - (count - 1) / 2) * spread;
      const finalAngle = baseAngle + angleOffset;

      // Base radius varies by crit tier
      const baseRadius = isSuperCrit
        ? COMBAT.PROJECTILE_RADIUS_SUPER_CRIT
        : isCrit
          ? COMBAT.PROJECTILE_RADIUS_CRIT
          : COMBAT.PROJECTILE_RADIUS_BASE;

      // Increase projectile size on mobile for better visibility/gameplay
      // On Desktop, we also boost it slightly for better impact visibility (1.0 -> 1.25)
      const mobileMultiplier = screenService.isMobile() ? 1.5 : 1.25;

      const typeMultiplier = isSuperCrit
        ? ParticleConfigService.bullets.superCritSizeMultiplier
        : isCrit
          ? ParticleConfigService.bullets.critSizeMultiplier
          : 1.0;

      const bulletRadius =
        baseRadius *
        effectiveArea *
        ParticleConfigService.bullets.baseSizeMultiplier *
        typeMultiplier *
        mobileMultiplier;

      const bulletColor = isSuperCrit
        ? COLORS.SUPER_CRIT
        : isCrit
          ? COLORS.CRIT
          : COLORS.BULLET;

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
