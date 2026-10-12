import {
  assertEnemyDefinition,
  type EnemyDefinition,
} from '@/game-v2/contracts/EnemyArchetype';
import {
  BLOATER_BURST_DAMAGE,
  BLOATER_BURST_RADIUS,
  BLOATER_ENEMY_COST,
  BLOATER_ENEMY_CONTACT_DAMAGE,
  BLOATER_ENEMY_HEALTH,
  BLOATER_ENEMY_MOVE_SPEED,
  BLOATER_ENEMY_RADIUS,
  BLOATER_ENEMY_XP_VALUE,
  BLOATER_TELEGRAPH_TICKS,
  BRUTE_ENEMY_COST,
  BRUTE_ENEMY_CONTACT_DAMAGE,
  BRUTE_ENEMY_HEALTH,
  BRUTE_ENEMY_MOVE_SPEED,
  BRUTE_ENEMY_RADIUS,
  BRUTE_ENEMY_XP_VALUE,
  CHARGER_ACTIVE_TICKS,
  CHARGER_COOLDOWN_TICKS,
  CHARGER_DASH_SPEED,
  CHARGER_ENEMY_APPROACH_SPEED,
  CHARGER_ENEMY_COST,
  CHARGER_ENEMY_CONTACT_DAMAGE,
  CHARGER_ENEMY_HEALTH,
  CHARGER_ENEMY_RADIUS,
  CHARGER_ENEMY_XP_VALUE,
  CHARGER_TELEGRAPH_TICKS,
  CHARGER_TRIGGER_RANGE,
  ENEMY_CONTACT_DAMAGE,
  ENEMY_HEALTH,
  ENEMY_MOVE_SPEED,
  ENEMY_RADIUS,
  ENEMY_XP_VALUE,
  GRUNT_ENEMY_COST,
  SNIPER_ACTIVE_TICKS,
  SNIPER_COOLDOWN_TICKS,
  SNIPER_ENEMY_COST,
  SNIPER_ENEMY_CONTACT_DAMAGE,
  SNIPER_ENEMY_HEALTH,
  SNIPER_ENEMY_MOVE_SPEED,
  SNIPER_ENEMY_RADIUS,
  SNIPER_ENEMY_XP_VALUE,
  SNIPER_ENGAGE_RANGE,
  SNIPER_LINE_DAMAGE,
  SNIPER_LINE_TOLERANCE,
  SNIPER_TELEGRAPH_TICKS,
  SWARMLING_ENEMY_COST,
  SWARMLING_ENEMY_CONTACT_DAMAGE,
  SWARMLING_ENEMY_HEALTH,
  SWARMLING_ENEMY_MOVE_SPEED,
  SWARMLING_ENEMY_RADIUS,
  SWARMLING_ENEMY_XP_VALUE,
} from '@/game-v2/config/Mvp0Config';

/**
 * The unchanged MVP-0 baseline archetype (`V2-108`). Every existing
 * `EnemySystem.spawnEnemy` caller that does not pass a definition defaults
 * to this one, so pre-`V2-108` behavior is byte-for-byte unchanged.
 */
export const GRUNT_ENEMY: EnemyDefinition = Object.freeze(
  assertEnemyDefinition({
    id: 'grunt',
    health: ENEMY_HEALTH,
    moveSpeed: ENEMY_MOVE_SPEED,
    contactDamage: ENEMY_CONTACT_DAMAGE,
    radius: ENEMY_RADIUS,
    xpValue: ENEMY_XP_VALUE,
    cost: GRUNT_ENEMY_COST,
    telegraph: { behavior: 'none' },
    eliteEligible: true,
  })
);

/** A cheap, weak, fast archetype (`V2-108`, V2-ADR-070). */
export const SWARMLING_ENEMY: EnemyDefinition = Object.freeze(
  assertEnemyDefinition({
    id: 'swarmling',
    health: SWARMLING_ENEMY_HEALTH,
    moveSpeed: SWARMLING_ENEMY_MOVE_SPEED,
    contactDamage: SWARMLING_ENEMY_CONTACT_DAMAGE,
    radius: SWARMLING_ENEMY_RADIUS,
    xpValue: SWARMLING_ENEMY_XP_VALUE,
    cost: SWARMLING_ENEMY_COST,
    telegraph: { behavior: 'none' },
    eliteEligible: true,
  })
);

/**
 * An equal-cost sidegrade to `grunt` — tankier and harder-hitting, slower
 * (`V2-108`, V2-ADR-070).
 */
export const BRUTE_ENEMY: EnemyDefinition = Object.freeze(
  assertEnemyDefinition({
    id: 'brute',
    health: BRUTE_ENEMY_HEALTH,
    moveSpeed: BRUTE_ENEMY_MOVE_SPEED,
    contactDamage: BRUTE_ENEMY_CONTACT_DAMAGE,
    radius: BRUTE_ENEMY_RADIUS,
    xpValue: BRUTE_ENEMY_XP_VALUE,
    cost: BRUTE_ENEMY_COST,
    telegraph: { behavior: 'none' },
    eliteEligible: true,
  })
);

