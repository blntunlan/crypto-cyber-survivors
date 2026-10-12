import { describe, expect, it } from 'vitest';

import {
  CANNON_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  CANNON_PROJECTILE_COOLDOWN_TICKS_TIER_3,
  CANNON_PROJECTILE_DAMAGE_TIER_1,
  CANNON_PROJECTILE_DAMAGE_TIER_2,
  CANNON_PROJECTILE_RADIUS_TIER_1,
  CANNON_PROJECTILE_RADIUS_TIER_3,
  ENEMY_HEALTH,
  ENEMY_RADIUS,
  FLICKER_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  FLICKER_PROJECTILE_COOLDOWN_TICKS_TIER_3,
  FLICKER_PROJECTILE_DAMAGE_TIER_1,
  FLICKER_PROJECTILE_DAMAGE_TIER_2,
  FLICKER_PROJECTILE_RADIUS_TIER_1,
  FLICKER_PROJECTILE_RADIUS_TIER_3,
  HEAVY_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  HEAVY_PROJECTILE_COOLDOWN_TICKS_TIER_3,
  HEAVY_PROJECTILE_DAMAGE_TIER_1,
  HEAVY_PROJECTILE_DAMAGE_TIER_2,
  HEAVY_PROJECTILE_RADIUS_TIER_1,
  HEAVY_PROJECTILE_RADIUS_TIER_3,
  LANCE_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  LANCE_PROJECTILE_COOLDOWN_TICKS_TIER_3,
  LANCE_PROJECTILE_DAMAGE_TIER_1,
  LANCE_PROJECTILE_DAMAGE_TIER_2,
  LANCE_PROJECTILE_RADIUS_TIER_1,
  LANCE_PROJECTILE_RADIUS_TIER_3,
  BRUTE_ENEMY_COST,
  BRUTE_ENEMY_CONTACT_DAMAGE,
  BRUTE_ENEMY_HEALTH,
  BRUTE_ENEMY_MOVE_SPEED,
  BRUTE_ENEMY_RADIUS,
  BRUTE_ENEMY_XP_VALUE,
  CONVERGENCE_KILLS_TO_THRESHOLD,
  CONVERGENCE_MAX_CYCLE_TICKS,
  CONVERGENCE_MIN_CYCLE_TICKS,
  CONVERGENCE_THRESHOLD,
  ENEMY_CONTACT_DAMAGE,
  ENEMY_MOVE_SPEED,
  ENEMY_XP_VALUE,
  GRUNT_ENEMY_COST,
  MAX_WORLD_CAPACITY,
  MVP0_ENEMY_COMPOSITION_MAX_PICKS,
  MVP0_ENEMY_SPAWN_BUDGET,
  MVP0_ENEMY_SPAWN_INTERVAL_TICKS,
  MVP0_ENEMY_SPAWN_RING_RADIUS,
  MVP0_MAX_LIVE_ENEMIES,
  MVP0_WORLD_CAPACITY,
  SWARMLING_ENEMY_COST,
  SWARMLING_ENEMY_CONTACT_DAMAGE,
  SWARMLING_ENEMY_HEALTH,
  SWARMLING_ENEMY_MOVE_SPEED,
  SWARMLING_ENEMY_RADIUS,
  SWARMLING_ENEMY_XP_VALUE,
  NEEDLE_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  NEEDLE_PROJECTILE_COOLDOWN_TICKS_TIER_3,
  NEEDLE_PROJECTILE_DAMAGE_TIER_1,
  NEEDLE_PROJECTILE_DAMAGE_TIER_2,
  NEEDLE_PROJECTILE_RADIUS_TIER_1,
  NEEDLE_PROJECTILE_RADIUS_TIER_3,
  PLAYER_RADIUS,
  PROJECTILE_DAMAGE,
  PROJECTILE_LIFETIME_TICKS,
  PROJECTILE_RADIUS,
  PROJECTILE_SPEED,
  RAPID_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  RAPID_PROJECTILE_COOLDOWN_TICKS_TIER_3,
  RAPID_PROJECTILE_DAMAGE_TIER_1,
  RAPID_PROJECTILE_DAMAGE_TIER_2,
  RAPID_PROJECTILE_RADIUS_TIER_1,
  RAPID_PROJECTILE_RADIUS_TIER_3,
  SIMULATION_HZ,
  STARTER_PROJECTILE_RADIUS_TIER_3,
  SIEGE_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  SIEGE_PROJECTILE_COOLDOWN_TICKS_TIER_3,
  SIEGE_PROJECTILE_DAMAGE_TIER_1,
  SIEGE_PROJECTILE_DAMAGE_TIER_2,
  SIEGE_PROJECTILE_RADIUS_TIER_1,
  SIEGE_PROJECTILE_RADIUS_TIER_3,
  STARTER_WEAPON_COOLDOWN_TICKS_TIER_3,
  STARTER_WEAPON_DAMAGE_TIER_2,
  TOP_DOWN_CAMERA_VISIBLE_HEIGHT,
  WEAPON_COOLDOWN_TICKS,
  WEAPON_RANGE,
} from '@/game-v2/config/Mvp0Config';
import { MVP1_MAX_LIVE_PROJECTILES } from '@/game-v2/config/ProjectileCapacity';
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

  it('holds every projectile the starter weapon alone can put in flight', () => {
    // The starter weapon's own bound. The bound across all four slots and every
    // authored identity lives in `ProjectileCapacity.test.ts` (V2-ADR-078);
    // this row only pins that the MVP-0 baseline still fits.
    const concurrentProjectiles =
      Math.ceil(PROJECTILE_LIFETIME_TICKS / WEAPON_COOLDOWN_TICKS) + 1;

    expect(MVP1_MAX_LIVE_PROJECTILES).toBeGreaterThanOrEqual(concurrentProjectiles);
  });

  it('keeps the world inside the supported capacity with room for the caps', () => {
    expect(MVP0_WORLD_CAPACITY).toBeLessThanOrEqual(MAX_WORLD_CAPACITY);
    expect(MVP0_WORLD_CAPACITY).toBeGreaterThan(
      MVP0_MAX_LIVE_ENEMIES + MVP1_MAX_LIVE_PROJECTILES + 1
    );
  });

  it('sizes render categories so the world runs out before the snapshot does', () => {
    expect(MVP0_RENDER_CAPACITIES.enemyCapacity).toBe(MVP0_MAX_LIVE_ENEMIES);
    expect(MVP0_RENDER_CAPACITIES.projectileCapacity).toBe(MVP1_MAX_LIVE_PROJECTILES);
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

describe('heavy-projectile and rapid-projectile (V2-106, V2-ADR-063)', () => {
  it('derive Tier 1 as exact multiples/fractions of starter-projectile Tier 1, not a chosen number', () => {
    expect(HEAVY_PROJECTILE_DAMAGE_TIER_1).toBe(PROJECTILE_DAMAGE * 2);
    expect(HEAVY_PROJECTILE_COOLDOWN_TICKS_TIER_1).toBe(WEAPON_COOLDOWN_TICKS * 2);
    expect(HEAVY_PROJECTILE_RADIUS_TIER_1).toBe(PROJECTILE_RADIUS * 1.5);

    expect(RAPID_PROJECTILE_DAMAGE_TIER_1).toBe(PROJECTILE_DAMAGE / 2);
    expect(RAPID_PROJECTILE_COOLDOWN_TICKS_TIER_1).toBe(WEAPON_COOLDOWN_TICKS / 2);
    expect(RAPID_PROJECTILE_RADIUS_TIER_1).toBe(PROJECTILE_RADIUS * 0.75);
  });

  it('open at the identical Tier 1 damage-per-tick baseline as starter-projectile', () => {
    const starterDps = PROJECTILE_DAMAGE / WEAPON_COOLDOWN_TICKS;
    const heavyDps =
      HEAVY_PROJECTILE_DAMAGE_TIER_1 / HEAVY_PROJECTILE_COOLDOWN_TICKS_TIER_1;
    const rapidDps =
      RAPID_PROJECTILE_DAMAGE_TIER_1 / RAPID_PROJECTILE_COOLDOWN_TICKS_TIER_1;

    expect(heavyDps).toBeCloseTo(starterDps, 10);
    expect(rapidDps).toBeCloseTo(starterDps, 10);
  });

  it('keep every Tier 3 hitbox inside the tunnel-safety margin', () => {
    expect(PROJECTILE_SPEED * FIXED_DELTA_SECONDS).toBeLessThan(
      2 * (HEAVY_PROJECTILE_RADIUS_TIER_3 + ENEMY_RADIUS)
    );
    expect(PROJECTILE_SPEED * FIXED_DELTA_SECONDS).toBeLessThan(
      2 * (RAPID_PROJECTILE_RADIUS_TIER_3 + ENEMY_RADIUS)
    );
  });

  it('shorten the heavy-projectile kill period at each successive tier without raising damage past Tier 2', () => {
    const tierOne =
      HEAVY_PROJECTILE_COOLDOWN_TICKS_TIER_1 *
      Math.ceil(ENEMY_HEALTH / HEAVY_PROJECTILE_DAMAGE_TIER_1);
    const tierTwo =
      HEAVY_PROJECTILE_COOLDOWN_TICKS_TIER_1 *
      Math.ceil(ENEMY_HEALTH / HEAVY_PROJECTILE_DAMAGE_TIER_2);
    const tierThree =
      HEAVY_PROJECTILE_COOLDOWN_TICKS_TIER_3 *
      Math.ceil(ENEMY_HEALTH / HEAVY_PROJECTILE_DAMAGE_TIER_2);

    expect(tierThree).toBeLessThan(tierTwo);
    expect(tierTwo).toBeLessThan(tierOne);
  });

  it('shorten the rapid-projectile kill period at each successive tier without raising damage past Tier 2', () => {
    const tierOne =
      RAPID_PROJECTILE_COOLDOWN_TICKS_TIER_1 *
      Math.ceil(ENEMY_HEALTH / RAPID_PROJECTILE_DAMAGE_TIER_1);
    const tierTwo =
      RAPID_PROJECTILE_COOLDOWN_TICKS_TIER_1 *
      Math.ceil(ENEMY_HEALTH / RAPID_PROJECTILE_DAMAGE_TIER_2);
    const tierThree =
      RAPID_PROJECTILE_COOLDOWN_TICKS_TIER_3 *
      Math.ceil(ENEMY_HEALTH / RAPID_PROJECTILE_DAMAGE_TIER_2);

    expect(tierThree).toBeLessThan(tierTwo);
    expect(tierTwo).toBeLessThan(tierOne);
  });

  it('keeps every heavy/rapid cooldown tick count a positive integer', () => {
    for (const cooldownTicks of [
      HEAVY_PROJECTILE_COOLDOWN_TICKS_TIER_1,
      HEAVY_PROJECTILE_COOLDOWN_TICKS_TIER_3,
      RAPID_PROJECTILE_COOLDOWN_TICKS_TIER_1,
      RAPID_PROJECTILE_COOLDOWN_TICKS_TIER_3,
    ]) {
      expect(Number.isInteger(cooldownTicks)).toBe(true);
      expect(cooldownTicks).toBeGreaterThan(0);
    }
  });
});

/**
 * V2-107, V2-ADR-066: the five mid-run-only identities, each `N` times
 * `starter-projectile`'s own Tier 1 damage and cooldown. One parametrized
 * block proves the single shared formula for all five, rather than five
 * independent bespoke assertions.
 */
const MID_RUN_ONLY_FAMILIES = [
  {
    name: 'needle-projectile',
    n: 1 / 10,
    damageTier1: NEEDLE_PROJECTILE_DAMAGE_TIER_1,
    cooldownTier1: NEEDLE_PROJECTILE_COOLDOWN_TICKS_TIER_1,
    radiusTier1: NEEDLE_PROJECTILE_RADIUS_TIER_1,
    damageTier2: NEEDLE_PROJECTILE_DAMAGE_TIER_2,
    radiusTier3: NEEDLE_PROJECTILE_RADIUS_TIER_3,
    cooldownTier3: NEEDLE_PROJECTILE_COOLDOWN_TICKS_TIER_3,
  },
  {
    name: 'flicker-projectile',
    n: 1 / 5,
    damageTier1: FLICKER_PROJECTILE_DAMAGE_TIER_1,
    cooldownTier1: FLICKER_PROJECTILE_COOLDOWN_TICKS_TIER_1,
    radiusTier1: FLICKER_PROJECTILE_RADIUS_TIER_1,
    damageTier2: FLICKER_PROJECTILE_DAMAGE_TIER_2,
    radiusTier3: FLICKER_PROJECTILE_RADIUS_TIER_3,
    cooldownTier3: FLICKER_PROJECTILE_COOLDOWN_TICKS_TIER_3,
  },
  {
    name: 'lance-projectile',
    n: 1.5,
    damageTier1: LANCE_PROJECTILE_DAMAGE_TIER_1,
    cooldownTier1: LANCE_PROJECTILE_COOLDOWN_TICKS_TIER_1,
    radiusTier1: LANCE_PROJECTILE_RADIUS_TIER_1,
    damageTier2: LANCE_PROJECTILE_DAMAGE_TIER_2,
    radiusTier3: LANCE_PROJECTILE_RADIUS_TIER_3,
    cooldownTier3: LANCE_PROJECTILE_COOLDOWN_TICKS_TIER_3,
  },
  {
    name: 'cannon-projectile',
    n: 2.5,
    damageTier1: CANNON_PROJECTILE_DAMAGE_TIER_1,
    cooldownTier1: CANNON_PROJECTILE_COOLDOWN_TICKS_TIER_1,
    radiusTier1: CANNON_PROJECTILE_RADIUS_TIER_1,
    damageTier2: CANNON_PROJECTILE_DAMAGE_TIER_2,
    radiusTier3: CANNON_PROJECTILE_RADIUS_TIER_3,
    cooldownTier3: CANNON_PROJECTILE_COOLDOWN_TICKS_TIER_3,
  },
  {
    name: 'siege-projectile',
    n: 4,
    damageTier1: SIEGE_PROJECTILE_DAMAGE_TIER_1,
    cooldownTier1: SIEGE_PROJECTILE_COOLDOWN_TICKS_TIER_1,
    radiusTier1: SIEGE_PROJECTILE_RADIUS_TIER_1,
    damageTier2: SIEGE_PROJECTILE_DAMAGE_TIER_2,
    radiusTier3: SIEGE_PROJECTILE_RADIUS_TIER_3,
    cooldownTier3: SIEGE_PROJECTILE_COOLDOWN_TICKS_TIER_3,
  },
];

describe('mid-run-only projectile family (V2-107, V2-ADR-066)', () => {
  it.each(MID_RUN_ONLY_FAMILIES)(
    '$name derives Tier 1 as exactly $n times starter-projectile Tier 1',
    ({ n, damageTier1, cooldownTier1, radiusTier1 }) => {
      expect(damageTier1).toBeCloseTo(PROJECTILE_DAMAGE * n, 10);
      expect(cooldownTier1).toBeCloseTo(WEAPON_COOLDOWN_TICKS * n, 10);
      expect(radiusTier1).toBeCloseTo(PROJECTILE_RADIUS * n, 10);
    }
  );

  it.each(MID_RUN_ONLY_FAMILIES)(
    '$name opens at the identical Tier 1 damage-per-tick baseline as starter-projectile',
    ({ damageTier1, cooldownTier1 }) => {
      expect(damageTier1 / cooldownTier1).toBeCloseTo(
        PROJECTILE_DAMAGE / WEAPON_COOLDOWN_TICKS,
        10
      );
    }
  );

  it.each(MID_RUN_ONLY_FAMILIES)(
    '$name raises damage 1.5x at Tier 2, radius 1.5x and cooldown to two thirds at Tier 3, damage held',
    ({
      damageTier1,
      cooldownTier1,
      radiusTier1,
      damageTier2,
      radiusTier3,
      cooldownTier3,
    }) => {
      expect(damageTier2).toBeCloseTo(damageTier1 * 1.5, 10);
      expect(radiusTier3).toBeCloseTo(radiusTier1 * 1.5, 10);
      expect(cooldownTier3).toBeCloseTo((cooldownTier1 * 2) / 3, 10);
    }
  );

  it.each(MID_RUN_ONLY_FAMILIES)(
    '$name keeps every Tier cooldown a positive integer',
    family => {
      for (const cooldownTicks of [family.cooldownTier1, family.cooldownTier3]) {
        expect(Number.isInteger(cooldownTicks)).toBe(true);
        expect(cooldownTicks).toBeGreaterThan(0);
      }
    }
  );

  it.each(MID_RUN_ONLY_FAMILIES)(
    '$name keeps every Tier hitbox inside the tunnel-safety margin',
    ({ radiusTier1, radiusTier3 }) => {
      expect(PROJECTILE_SPEED * FIXED_DELTA_SECONDS).toBeLessThan(
        2 * (radiusTier1 + ENEMY_RADIUS)
      );
      expect(PROJECTILE_SPEED * FIXED_DELTA_SECONDS).toBeLessThan(
        2 * (radiusTier3 + ENEMY_RADIUS)
      );
    }
  );

  it('keeps the five N multipliers pairwise distinct and distinct from starter/heavy/rapid (1, 2, 0.5)', () => {
    const reserved = [1, 2, 0.5];
    const ns = MID_RUN_ONLY_FAMILIES.map(family => family.n);

    for (const n of ns) {
      expect(reserved).not.toContain(n);
    }
    expect(new Set(ns).size).toBe(ns.length);
  });
});

describe('basic enemy composition (V2-108, V2-ADR-070)', () => {
  it('derives swarmling as half of grunt on health/damage/xp, 1.5x speed, 0.75x radius, half cost', () => {
    expect(SWARMLING_ENEMY_HEALTH).toBe(ENEMY_HEALTH / 2);
    expect(SWARMLING_ENEMY_CONTACT_DAMAGE).toBe(ENEMY_CONTACT_DAMAGE / 2);
    expect(SWARMLING_ENEMY_XP_VALUE).toBe(ENEMY_XP_VALUE / 2);
    expect(SWARMLING_ENEMY_MOVE_SPEED).toBe(ENEMY_MOVE_SPEED * 1.5);
    expect(SWARMLING_ENEMY_RADIUS).toBe(ENEMY_RADIUS * 0.75);
    expect(SWARMLING_ENEMY_COST).toBe(1);
  });

  it('derives brute as 1.5x grunt on health/damage/xp, 0.6x speed, 1.25x radius, equal cost', () => {
    expect(BRUTE_ENEMY_HEALTH).toBe(ENEMY_HEALTH * 1.5);
    expect(BRUTE_ENEMY_CONTACT_DAMAGE).toBe(ENEMY_CONTACT_DAMAGE * 1.5);
    expect(BRUTE_ENEMY_XP_VALUE).toBe(ENEMY_XP_VALUE * 1.5);
    expect(BRUTE_ENEMY_MOVE_SPEED).toBe(ENEMY_MOVE_SPEED * 0.6);
    expect(BRUTE_ENEMY_RADIUS).toBe(ENEMY_RADIUS * 1.25);
    expect(BRUTE_ENEMY_COST).toBe(GRUNT_ENEMY_COST);
  });

  it("sets the spawn budget to exactly grunt's own cost", () => {
    expect(MVP0_ENEMY_SPAWN_BUDGET).toBe(GRUNT_ENEMY_COST);
    expect(MVP0_ENEMY_SPAWN_BUDGET).toBe(2);
  });

  it('derives the composition pick bound from the budget and the cheapest archetype', () => {
    expect(MVP0_ENEMY_COMPOSITION_MAX_PICKS).toBe(
      Math.ceil(MVP0_ENEMY_SPAWN_BUDGET / SWARMLING_ENEMY_COST)
    );
    expect(MVP0_ENEMY_COMPOSITION_MAX_PICKS).toBe(2);
  });

  it('makes two swarmlings sum to grunt-equal total health, damage, and cost', () => {
    expect(SWARMLING_ENEMY_HEALTH * 2).toBe(ENEMY_HEALTH);
    expect(SWARMLING_ENEMY_CONTACT_DAMAGE * 2).toBe(ENEMY_CONTACT_DAMAGE);
    expect(SWARMLING_ENEMY_COST * 2).toBe(GRUNT_ENEMY_COST);
  });
});

describe('market-independent Convergence envelope (V2-109, V2-ADR-072)', () => {
  it('derives the min/max cycle ticks from the 8/12-minute design envelope', () => {
    expect(CONVERGENCE_MIN_CYCLE_TICKS).toBe(8 * 60 * SIMULATION_HZ);
    expect(CONVERGENCE_MAX_CYCLE_TICKS).toBe(12 * 60 * SIMULATION_HZ);
    expect(CONVERGENCE_MIN_CYCLE_TICKS).toBe(28_800);
    expect(CONVERGENCE_MAX_CYCLE_TICKS).toBe(43_200);
  });

  it('derives one kill-count target that exactly satisfies both envelope bounds', () => {
    // The 8-12 minute ratio (1.5) already equals the existing Tier 1/Tier 2
    // kill-period ratio (90/60 = 1.5), so a single integer kill-count target
    // reproduces both bounds exactly with no free parameter.
    expect(CONVERGENCE_KILLS_TO_THRESHOLD).toBe(
      CONVERGENCE_MIN_CYCLE_TICKS / tierTwoKillTicks
    );
    expect(CONVERGENCE_KILLS_TO_THRESHOLD * tierTwoKillTicks).toBe(
      CONVERGENCE_MIN_CYCLE_TICKS
    );
    expect(CONVERGENCE_KILLS_TO_THRESHOLD * tierOneKillTicks).toBe(
      CONVERGENCE_MAX_CYCLE_TICKS
    );
    expect(CONVERGENCE_KILLS_TO_THRESHOLD).toBe(480);
  });

  it('derives the XP-equivalent threshold from the kill-count target and grunt XP', () => {
    expect(CONVERGENCE_THRESHOLD).toBe(CONVERGENCE_KILLS_TO_THRESHOLD * ENEMY_XP_VALUE);
    expect(CONVERGENCE_THRESHOLD).toBe(2400);
  });

  it('keeps the max bound strictly above the min bound', () => {
    expect(CONVERGENCE_MAX_CYCLE_TICKS).toBeGreaterThan(CONVERGENCE_MIN_CYCLE_TICKS);
  });
});
