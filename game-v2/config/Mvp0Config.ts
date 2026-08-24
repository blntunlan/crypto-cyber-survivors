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
 * Starter-projectile Tier 3 (V2-ADR-045): design §5.2 assigns Tier 3 "a
 * stronger area/coverage behavior plus a modest cadence improvement", not a
 * second damage increase, so damage stays at `STARTER_WEAPON_DAMAGE_TIER_2`
 * and only radius (coverage) and cooldown (cadence) change.
 *
 * `STARTER_PROJECTILE_RADIUS_TIER_3` is half of `ENEMY_RADIUS = 0.6`. The
 * combined collision radius stays `0.3 + 0.6 = 0.9`, still well above the
 * `PROJECTILE_SPEED / SIMULATION_HZ ≈ 0.2333` units of per-tick travel the
 * existing tunnel-safety proof already pins for Tier 1/2, so discrete
 * collision remains sound (`Mvp0Config.test.ts` locks this inequality).
 */
export const STARTER_PROJECTILE_RADIUS_TIER_3 = 0.3;

/**
 * Two thirds of the base `WEAPON_COOLDOWN_TICKS = 30`. Worked kill-period
 * comparison at unchanged Tier 2 damage (`ceil(ENEMY_HEALTH / 15) = 2` hits):
 * Tier 1 is `30 * 3 = 90` ticks, Tier 2 is `30 * 2 = 60` ticks, Tier 3 is
 * `20 * 2 = 40` ticks — a real, measurable improvement in the same units the
 * spawn-cadence derivation above already uses.
 */
export const STARTER_WEAPON_COOLDOWN_TICKS_TIER_3 = 20;

/**
 * The level-up card's real-time deadline (design §5.4). The first
 * `LEVEL_UP_OFFER_REVEAL_SECONDS` are non-interactive; the last
 * `LEVEL_UP_OFFER_COUNTDOWN_SECONDS` of the total show a visible countdown.
 * No input during either sub-window is a presentation-only rule
 * (V2-ADR-054): the runtime accepts a resolution at any point once the
 * lifecycle is `level-up`.
 */
export const LEVEL_UP_OFFER_TOTAL_SECONDS = 13;
export const LEVEL_UP_OFFER_REVEAL_SECONDS = 4;
export const LEVEL_UP_OFFER_COUNTDOWN_SECONDS = 5;

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

/**
 * `heavy-projectile` (V2-106, V2-ADR-063): a start-eligible weapon that trades
 * cadence for burst. Its Tier 1 damage and cooldown are exact multiples of
 * `starter-projectile`'s own Tier 1 numbers, so both open at the identical
 * damage-per-tick baseline (`Mvp0Config.test.ts` pins this) and differ only in
 * burst/cadence shape, not raw power.
 */
export const HEAVY_PROJECTILE_DAMAGE_TIER_1 = PROJECTILE_DAMAGE * 2;
export const HEAVY_PROJECTILE_COOLDOWN_TICKS_TIER_1 = WEAPON_COOLDOWN_TICKS * 2;
export const HEAVY_PROJECTILE_RADIUS_TIER_1 = PROJECTILE_RADIUS * 1.5;

/**
 * Tier 2 raises damage by the same 1.5x multiplier design already applies to
 * `starter-projectile`'s own Tier 1 -> Tier 2 step; radius and cooldown hold.
 */
export const HEAVY_PROJECTILE_DAMAGE_TIER_2 = HEAVY_PROJECTILE_DAMAGE_TIER_1 * 1.5;

/**
 * Tier 3 (V2-ADR-045 precedent): radius (coverage) and cooldown (cadence)
 * improve; damage holds at its Tier 2 value rather than raising again.
 */
export const HEAVY_PROJECTILE_RADIUS_TIER_3 = HEAVY_PROJECTILE_RADIUS_TIER_1 * 1.5;
export const HEAVY_PROJECTILE_COOLDOWN_TICKS_TIER_3 =
  (HEAVY_PROJECTILE_COOLDOWN_TICKS_TIER_1 * 2) / 3;

/**
 * `rapid-projectile` (V2-106, V2-ADR-063): a start-eligible weapon that trades
 * burst for cadence. Its Tier 1 damage and cooldown are exact fractions of
 * `starter-projectile`'s own Tier 1 numbers, so it too opens at the identical
 * damage-per-tick baseline (`Mvp0Config.test.ts` pins this) and differs only
 * in burst/cadence shape, not raw power.
 */
export const RAPID_PROJECTILE_DAMAGE_TIER_1 = PROJECTILE_DAMAGE / 2;
export const RAPID_PROJECTILE_COOLDOWN_TICKS_TIER_1 = WEAPON_COOLDOWN_TICKS / 2;
export const RAPID_PROJECTILE_RADIUS_TIER_1 = PROJECTILE_RADIUS * 0.75;

