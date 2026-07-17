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
 *   - 'boomerang': Curved outbound/return projectile
 *   - 'laser': Short-lived segmented beam
 *   - 'nuke': Slow projectile that expands into a shockwave
 *   - 'orbit': Persistent orbiters around the player
 */

import { type IPoolManager } from '../interfaces/IPoolManager';
import { type WeaponConfig, type WeaponBehavior } from '../../types/weapons';
import { COMBAT_CONFIG } from '../../config';
import { COLORS } from '../../constants';
import { createViewportBounds, isCircleVisible, type ViewportBounds } from '../renderers/CullingUtils';
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
const LASER_SEGMENT_SPACING = 30;
const LASER_SEGMENT_LENGTH = 44;
const LASER_LIFE_MS = 160;
const LASER_MAX_SEGMENTS = 18;
const BOOMERANG_LIFE_MS = 1550;
const BOOMERANG_SPREAD_ANGLE = 0.22;
const NUKE_FLIGHT_MAX_MS = 2400;
const NUKE_SHOCKWAVE_RADIUS = 68;
const NUKE_SHOCKWAVE_RADIUS_PER_LEVEL = 8;
const ORBIT_RADIUS = 55;
const ORBIT_RADIUS_PER_LEVEL = 3;
const ORBIT_SPEED = 0.0035;

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
      case 'boomerang':
        return fireBoomerang(ctx);
      case 'laser':
        return fireLaser(ctx);
      case 'nuke':
        return fireNuke(ctx);
      case 'orbit':
        return fireOrbit(ctx);
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

// ─── Behavior: Boomerang ────────────────────────────────────────────────

function fireBoomerang(ctx: WeaponFireContext): boolean {
  const target = findNearestEnemy(
    ctx.pool,
    ctx.playerX,
    ctx.playerY,
    ctx.screenWidth,
    ctx.screenHeight
  );
  if (!target) return false;

  const interceptPos = PredictiveTargeting.calculateIntercept(
    { x: ctx.playerX, y: ctx.playerY },
    target
  );
  const baseAngle = Math.atan2(
    interceptPos.y - ctx.playerY,
    interceptPos.x - ctx.playerX
  );
  const count = ctx.config.projectileCount + Math.floor(Math.max(0, ctx.level - 1) / 2);

  for (let i = 0; i < count; i++) {
    const angleOffset = (i - (count - 1) / 2) * BOOMERANG_SPREAD_ANGLE;
    const finalAngle = baseAngle + angleOffset;
    const bullet = ctx.pool.getBullet(
      ctx.playerX,
      ctx.playerY,
      Math.cos(finalAngle) * ctx.config.projectileSpeed,
      Math.sin(finalAngle) * ctx.config.projectileSpeed,
      ctx.damage,
      ctx.config.projectileRadius,
      '#a855f7',
      false,
      false
    );
    bullet.weaponId = ctx.config.id;
    bullet.spawnX = ctx.playerX;
    bullet.spawnY = ctx.playerY;
    bullet.targetX = interceptPos.x;
    bullet.targetY = interceptPos.y;
    bullet.age = 0;
    bullet.maxAge = BOOMERANG_LIFE_MS;
    bullet.phase = 'flight';
    bullet.curveSign = i % 2 === 0 ? 1 : -1;
    bullet.hitSet = new Set<string | number>();
  }
  return true;
}

// ─── Behavior: Laser ────────────────────────────────────────────────────

