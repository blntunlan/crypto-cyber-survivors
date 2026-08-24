/**
 * The full market-encounter output taxonomy (design §6.2, `V2-204`).
 * `LOOT_EVENT`/`HYBRID` have no concrete shape yet — the family that owns
 * `LOOT_EVENT` (`V2-206`) adds its own variant to `EncounterOutput` when it
 * needs one, rather than this task guessing its content (V2-ADR-105).
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

/**
 * A telegraphed arena hazard or environment event (design line 185,
 * `V2-205`). No hazard-effect payload yet (no arena-region shape, no
 * damage/DoT numbers) — no hazard system exists to consume one
 * (`V2-209`), matching `SpawnEncounterOutput`'s own precedent of staying
 * minimal until a real consumer needs more (V2-ADR-115).
 */
export type WorldEventEncounterOutput = Readonly<{
  kind: 'WORLD_EVENT';
  hazardId: string;
  telegraphTicks: number;
}>;

/** Grows as the remaining family adds its own variant (`V2-206`). */
export type EncounterOutput = SpawnEncounterOutput | WorldEventEncounterOutput;

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

/** Validates one `WorldEventEncounterOutput`'s shape and field ranges. */
export const assertWorldEventEncounterOutput = (
  value: unknown
): WorldEventEncounterOutput => {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError('world event encounter output must be an object');
  }

  const candidate = value as Partial<WorldEventEncounterOutput>;

  if (candidate.kind !== 'WORLD_EVENT') {
    throw new RangeError("world event encounter output kind must be 'WORLD_EVENT'");
  }

  if (
    typeof candidate.hazardId !== 'string' ||
    candidate.hazardId.trim().length === 0
  ) {
    throw new TypeError(
      'world event encounter output hazardId must be a non-empty string'
    );
  }

  if (!isPositiveInteger(candidate.telegraphTicks)) {
    throw new RangeError(
      'world event encounter output telegraphTicks must be a positive integer'
    );
  }

  return Object.freeze({
    kind: 'WORLD_EVENT',
    hazardId: candidate.hazardId,
    telegraphTicks: candidate.telegraphTicks,
  });
};
