import {
  assertEnemyDefinition,
  type EnemyDefinition,
} from '@/game-v2/contracts/EnemyArchetype';
import {
  BRUTE_ENEMY_COST,
  BRUTE_ENEMY_CONTACT_DAMAGE,
  BRUTE_ENEMY_HEALTH,
  BRUTE_ENEMY_MOVE_SPEED,
  BRUTE_ENEMY_RADIUS,
  BRUTE_ENEMY_XP_VALUE,
  ENEMY_CONTACT_DAMAGE,
  ENEMY_HEALTH,
  ENEMY_MOVE_SPEED,
  ENEMY_RADIUS,
  ENEMY_XP_VALUE,
  GRUNT_ENEMY_COST,
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
 * The MVP-1 enemy composition pool (`V2-108`). `EnemyComposer` spends a
 * per-interval budget against these three archetypes' `cost`.
 */
export const MVP1_ENEMY_REGISTRY: readonly EnemyDefinition[] = createEnemyRegistry([
  GRUNT_ENEMY,
  SWARMLING_ENEMY,
  BRUTE_ENEMY,
]);