function fireLaser(ctx: WeaponFireContext): boolean {
  const target = findNearestEnemy(
    ctx.pool,
    ctx.playerX,
    ctx.playerY,
    ctx.screenWidth,
    ctx.screenHeight
  );
  if (!target) return false;

  const interceptPos = PredictiveTargeting.calculateIntercept(
    { x: ctx.playerX, y: ctx.playerY },
    target
  );
  const angle = Math.atan2(interceptPos.y - ctx.playerY, interceptPos.x - ctx.playerX);
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const beamDistance = Math.min(
    target.dist + LASER_SEGMENT_SPACING,
    Math.hypot(ctx.screenWidth, ctx.screenHeight) + LASER_SEGMENT_SPACING
  );
  const segmentCount = Math.max(
    3,
    Math.min(LASER_MAX_SEGMENTS, Math.ceil(beamDistance / LASER_SEGMENT_SPACING))
  );

  for (let i = 1; i <= segmentCount; i++) {
    const d = i * LASER_SEGMENT_SPACING;
    const bullet = ctx.pool.getBullet(
      ctx.playerX + ux * d,
      ctx.playerY + uy * d,
      0,
      0,
      ctx.damage,
      ctx.config.projectileRadius,
      '#ff78c8',
      false,
      false
    );
    bullet.weaponId = ctx.config.id;
    bullet.age = 0;
    bullet.maxAge = LASER_LIFE_MS;
    bullet.phase = 'fire';
    bullet.beamAngle = angle;
    bullet.beamLength = LASER_SEGMENT_LENGTH;
    bullet.hitSet = new Set<string | number>();
  }
  return true;
}

// ─── Behavior: Nuke ─────────────────────────────────────────────────────

function fireNuke(ctx: WeaponFireContext): boolean {
  const target = findNearestEnemy(
    ctx.pool,
    ctx.playerX,
    ctx.playerY,
    ctx.screenWidth,
    ctx.screenHeight
  );
  if (!target) return false;

  const interceptPos = PredictiveTargeting.calculateIntercept(
    { x: ctx.playerX, y: ctx.playerY },
    target
  );
  const angle = Math.atan2(interceptPos.y - ctx.playerY, interceptPos.x - ctx.playerX);
  const bullet = ctx.pool.getBullet(
    ctx.playerX,
    ctx.playerY,
    Math.cos(angle) * ctx.config.projectileSpeed,
    Math.sin(angle) * ctx.config.projectileSpeed,
    ctx.damage,
    ctx.config.projectileRadius,
    '#ffbb44',
    false,
    false
  );
  bullet.weaponId = ctx.config.id;
  bullet.age = 0;
  bullet.maxAge = NUKE_FLIGHT_MAX_MS;
  bullet.phase = 'flight';
  bullet.spawnX = ctx.playerX;
  bullet.spawnY = ctx.playerY;
  bullet.targetX = interceptPos.x;
  bullet.targetY = interceptPos.y;
  bullet.shockwaveRadius = ctx.config.projectileRadius;
  bullet.shockwaveMaxRadius =
    NUKE_SHOCKWAVE_RADIUS +
    Math.max(0, ctx.level - 1) * NUKE_SHOCKWAVE_RADIUS_PER_LEVEL;
  bullet.hitSet = new Set<string | number>();
  return true;
}

// ─── Behavior: Orbit ────────────────────────────────────────────────────

