import { describe, expect, it } from 'vitest';

import {
  ENEMY_HEALTH,
  ENEMY_RADIUS,
  MAX_WORLD_CAPACITY,
  MVP0_ENEMY_SPAWN_INTERVAL_TICKS,
  MVP0_ENEMY_SPAWN_RING_RADIUS,
  MVP0_MAX_LIVE_ENEMIES,
  MVP0_MAX_LIVE_PROJECTILES,
  MVP0_WORLD_CAPACITY,
  PLAYER_RADIUS,
  PROJECTILE_DAMAGE,
  PROJECTILE_LIFETIME_TICKS,
  PROJECTILE_SPEED,
  SIMULATION_HZ,
  STARTER_PROJECTILE_RADIUS_TIER_3,
  STARTER_WEAPON_COOLDOWN_TICKS_TIER_3,
  STARTER_WEAPON_DAMAGE_TIER_2,
  TOP_DOWN_CAMERA_VISIBLE_HEIGHT,
  WEAPON_COOLDOWN_TICKS,
  WEAPON_RANGE,
} from '@/game-v2/config/Mvp0Config';
import { MVP0_RENDER_CAPACITIES } from '@/game-v2/runtime/createMvp0Runtime';

const FIXED_DELTA_SECONDS = 1 / SIMULATION_HZ;
const tierOneKillTicks =
  WEAPON_COOLDOWN_TICKS * Math.ceil(ENEMY_HEALTH / PROJECTILE_DAMAGE);
const tierTwoKillTicks =
  WEAPON_COOLDOWN_TICKS * Math.ceil(ENEMY_HEALTH / STARTER_WEAPON_DAMAGE_TIER_2);
const tierThreeKillTicks =
  STARTER_WEAPON_COOLDOWN_TICKS_TIER_3 *
  Math.ceil(ENEMY_HEALTH / STARTER_WEAPON_DAMAGE_TIER_2);

describe('MVP-0 composition constants', () => {
  it('spawns faster than a tier-one weapon can clear, so standing still loses', () => {
    expect(MVP0_ENEMY_SPAWN_INTERVAL_TICKS).toBeLessThan(tierOneKillTicks);
  });

  it('spawns no faster than a tier-two weapon can clear, so the upgrade matters', () => {
    expect(MVP0_ENEMY_SPAWN_INTERVAL_TICKS).toBeGreaterThanOrEqual(tierTwoKillTicks);
  });

  it('keeps the cadence longer than a single tick', () => {
    expect(MVP0_ENEMY_SPAWN_INTERVAL_TICKS).toBeGreaterThan(1);
  });

  it('spawns inside weapon range so auto-fire acquires on the spawn tick', () => {
    expect(MVP0_ENEMY_SPAWN_RING_RADIUS).toBeLessThan(WEAPON_RANGE);
  });

  it('spawns inside the camera half-height so a spawn is visible at every aspect', () => {
    expect(MVP0_ENEMY_SPAWN_RING_RADIUS).toBeLessThanOrEqual(
      TOP_DOWN_CAMERA_VISIBLE_HEIGHT / 2
    );
  });

  it('spawns clear of the player hitbox', () => {
    expect(MVP0_ENEMY_SPAWN_RING_RADIUS).toBeGreaterThan(PLAYER_RADIUS + ENEMY_RADIUS);
  });

  it('holds every projectile that can be in flight at once', () => {
    const concurrentProjectiles =
      Math.ceil(PROJECTILE_LIFETIME_TICKS / WEAPON_COOLDOWN_TICKS) + 1;

    expect(MVP0_MAX_LIVE_PROJECTILES).toBeGreaterThanOrEqual(concurrentProjectiles);
  });

  it('keeps the world inside the supported capacity with room for the caps', () => {
    expect(MVP0_WORLD_CAPACITY).toBeLessThanOrEqual(MAX_WORLD_CAPACITY);
    expect(MVP0_WORLD_CAPACITY).toBeGreaterThan(
      MVP0_MAX_LIVE_ENEMIES + MVP0_MAX_LIVE_PROJECTILES + 1
    );
  });

  it('sizes render categories so the world runs out before the snapshot does', () => {
    expect(MVP0_RENDER_CAPACITIES.enemyCapacity).toBe(MVP0_MAX_LIVE_ENEMIES);
    expect(MVP0_RENDER_CAPACITIES.projectileCapacity).toBe(MVP0_MAX_LIVE_PROJECTILES);
    expect(MVP0_RENDER_CAPACITIES.xpPickupCapacity).toBe(MVP0_WORLD_CAPACITY);
  });
});

describe('starter-projectile Tier 3 (V2-ADR-045)', () => {
  it('derives from the base radius and cooldown rather than a chosen number', () => {
    expect(STARTER_PROJECTILE_RADIUS_TIER_3).toBe(ENEMY_RADIUS / 2);
    expect(STARTER_WEAPON_COOLDOWN_TICKS_TIER_3).toBe((WEAPON_COOLDOWN_TICKS * 2) / 3);
  });

  it('keeps the wider Tier 3 hitbox inside the tunnel-safety margin', () => {
    expect(PROJECTILE_SPEED * FIXED_DELTA_SECONDS).toBeLessThan(
      2 * (STARTER_PROJECTILE_RADIUS_TIER_3 + ENEMY_RADIUS)
    );
  });

  it('shortens the kill period at each successive tier without raising damage', () => {
    expect(tierThreeKillTicks).toBeLessThan(tierTwoKillTicks);
    expect(tierTwoKillTicks).toBeLessThan(tierOneKillTicks);
    expect(tierOneKillTicks).toBe(90);
    expect(tierTwoKillTicks).toBe(60);
    expect(tierThreeKillTicks).toBe(40);
  });
});
