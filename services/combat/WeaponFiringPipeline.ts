/**
 * WeaponFiringPipeline — Shared targeting + firing logic for ALL weapons.
 *
 * Extracts the core pipeline from CombatSystem's base weapon firing:
 *   1. Find nearest on-screen enemy (SpatialGrid → viewport check)
 *   2. Calculate predictive intercept (leading shots)
 *   3. Spawn projectiles with weapon-specific behavior
 *
 * Every weapon — base auto-fire and WeaponSystem extras — now flows through
 * this single pipeline, ensuring consistent targeting, viewport culling, and
 * predictive aiming across all weapon types.
 *
 * Behavior strategies:
 *   - 'targeted': Standard aimed shot at nearest enemy
 *   - 'spread': Fan-pattern with wider spread angle
 *   - 'burst': 360° radial burst, no target needed
 */

import { type IPoolManager } from '../interfaces/IPoolManager';
import { type WeaponConfig, type WeaponBehavior } from '../../types/weapons';
import { COMBAT_CONFIG } from '../../config';
import { COLORS } from '../../constants';
import { createViewportBounds, isCircleVisible } from '../renderers/CullingUtils';
import { enemyGrid } from './SpatialGrid';
import { PredictiveTargeting } from '../../strategies/combat/PredictiveTargeting';

// ─── Types ──────────────────────────────────────────────────────────────

/** Target candidate resolved by the shared targeting pipeline. */
export interface TargetCandidate {
  x: number;
  y: number;
  dist: number;
  speed: number;
}

/** Context required to fire a weapon. */
export interface WeaponFireContext {
  /** Player position X */
  playerX: number;
  /** Player position Y */
  playerY: number;
  /** Pre-calculated damage (includes level scaling + market bonus) */
  damage: number;
  /** Current weapon level (1-5) */
  level: number;
  /** Weapon config from registry */
  config: WeaponConfig;
  /** Pool manager for spawning bullets */
  pool: IPoolManager;
  /** Current viewport width */
  screenWidth: number;
  /** Current viewport height */
  screenHeight: number;
}

// ─── Constants ──────────────────────────────────────────────────────────

/** Default spread angle between projectiles (radians) */
const DEFAULT_SPREAD_ANGLE = 0.15;

/** Viewport padding for weapon targeting (px) */
const TARGETING_VIEWPORT_PADDING = 100;

// ─── Pipeline ───────────────────────────────────────────────────────────

/**
 * Shared weapon firing pipeline.
 * Singleton-free — all methods are pure functions operating on provided context.
 */
export const WeaponFiringPipeline = {
  /**
   * Main entry point. Resolves behavior, finds target (if needed), and spawns
   * projectiles using the same core logic that powers the base weapon.
   *
   * @returns `true` if projectiles were spawned, `false` if no valid target.
   */
  fire(ctx: WeaponFireContext): boolean {
    const behavior: WeaponBehavior = ctx.config.behavior ?? 'targeted';

    switch (behavior) {
      case 'burst':
        return fireBurst(ctx);
      case 'spread':
      case 'targeted':
        return fireTargeted(ctx, behavior);
      default:
        return fireTargeted(ctx, 'targeted');
    }
  },

  /**
   * Exposed for CombatSystem to share the same targeting logic.
   * Searches SpatialGrid → extended grid → fallback loop, with viewport culling.
   */
  findNearestOnScreenEnemy(
    pool: IPoolManager,
    playerX: number,
    playerY: number,
    screenWidth: number,
    screenHeight: number
  ): TargetCandidate | null {
    return findNearestEnemy(pool, playerX, playerY, screenWidth, screenHeight);
  },
};

// ─── Behavior: Targeted / Spread ────────────────────────────────────────

