/**
 * A basic enemy archetype (design §6.1, `V2-108`).
 *
 * Every archetype writes into the same `World` stat fields
 * (`health`/`enemySpeed`/`contactDamage`/`radius`/`xpValue`) `EnemySystem`
 * already owns — there is no per-entity "which archetype" store, because
 * nothing downstream of spawn needs to know an enemy's archetype once its
 * stats are baked in (V2-ADR-069). `cost` is spent against a per-interval
 * composition budget (`EnemyComposer`); it is not stored on the entity.
 */
export type EnemyArchetypeId = 'grunt' | 'swarmling' | 'brute';

export type EnemyDefinition = Readonly<{
  id: EnemyArchetypeId;
  health: number;
  moveSpeed: number;
  contactDamage: number;
  radius: number;
  xpValue: number;
  /** Positive integer budget cost (V2-ADR-070); `EnemyComposer` spends it. */
  cost: number;
}>;

const isFinitePositive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

/** Validates one enemy definition's shape and field ranges. */
export const assertEnemyDefinition = (value: unknown): EnemyDefinition => {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError('enemy definition must be an object');
  }

  const candidate = value as Partial<EnemyDefinition>;

  if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) {
    throw new TypeError('enemy definition id must be a non-empty string');
  }
  if (
    !isFinitePositive(candidate.health) ||
    !isFinitePositive(candidate.moveSpeed) ||
    !isFinitePositive(candidate.contactDamage) ||
    !isFinitePositive(candidate.radius) ||
    !isFinitePositive(candidate.xpValue)
  ) {
    throw new RangeError(
      `${candidate.id} enemy definition requires finite positive health, moveSpeed, ` +
        'contactDamage, radius, and xpValue'
    );
  }
  if (!isFinitePositive(candidate.cost) || !Number.isInteger(candidate.cost)) {
    throw new RangeError(
      `${candidate.id} enemy definition cost must be a positive integer`
    );
  }

  return {
    id: candidate.id as EnemyArchetypeId,
    health: candidate.health,
    moveSpeed: candidate.moveSpeed,
    contactDamage: candidate.contactDamage,
    radius: candidate.radius,
    xpValue: candidate.xpValue,
    cost: candidate.cost,
  };
};
