import { type Player, type GameState } from '../../types';
import { type IPoolManager } from '../interfaces/IPoolManager';
import { type IAudioService } from '../interfaces/IAudioService';
import { audio as defaultAudio } from '../audio';
import { COLORS, COMBAT_CONFIG, PLAYER_STATS } from '../../config';
import { screenService } from '../system/ScreenService';
import { ParticleConfigService } from '../system/ParticleConfigService';
import { CheatManager } from '../system/CheatManager';
import { updateViewportBounds, isCircleVisible, type ViewportBounds } from '../renderers/CullingUtils';
import { BuffManager } from '../patterns/decorators/BuffManager';
import { enemyGrid } from './SpatialGrid';
import { type ICombatSystem } from '../interfaces/ICombatSystem';
import { type IPlayerStats } from '../patterns/decorators/IPlayerStats';
import { PredictiveTargeting } from '../../strategies/combat/PredictiveTargeting';
import { Logger } from '../system/Logger';

// Debug: track first N fires to diagnose "5 bullets at start" report
let __debugFireCount = 0;
const __DEBUG_FIRE_LOG_LIMIT = 10;

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
  private static instance: CombatSystem | null = null;
  private _viewportBounds: ViewportBounds = { left: 0, right: 0, top: 0, bottom: 0 };
  private audio: IAudioService;

  /**
   * Initializes the CombatSystem with a dedicated audio service.
   *
   * @param audioService - Service responsible for playing combat sounds.
   */
  private constructor(audioService: IAudioService = defaultAudio) {
    this.audio = audioService;
  }

  /**
   * Get the singleton instance of CombatSystem
   */
  public static getInstance(): CombatSystem {
    return (CombatSystem.instance ??= new CombatSystem());
  }

  public static resetInstance(): void {
    CombatSystem.instance = null;
  }

  /** Reset debug fire counter (call on game start) */
  public static resetDebugCounter(): void {
    __debugFireCount = 0;
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
   * @returns `true` when projectiles were fired this tick, otherwise `false`.
   */
  public processAutoFire(
    pool: IPoolManager,
    player: Player,
    state: GameState,
    deltaMs: number,
    screenWidth?: number,
    screenHeight?: number
  ): boolean {
    state.fireTimer += deltaMs;

    // Get decorated stats which include active buffs or card modifiers
    const stats = BuffManager.isInitialized() ? BuffManager.getDecoratedStats() : null;
    const effectiveFireRate = stats ? stats.getFireRate() : player.fireRate;
    const effectiveProjectiles = stats ? stats.getProjectiles() : player.projectiles;

    // Cap fire rate to prevent excessive resource usage and audio overlapping
    const cappedFireRate = Math.max(PLAYER_STATS.MAX_FIRE_RATE, effectiveFireRate);

    // Enforce cooldown interval
    if (state.fireTimer < cappedFireRate) {
      return false;
    }

    // Identify target - prioritizing enemies currently visible to the player
    const nearest = this.findNearestEnemy(pool, player, screenWidth, screenHeight);
    if (!nearest) {
      return false;
    }

    // DEBUG: Log first N fires to diagnose rapid-fire bug
    if (__debugFireCount < __DEBUG_FIRE_LOG_LIMIT) {
      __debugFireCount++;
      Logger.info(
        `[CombatSystem DEBUG] Fire #${__debugFireCount}: projectiles=${effectiveProjectiles}, fireRate=${cappedFireRate}ms, fireTimer=${state.fireTimer.toFixed(1)}ms, deltaMs=${deltaMs.toFixed(1)}, player.projectiles=${player.projectiles}`
      );
    }

    // Launch projectiles targeting the predicted position
    this.fireBullets(pool, player, nearest, state, 0, stats);
    state.fireTimer -= cappedFireRate;

    // Provide dynamic audio feedback based on firing intensity
    const fireRateMultiplier = COMBAT_CONFIG.FIRE_RATE_AUDIO_THRESHOLD / cappedFireRate;
    this.audio.playShoot(fireRateMultiplier, effectiveProjectiles);
    return true;
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
    let viewportBounds: ViewportBounds | null = null;
    if (screenWidth !== undefined && screenHeight !== undefined) {
      updateViewportBounds(this._viewportBounds, screenWidth, screenHeight, 0);
      viewportBounds = this._viewportBounds;
    }

    let bestCandidate: { x: number; y: number; distSq: number; speed: number } | null =
      null;

    // Architectural Optimization: Use SpatialGrid for nearby enemy search
    // Step 1: Check 3x3 grid (immediate surroundings)
    enemyGrid.forEachInRange(player.x, player.y, 1, enemy => {
      // Skip dead or dying enemies
      if (enemy.isDying || !enemy.active) {
        return;
      }

      // Optimized viewport check - only calculate if bounds exist
      if (viewportBounds) {
        const enemyRadius = enemy.radius || COMBAT_CONFIG.DEFAULT_ENEMY_RADIUS_FALLBACK;
        if (!isCircleVisible(enemy.x, enemy.y, enemyRadius, viewportBounds)) {
          return;
        }
      }

      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const distSq = dx * dx + dy * dy;

      if (!bestCandidate || distSq < bestCandidate.distSq) {
        bestCandidate = { x: enemy.x, y: enemy.y, distSq, speed: enemy.speed };
      }
    });

    // Step 2: If nothing found, check 7x7 grid (extended surroundings)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!bestCandidate) {
      enemyGrid.forEachInRange(player.x, player.y, 3, enemy => {
        if (enemy.isDying || !enemy.active) return;

        if (viewportBounds) {
          const enemyRadius =
            enemy.radius || COMBAT_CONFIG.DEFAULT_ENEMY_RADIUS_FALLBACK;
          if (!isCircleVisible(enemy.x, enemy.y, enemyRadius, viewportBounds)) return;
        }

        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distSq = dx * dx + dy * dy;

        if (!bestCandidate || distSq < bestCandidate.distSq) {
          bestCandidate = { x: enemy.x, y: enemy.y, distSq, speed: enemy.speed };
        }
      });
    }

    // Fallback: If no enemies found in extended grid, scan all active enemies.
    // This handles edge cases where enemies are at the very edges of wide viewports.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!bestCandidate) {
      const enemies = pool.activeEnemies;
      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i]!;
        if (enemy.isDying || !enemy.active) continue;

        // Optimized viewport check in fallback scan
        if (viewportBounds) {
          const enemyRadius =
            enemy.radius || COMBAT_CONFIG.DEFAULT_ENEMY_RADIUS_FALLBACK;
          if (!isCircleVisible(enemy.x, enemy.y, enemyRadius, viewportBounds)) {
            continue;
          }
        }

        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distSq = dx * dx + dy * dy;
        if (!bestCandidate || distSq < bestCandidate.distSq) {
          bestCandidate = { x: enemy.x, y: enemy.y, distSq, speed: enemy.speed };
        }
      }
    }

    return bestCandidate
      ? {
          x: bestCandidate.x,
          y: bestCandidate.y,
          dist: Math.sqrt(bestCandidate.distSq),
          speed: bestCandidate.speed,
        }
      : null;
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
      damage *= COMBAT_CONFIG.SUPER_CRIT_MULTIPLIER;
    } else if (isCrit) {
      damage *= COMBAT_CONFIG.CRIT_DAMAGE_MULTIPLIER;
    }

    // 4. Calculate predictive intercept position (Leading shots) using extracted strategy
    const interceptPos = PredictiveTargeting.calculateIntercept(
      { x: player.x, y: player.y },
      target
    );
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
      const spread = COMBAT_CONFIG.PROJECTILE_SPREAD;
      const angleOffset = (i - (count - 1) / 2) * spread;
      const finalAngle = baseAngle + angleOffset;

      // Base radius varies by crit tier
      const baseRadius = isSuperCrit
        ? COMBAT_CONFIG.PROJECTILE_RADIUS_SUPER_CRIT
        : isCrit
          ? COMBAT_CONFIG.PROJECTILE_RADIUS_CRIT
          : COMBAT_CONFIG.PROJECTILE_RADIUS_BASE;

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
        Math.cos(finalAngle) * COMBAT_CONFIG.BULLET_SPEED,
        Math.sin(finalAngle) * COMBAT_CONFIG.BULLET_SPEED,
        damage,
        bulletRadius,
        bulletColor,
        isCrit,
        isSuperCrit
      );
    }
  }
}