function fireOrbit(ctx: WeaponFireContext): boolean {
  const desiredCount = ctx.config.projectileCount + ctx.level;
  const orbitRadius =
    ORBIT_RADIUS + Math.max(0, ctx.level - 1) * ORBIT_RADIUS_PER_LEVEL;
  const bullets = ctx.pool.activeBullets;
  let existing = 0;

  for (let i = 0; i < bullets.length; i++) {
    const bullet = bullets[i]!;
    if (bullet.active && bullet.weaponId === ctx.config.id && bullet.isOrbiter) {
      bullet.damage = ctx.damage;
      bullet.radius = ctx.config.projectileRadius;
      bullet.orbitRadius = orbitRadius;
      bullet.orbitSpeed = ORBIT_SPEED;
      bullet.orbitAngle ??= (existing / desiredCount) * Math.PI * 2;
      existing++;
    }
  }

  let spawned = false;
  for (let i = existing; i < desiredCount; i++) {
    const angle = (i / desiredCount) * Math.PI * 2;
    const bullet = ctx.pool.getBullet(
      ctx.playerX + Math.cos(angle) * orbitRadius,
      ctx.playerY + Math.sin(angle) * orbitRadius,
      0,
      0,
      ctx.damage,
      ctx.config.projectileRadius,
      '#44ddff',
      false,
      false
    );
    bullet.weaponId = ctx.config.id;
    bullet.isOrbiter = true;
    bullet.orbitAngle = angle;
    bullet.orbitRadius = orbitRadius;
    bullet.orbitSpeed = ORBIT_SPEED;
    bullet.phase = 'flight';
    bullet.hitSet = new Set<string | number>();
    spawned = true;
  }

  return spawned;
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

const TARGETING_CONTEXT = {
  playerX: 0,
  playerY: 0,
  viewportBounds: null as ViewportBounds | null,
  bestX: 0,
  bestY: 0,
  bestDistSq: Infinity,
  bestSpeed: 0,
  found: false,
};

function checkEnemyWithContext(
  enemy: {
    x: number;
    y: number;
    speed: number;
    radius?: number;
    isDying?: boolean;
    active?: boolean;
  },
  ctx: typeof TARGETING_CONTEXT
) {
  if (enemy.isDying || !enemy.active) return;

  if (ctx.viewportBounds) {
    const r = enemy.radius ?? COMBAT_CONFIG.DEFAULT_ENEMY_RADIUS_FALLBACK;
    if (!isCircleVisible(enemy.x, enemy.y, r, ctx.viewportBounds)) return;
  }

  const dx = enemy.x - ctx.playerX;
  const dy = enemy.y - ctx.playerY;
  const distSq = dx * dx + dy * dy;

  if (distSq < ctx.bestDistSq) {
    ctx.bestX = enemy.x;
    ctx.bestY = enemy.y;
    ctx.bestDistSq = distSq;
    ctx.bestSpeed = enemy.speed;
    ctx.found = true;
  }
}

function findNearestEnemy(
  pool: IPoolManager,
  playerX: number,
  playerY: number,
  screenWidth: number,
  screenHeight: number
): TargetCandidate | null {
  TARGETING_CONTEXT.playerX = playerX;
  TARGETING_CONTEXT.playerY = playerY;
  TARGETING_CONTEXT.viewportBounds =
    screenWidth > 0 && screenHeight > 0
      ? createViewportBounds(screenWidth, screenHeight, TARGETING_VIEWPORT_PADDING)
      : null;
  TARGETING_CONTEXT.bestX = 0;
  TARGETING_CONTEXT.bestY = 0;
  TARGETING_CONTEXT.bestDistSq = Infinity;
  TARGETING_CONTEXT.bestSpeed = 0;
  TARGETING_CONTEXT.found = false;

  // Step 1: SpatialGrid 3x3 (immediate surroundings)
  enemyGrid.forEachInRangeWithContext(playerX, playerY, 1, TARGETING_CONTEXT, checkEnemyWithContext);

  // Step 2: SpatialGrid 7x7 (extended range)
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!TARGETING_CONTEXT.found) {
    enemyGrid.forEachInRangeWithContext(playerX, playerY, 3, TARGETING_CONTEXT, checkEnemyWithContext);
  }

  // Step 3: Fallback brute-force for edge-of-viewport enemies
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!TARGETING_CONTEXT.found) {
    const enemies = pool.activeEnemies;
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (enemy !== undefined) {
        checkEnemyWithContext(enemy, TARGETING_CONTEXT);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return TARGETING_CONTEXT.found
    ? { x: TARGETING_CONTEXT.bestX, y: TARGETING_CONTEXT.bestY, dist: Math.sqrt(TARGETING_CONTEXT.bestDistSq), speed: TARGETING_CONTEXT.bestSpeed }
    : null;
}
