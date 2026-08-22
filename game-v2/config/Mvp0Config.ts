export const SIMULATION_HZ = 60;
export const SIMULATION_STEP_MS = 1000 / SIMULATION_HZ;
export const MAX_RENDER_DELTA_MS = 250;
export const MAX_CATCH_UP_STEPS = 8;
export const MVP0_CONFIG_VERSION = 1 as const;
export const INPUT_RECORDING_CAPACITY = 216_000;
export const COMMAND_RECORDING_CAPACITY = 64;
export const MAX_WORLD_CAPACITY = 4096;
export const TOP_DOWN_CAMERA_VISIBLE_HEIGHT = 18;
export const TOP_DOWN_CAMERA_NEAR = 0.1;
export const TOP_DOWN_CAMERA_FAR = 200;
export const TOP_DOWN_CAMERA_HEIGHT = 40;
export const TOP_DOWN_CAMERA_UP_X = 0;
export const TOP_DOWN_CAMERA_UP_Y = 0;
export const TOP_DOWN_CAMERA_UP_Z = -1;
export const PLAYER_MOVE_SPEED = 6;
export const DASH_SPEED = 16;
export const DASH_DURATION_SECONDS = 0.18;
export const DASH_INVULNERABILITY_SECONDS = 0.18;
export const DASH_COOLDOWN_SECONDS = 2.5;
export const DASH_INVULNERABILITY_TICKS = Math.ceil(
  DASH_INVULNERABILITY_SECONDS * SIMULATION_HZ
);
export const DASH_COOLDOWN_TICKS = Math.ceil(DASH_COOLDOWN_SECONDS * SIMULATION_HZ);
export const ENEMY_HEALTH = 30;
export const ENEMY_RADIUS = 0.6;
export const ENEMY_MOVE_SPEED = 2.2;
export const ENEMY_CONTACT_DAMAGE = 15;
export const ENEMY_XP_VALUE = 5;
export const ENEMY_FACTION = -1;
export const WEAPON_RANGE = 12;
export const WEAPON_COOLDOWN_SECONDS = 0.5;
export const WEAPON_COOLDOWN_TICKS = Math.ceil(WEAPON_COOLDOWN_SECONDS * SIMULATION_HZ);
export const PROJECTILE_SPEED = 14;
export const PROJECTILE_DAMAGE = 10;
export const PROJECTILE_RADIUS = 0.2;
export const PROJECTILE_LIFETIME_SECONDS = 1.5;
export const PROJECTILE_LIFETIME_TICKS = Math.ceil(
  PROJECTILE_LIFETIME_SECONDS * SIMULATION_HZ
);
export const PLAYER_RADIUS = 0.5;
export const PLAYER_MAX_HEALTH = 100;
export const ENEMY_CONTACT_COOLDOWN_SECONDS = 1.0;
export const ENEMY_CONTACT_COOLDOWN_TICKS = Math.ceil(
  ENEMY_CONTACT_COOLDOWN_SECONDS * SIMULATION_HZ
);
export const COMBAT_KILL_BUFFER_CAPACITY = 32;
export const XP_PICKUP_RADIUS = 0.3;
export const LEVEL_2_XP_THRESHOLD = 5;
export const STARTER_WEAPON_DAMAGE_TIER_2 = 15;

/**
 * Authored starter-projectile damage per tier, indexed by `tier - 1`.
 *
 * Only two tiers are authored: tier 3 effects belong to V2-102, and
 * `STARTER_PROJECTILE.authoredTiers` is what keeps the loadout from reaching a
 * tier this table cannot answer (V2-ADR-038).
 */
export const STARTER_PROJECTILE_DAMAGE_BY_TIER: readonly number[] = Object.freeze([
  PROJECTILE_DAMAGE,
  STARTER_WEAPON_DAMAGE_TIER_2,
]);
export const PLAYER_STARTING_LEVEL = 1;
export const MVP0_MAX_PLAYER_LEVEL = 2;

/**
 * MVP-0 runtime composition (V2-014).
 *
 * `MVP0_ENEMY_SPAWN_INTERVAL_TICKS` is derived, not chosen. A tier-1 kill costs
 * `WEAPON_COOLDOWN_TICKS * ceil(ENEMY_HEALTH / PROJECTILE_DAMAGE)` = 90 ticks and
 * a tier-2 kill costs 60, so an interval of 60 sits exactly between them: a
 * player who never upgrades loses ground and eventually dies, and the first
 * upgrade is what buys back the ability to hold the line. The properties are
 * pinned in `tests/game-v2/config/Mvp0Config.test.ts`.
 */
export const MVP0_ENEMY_SPAWN_INTERVAL_TICKS = 60;

/**
 * The spawn ring sits inside `WEAPON_RANGE` so auto-fire acquires a new enemy on
 * its spawn tick, and inside the camera's half-height so a spawn is visible at
 * every supported aspect ratio.
 */
export const MVP0_ENEMY_SPAWN_RING_RADIUS = 8;
export const MVP0_MAX_LIVE_ENEMIES = 32;

/**
 * At most `ceil(PROJECTILE_LIFETIME_TICKS / WEAPON_COOLDOWN_TICKS)` projectiles
 * are already in flight when the next one is fired, so the concurrent bound is
 * that quotient plus the one being fired.
 */
export const MVP0_MAX_LIVE_PROJECTILES = 16;

export const MVP0_WORLD_CAPACITY = 512;
export const MVP0_PLAYER_SPAWN_X = 0;
export const MVP0_PLAYER_SPAWN_Y = 0;