function fireTargeted(
  ctx: WeaponFireContext,
  behavior: 'targeted' | 'spread'
): boolean {
  const target = findNearestEnemy(
    ctx.pool,
    ctx.playerX,
    ctx.playerY,
    ctx.screenWidth,
    ctx.screenHeight
  );
  if (!target) return false;

  // Predictive aiming — lead the target based on its velocity
  const interceptPos = PredictiveTargeting.calculateIntercept(
    { x: ctx.playerX, y: ctx.playerY },
    target
  );
  const baseAngle = Math.atan2(
    interceptPos.y - ctx.playerY,
    interceptPos.x - ctx.playerX
  );

  const count = ctx.config.projectileCount + Math.max(0, ctx.level - 1);
  const spreadAngle =
    behavior === 'spread' ? (ctx.config.spreadAngle ?? 0.4) : DEFAULT_SPREAD_ANGLE;

  spawnProjectileFan(ctx, baseAngle, count, spreadAngle);
  return true;
}

// ─── Behavior: Burst ────────────────────────────────────────────────────

function fireBurst(ctx: WeaponFireContext): boolean {
  const count = ctx.config.projectileCount + Math.max(0, ctx.level - 1);

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const vx = Math.cos(angle) * ctx.config.projectileSpeed;
    const vy = Math.sin(angle) * ctx.config.projectileSpeed;

    const bullet = ctx.pool.getBullet(
      ctx.playerX,
      ctx.playerY,
      vx,
      vy,
      ctx.damage,
      ctx.config.projectileRadius,
      '#44ddff',
      false,
      false
    );
    bullet.weaponId = ctx.config.id;
  }
  return true;
}

// ─── Shared: Projectile Fan Spawner ─────────────────────────────────────

function spawnProjectileFan(
  ctx: WeaponFireContext,
  baseAngle: number,
  count: number,
  spreadAngle: number
): void {
  for (let i = 0; i < count; i++) {
    const angleOffset = (i - (count - 1) / 2) * spreadAngle;
    const finalAngle = baseAngle + angleOffset;
    const vx = Math.cos(finalAngle) * ctx.config.projectileSpeed;
    const vy = Math.sin(finalAngle) * ctx.config.projectileSpeed;

    const bullet = ctx.pool.getBullet(
      ctx.playerX,
      ctx.playerY,
      vx,
      vy,
      ctx.damage,
      ctx.config.projectileRadius,
      COLORS.BULLET,
      false,
      false
    );
    bullet.weaponId = ctx.config.id;
  }
}

// ─── Shared: Targeting (SpatialGrid + Viewport) ─────────────────────────

function findNearestEnemy(
  pool: IPoolManager,
  playerX: number,
  playerY: number,
  screenWidth: number,
  screenHeight: number
): TargetCandidate | null {
  const viewportBounds =
    screenWidth > 0 && screenHeight > 0
      ? createViewportBounds(screenWidth, screenHeight, TARGETING_VIEWPORT_PADDING)
      : null;

  let bestX = 0;
  let bestY = 0;
  let bestDistSq = Infinity;
  let bestSpeed = 0;
  let found = false;

  const checkEnemy = (enemy: {
    x: number;
    y: number;
    speed: number;
    radius?: number;
    isDying?: boolean;
    active?: boolean;
  }) => {
    if (enemy.isDying || !enemy.active) return;

    if (viewportBounds) {
      const r = enemy.radius ?? COMBAT_CONFIG.DEFAULT_ENEMY_RADIUS_FALLBACK;
      if (!isCircleVisible(enemy.x, enemy.y, r, viewportBounds)) return;
    }

    const dx = enemy.x - playerX;
    const dy = enemy.y - playerY;
    const distSq = dx * dx + dy * dy;

    if (distSq < bestDistSq) {
      bestX = enemy.x;
      bestY = enemy.y;
      bestDistSq = distSq;
      bestSpeed = enemy.speed;
      found = true;
    }
  };

  // Step 1: SpatialGrid 3x3 (immediate surroundings)
  enemyGrid.forEachInRange(playerX, playerY, 1, checkEnemy);

  // Step 2: SpatialGrid 7x7 (extended range)
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!found) {
    enemyGrid.forEachInRange(playerX, playerY, 3, checkEnemy);
  }

  // Step 3: Fallback brute-force for edge-of-viewport enemies
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!found) {
    const enemies = pool.activeEnemies;
    for (let i = 0; i < enemies.length; i++) {
      checkEnemy(enemies[i]!);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return found
    ? { x: bestX, y: bestY, dist: Math.sqrt(bestDistSq), speed: bestSpeed }
    : null;
}