/**
 * Tier 2 raises damage by the same 1.5x multiplier design already applies to
 * `starter-projectile`'s own Tier 1 -> Tier 2 step; radius and cooldown hold.
 */
export const RAPID_PROJECTILE_DAMAGE_TIER_2 = RAPID_PROJECTILE_DAMAGE_TIER_1 * 1.5;

/**
 * Tier 3 (V2-ADR-045 precedent): radius (coverage) and cooldown (cadence)
 * improve; damage holds at its Tier 2 value rather than raising again.
 */
export const RAPID_PROJECTILE_RADIUS_TIER_3 = RAPID_PROJECTILE_RADIUS_TIER_1 * 1.5;
export const RAPID_PROJECTILE_COOLDOWN_TICKS_TIER_3 =
  (RAPID_PROJECTILE_COOLDOWN_TICKS_TIER_1 * 2) / 3;

/**
 * The five `V2-107` mid-run-only identities (V2-ADR-066): each is
 * `starter-projectile`'s own Tier 1 damage and cooldown scaled by one
 * multiplier `N`, so every projectile-family identity opens at the same
 * Tier 1 damage-per-tick baseline (`10 / 30`) as `starter-projectile`,
 * `heavy-projectile` (`N=2`), and `rapid-projectile` (`N=0.5`) — differing
 * only in burst/cadence/coverage shape, not raw Tier 1 power
 * (`Mvp0Config.test.ts` pins this for all eight). Tier 2 and Tier 3 follow
 * the identical formula already established for heavy/rapid: Tier 2 raises
 * damage 1.5x with radius/cooldown held; Tier 3 raises radius 1.5x and cuts
 * cooldown to two thirds, holding damage at its Tier 2 value (V2-ADR-045
 * precedent). `N` is chosen so `30N` (Tier 1 cooldown) and `20N` (Tier 3
 * cooldown) are both integers, and is pairwise distinct from `1`, `2`, and
 * `0.5`.
 */
export const NEEDLE_PROJECTILE_DAMAGE_TIER_1 = PROJECTILE_DAMAGE / 10;
export const NEEDLE_PROJECTILE_COOLDOWN_TICKS_TIER_1 = WEAPON_COOLDOWN_TICKS / 10;
export const NEEDLE_PROJECTILE_RADIUS_TIER_1 = PROJECTILE_RADIUS / 10;
export const NEEDLE_PROJECTILE_DAMAGE_TIER_2 = NEEDLE_PROJECTILE_DAMAGE_TIER_1 * 1.5;
export const NEEDLE_PROJECTILE_RADIUS_TIER_3 = NEEDLE_PROJECTILE_RADIUS_TIER_1 * 1.5;
export const NEEDLE_PROJECTILE_COOLDOWN_TICKS_TIER_3 =
  (NEEDLE_PROJECTILE_COOLDOWN_TICKS_TIER_1 * 2) / 3;

export const FLICKER_PROJECTILE_DAMAGE_TIER_1 = PROJECTILE_DAMAGE / 5;
export const FLICKER_PROJECTILE_COOLDOWN_TICKS_TIER_1 = WEAPON_COOLDOWN_TICKS / 5;
export const FLICKER_PROJECTILE_RADIUS_TIER_1 = PROJECTILE_RADIUS / 5;
export const FLICKER_PROJECTILE_DAMAGE_TIER_2 = FLICKER_PROJECTILE_DAMAGE_TIER_1 * 1.5;
export const FLICKER_PROJECTILE_RADIUS_TIER_3 = FLICKER_PROJECTILE_RADIUS_TIER_1 * 1.5;
export const FLICKER_PROJECTILE_COOLDOWN_TICKS_TIER_3 =
  (FLICKER_PROJECTILE_COOLDOWN_TICKS_TIER_1 * 2) / 3;

export const LANCE_PROJECTILE_DAMAGE_TIER_1 = PROJECTILE_DAMAGE * 1.5;
export const LANCE_PROJECTILE_COOLDOWN_TICKS_TIER_1 = WEAPON_COOLDOWN_TICKS * 1.5;
export const LANCE_PROJECTILE_RADIUS_TIER_1 = PROJECTILE_RADIUS * 1.5;
export const LANCE_PROJECTILE_DAMAGE_TIER_2 = LANCE_PROJECTILE_DAMAGE_TIER_1 * 1.5;
export const LANCE_PROJECTILE_RADIUS_TIER_3 = LANCE_PROJECTILE_RADIUS_TIER_1 * 1.5;
export const LANCE_PROJECTILE_COOLDOWN_TICKS_TIER_3 =
  (LANCE_PROJECTILE_COOLDOWN_TICKS_TIER_1 * 2) / 3;

