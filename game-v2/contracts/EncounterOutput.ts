/**
 * The full market-encounter output taxonomy (design §6.2, `V2-204`).
 * `WORLD_EVENT`/`LOOT_EVENT`/`HYBRID` have no concrete shape yet — the
 * families that own them (`V2-205`/`V2-206`) add their own variant to
 * `EncounterOutput` when they need one, rather than this task guessing
 * their content (V2-ADR-105).
 */
export type EncounterOutputKind = 'SPAWN' | 'WORLD_EVENT' | 'LOOT_EVENT' | 'HYBRID';

/**
 * A bounded, themed enemy composition (design line 184). `enemyBudget` is
 * spent the same way `EnemyComposer` spends `MVP0_ENEMY_SPAWN_BUDGET` — a
 * positive integer, not itself wired into a spawn system yet (`V2-208`).
 */
export type SpawnEncounterOutput = Readonly<{
  kind: 'SPAWN';
  enemyBudget: number;
  themeId: string;
}>;

/** Grows as later families add their own variant (`V2-205`/`V2-206`). */
export type EncounterOutput = SpawnEncounterOutput;

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  Number.isInteger(value) &&
  value > 0;

/** Validates one `SpawnEncounterOutput`'s shape and field ranges. */
export const assertSpawnEncounterOutput = (value: unknown): SpawnEncounterOutput => {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError('spawn encounter output must be an object');
  }

  const candidate = value as Partial<SpawnEncounterOutput>;

  if (candidate.kind !== 'SPAWN') {
    throw new RangeError("spawn encounter output kind must be 'SPAWN'");
  }

  if (!isPositiveInteger(candidate.enemyBudget)) {
    throw new RangeError(
      'spawn encounter output enemyBudget must be a positive integer'
    );
  }

  if (typeof candidate.themeId !== 'string' || candidate.themeId.trim().length === 0) {
    throw new TypeError('spawn encounter output themeId must be a non-empty string');
  }

  return Object.freeze({
    kind: 'SPAWN',
    enemyBudget: candidate.enemyBudget,
    themeId: candidate.themeId,
  });
};