/**
 * Approaches slowly, telegraphs, then dashes at `CHARGER_DASH_SPEED`
 * toward the player's current position (`V2-300`, V2-ADR-159). The
 * strike itself is the existing, unmodified contact-damage system —
 * this archetype's threat is the sudden closing speed, not a special
 * damage path.
 */
export const CHARGER_ENEMY: EnemyDefinition = Object.freeze(
  assertEnemyDefinition({
    id: 'charger',
    health: CHARGER_ENEMY_HEALTH,
    moveSpeed: CHARGER_ENEMY_APPROACH_SPEED,
    contactDamage: CHARGER_ENEMY_CONTACT_DAMAGE,
    radius: CHARGER_ENEMY_RADIUS,
    xpValue: CHARGER_ENEMY_XP_VALUE,
    cost: CHARGER_ENEMY_COST,
    telegraph: {
      behavior: 'charger',
      telegraphTicks: CHARGER_TELEGRAPH_TICKS,
      activeTicks: CHARGER_ACTIVE_TICKS,
      cooldownTicks: CHARGER_COOLDOWN_TICKS,
      dashSpeed: CHARGER_DASH_SPEED,
      triggerRange: CHARGER_TRIGGER_RANGE,
    },
    eliteEligible: true,
  })
);

/**
 * Chases like a grunt, softer, and on reaching contact range arms a
 * fuse then detonates once in an area burst before being destroyed
 * (`V2-300`, V2-ADR-160) — one-shot, no cooldown/re-arm cycle.
 */
export const BLOATER_ENEMY: EnemyDefinition = Object.freeze(
  assertEnemyDefinition({
    id: 'bloater',
    health: BLOATER_ENEMY_HEALTH,
    moveSpeed: BLOATER_ENEMY_MOVE_SPEED,
    contactDamage: BLOATER_ENEMY_CONTACT_DAMAGE,
    radius: BLOATER_ENEMY_RADIUS,
    xpValue: BLOATER_ENEMY_XP_VALUE,
    cost: BLOATER_ENEMY_COST,
    telegraph: {
      behavior: 'bloater',
      telegraphTicks: BLOATER_TELEGRAPH_TICKS,
      burstDamage: BLOATER_BURST_DAMAGE,
      burstRadius: BLOATER_BURST_RADIUS,
    },
    /**
     * Never elite-eligible (`V2-301`, V2-ADR-169): none of `tough`/`swift`/
     * `volatile` fit a one-shot archetype whose own burst already is an
     * on-death AoE.
     */
    eliteEligible: false,
  })
);

/**
 * Holds at `SNIPER_ENGAGE_RANGE` rather than closing to contact,
 * telegraphs an aim, then resolves a directional line-check hit toward
 * the player's current position (`V2-300`, V2-ADR-161) — a new
 * resolution path, since a line check is not a radius overlap.
 */
export const SNIPER_ENEMY: EnemyDefinition = Object.freeze(
  assertEnemyDefinition({
    id: 'sniper',
    health: SNIPER_ENEMY_HEALTH,
    moveSpeed: SNIPER_ENEMY_MOVE_SPEED,
    contactDamage: SNIPER_ENEMY_CONTACT_DAMAGE,
    radius: SNIPER_ENEMY_RADIUS,
    xpValue: SNIPER_ENEMY_XP_VALUE,
    cost: SNIPER_ENEMY_COST,
    telegraph: {
      behavior: 'sniper',
      telegraphTicks: SNIPER_TELEGRAPH_TICKS,
      activeTicks: SNIPER_ACTIVE_TICKS,
      cooldownTicks: SNIPER_COOLDOWN_TICKS,
      lineDamage: SNIPER_LINE_DAMAGE,
      lineTolerance: SNIPER_LINE_TOLERANCE,
      lineRange: SNIPER_ENGAGE_RANGE,
    },
    eliteEligible: true,
  })
);

/**
 * Validates a set of enemy definitions: every entry passes
 * `assertEnemyDefinition`, and ids are pairwise distinct.
 */
export const createEnemyRegistry = (
  definitions: readonly EnemyDefinition[]
): readonly EnemyDefinition[] => {
  if (definitions.length === 0) {
    throw new RangeError('enemy registry requires at least one definition');
  }

  const seenIds = new Set<string>();
  const validated: EnemyDefinition[] = [];

  for (const candidate of definitions) {
    const definition = assertEnemyDefinition(candidate);

    if (seenIds.has(definition.id)) {
      throw new RangeError('enemy registry contains a duplicate identity');
    }
    seenIds.add(definition.id);
    validated.push(Object.freeze(definition));
  }

  return Object.freeze(validated);
};

/**
 * The MVP-1 enemy composition pool (`V2-108`, six archetypes since
 * `V2-300`). `EnemyComposer` spends a per-interval budget against these
 * six archetypes' `cost`.
 */
export const MVP1_ENEMY_REGISTRY: readonly EnemyDefinition[] = createEnemyRegistry([
  GRUNT_ENEMY,
  SWARMLING_ENEMY,
  BRUTE_ENEMY,
  CHARGER_ENEMY,
  BLOATER_ENEMY,
  SNIPER_ENEMY,
]);