export const CANNON_PROJECTILE_DAMAGE_TIER_1 = PROJECTILE_DAMAGE * 2.5;
export const CANNON_PROJECTILE_COOLDOWN_TICKS_TIER_1 = WEAPON_COOLDOWN_TICKS * 2.5;
export const CANNON_PROJECTILE_RADIUS_TIER_1 = PROJECTILE_RADIUS * 2.5;
export const CANNON_PROJECTILE_DAMAGE_TIER_2 = CANNON_PROJECTILE_DAMAGE_TIER_1 * 1.5;
export const CANNON_PROJECTILE_RADIUS_TIER_3 = CANNON_PROJECTILE_RADIUS_TIER_1 * 1.5;
export const CANNON_PROJECTILE_COOLDOWN_TICKS_TIER_3 =
  (CANNON_PROJECTILE_COOLDOWN_TICKS_TIER_1 * 2) / 3;

export const SIEGE_PROJECTILE_DAMAGE_TIER_1 = PROJECTILE_DAMAGE * 4;
export const SIEGE_PROJECTILE_COOLDOWN_TICKS_TIER_1 = WEAPON_COOLDOWN_TICKS * 4;
export const SIEGE_PROJECTILE_RADIUS_TIER_1 = PROJECTILE_RADIUS * 4;
export const SIEGE_PROJECTILE_DAMAGE_TIER_2 = SIEGE_PROJECTILE_DAMAGE_TIER_1 * 1.5;
export const SIEGE_PROJECTILE_RADIUS_TIER_3 = SIEGE_PROJECTILE_RADIUS_TIER_1 * 1.5;
export const SIEGE_PROJECTILE_COOLDOWN_TICKS_TIER_3 =
  (SIEGE_PROJECTILE_COOLDOWN_TICKS_TIER_1 * 2) / 3;

/**
 * `V2-108` basic enemy composition (V2-ADR-070). `grunt` is the unchanged
 * MVP-0 baseline (`ENEMY_HEALTH`/`ENEMY_MOVE_SPEED`/`ENEMY_CONTACT_DAMAGE`/
 * `ENEMY_RADIUS`/`ENEMY_XP_VALUE`, cost `2`). `swarmling` is half its health,
 * damage, and xp, one and a half times its speed, three quarters its radius,
 * and half its cost — a cheap, weak, fast archetype. `brute` is one and a
 * half times its health, damage, and xp, three fifths its speed, and one and
 * a quarter times its radius, at the *same* cost as `grunt` — an equal-cost
 * sidegrade, not a strict upgrade. `MVP0_ENEMY_SPAWN_BUDGET` equals `grunt`'s
 * own cost, so a composition that always draws `grunt` or `brute` reproduces
 * today's exact one-enemy-per-interval cadence exactly, and a composition
 * that draws `swarmling` instead spends the identical budget on two weaker
 * enemies whose combined health and damage equal one `grunt`'s
 * (`Mvp0Config.test.ts` pins this) — composition varies which archetype(s)
 * appear without escalating total per-interval threat power.
 */
export const SWARMLING_ENEMY_HEALTH = ENEMY_HEALTH / 2;
export const SWARMLING_ENEMY_MOVE_SPEED = ENEMY_MOVE_SPEED * 1.5;
export const SWARMLING_ENEMY_CONTACT_DAMAGE = ENEMY_CONTACT_DAMAGE / 2;
export const SWARMLING_ENEMY_RADIUS = ENEMY_RADIUS * 0.75;
export const SWARMLING_ENEMY_XP_VALUE = ENEMY_XP_VALUE / 2;
export const SWARMLING_ENEMY_COST = 1;

export const BRUTE_ENEMY_HEALTH = ENEMY_HEALTH * 1.5;
export const BRUTE_ENEMY_MOVE_SPEED = ENEMY_MOVE_SPEED * 0.6;
export const BRUTE_ENEMY_CONTACT_DAMAGE = ENEMY_CONTACT_DAMAGE * 1.5;
export const BRUTE_ENEMY_RADIUS = ENEMY_RADIUS * 1.25;
export const BRUTE_ENEMY_XP_VALUE = ENEMY_XP_VALUE * 1.5;
export const BRUTE_ENEMY_COST = 2;

export const GRUNT_ENEMY_COST = 2;
export const MVP0_ENEMY_SPAWN_BUDGET = GRUNT_ENEMY_COST;

/**
 * A safety bound on `EnemyComposer`'s pick loop, not a designed value: every
 * pick costs at least `SWARMLING_ENEMY_COST` (the cheapest archetype), so the
 * loop already terminates after at most `budget / SWARMLING_ENEMY_COST`
 * picks by construction. This constant exists only to size the reused output
 * buffer so composing never allocates.
 */
export const MVP0_ENEMY_COMPOSITION_MAX_PICKS = Math.ceil(
  MVP0_ENEMY_SPAWN_BUDGET / SWARMLING_ENEMY_COST
);
