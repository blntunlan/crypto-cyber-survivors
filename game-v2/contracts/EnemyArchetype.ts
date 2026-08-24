/**
 * A basic enemy archetype (design §6.1, `V2-108`; telegraphed archetypes
 * `V2-300`).
 *
 * Every archetype writes into the same `World` stat fields
 * (`health`/`enemySpeed`/`contactDamage`/`radius`/`xpValue`) `EnemySystem`
 * already owns — there is no per-entity "which archetype" store, because
 * nothing downstream of spawn needs to know an enemy's archetype once its
 * stats are baked in (V2-ADR-069). `cost` is spent against a per-interval
 * composition budget (`EnemyComposer`); it is not stored on the entity.
 *
 * `telegraph` is likewise flattened into shared `World` columns at spawn
 * (V2-ADR-164) rather than kept as a per-entity archetype reference.
 */
export type EnemyArchetypeId =
  | 'grunt'
  | 'swarmling'
  | 'brute'
  | 'charger'
  | 'bloater'
  | 'sniper';

/**
 * A discriminated union keyed by `behavior` (V2-ADR-163): each variant
 * carries only the fields its own behavior uses, rather than one flat
 * shape with behavior-conditional zero-fields.
 *
 * All three telegraphed behaviors resolve against the player's current
 * position at the exact tick the telegraph resolves, not a position
 * locked at telegraph-start (V2-ADR-162).
 */
export type EnemyTelegraphProfile =
  | Readonly<{ behavior: 'none' }>
  | Readonly<{
      behavior: 'charger';
      /** Reuses the existing, unmodified contact-damage system for the strike itself (V2-ADR-159). */
      telegraphTicks: number;
      activeTicks: number;
      cooldownTicks: number;
      dashSpeed: number;
      triggerRange: number;
    }>
  | Readonly<{
      behavior: 'bloater';
      /** One-shot: no cooldown/re-arm cycle (V2-ADR-160). */
      telegraphTicks: number;
      burstDamage: number;
      burstRadius: number;
    }>
  | Readonly<{
      behavior: 'sniper';
      /** A new line-check resolution path, not radius-overlap (V2-ADR-161). */
      telegraphTicks: number;
      activeTicks: number;
      cooldownTicks: number;
      lineDamage: number;
      lineTolerance: number;
      /** Also the hold/engage distance the archetype stops closing at. */
      lineRange: number;
    }>;

export type EnemyDefinition = Readonly<{
  id: EnemyArchetypeId;
  health: number;
  moveSpeed: number;
  contactDamage: number;
  radius: number;
  xpValue: number;
  /** Positive integer budget cost (V2-ADR-070); `EnemyComposer` spends it. */
  cost: number;
  telegraph: EnemyTelegraphProfile;
}>;

const isFinitePositive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  Number.isInteger(value) &&
  value > 0;

/** Validates one `EnemyTelegraphProfile`'s shape and field ranges. */
const assertTelegraphProfile = (id: string, value: unknown): EnemyTelegraphProfile => {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError(`${id} enemy definition telegraph must be an object`);
  }

  const candidate = value as Partial<
    EnemyTelegraphProfile & {
      telegraphTicks?: unknown;
      activeTicks?: unknown;
      cooldownTicks?: unknown;
      dashSpeed?: unknown;
      triggerRange?: unknown;
      burstDamage?: unknown;
      burstRadius?: unknown;
      lineDamage?: unknown;
      lineTolerance?: unknown;
      lineRange?: unknown;
    }
  >;

  if (candidate.behavior === 'none') {
    return { behavior: 'none' };
  }

  if (candidate.behavior === 'charger') {
    if (
      !isPositiveInteger(candidate.telegraphTicks) ||
      !isPositiveInteger(candidate.activeTicks) ||
      !isPositiveInteger(candidate.cooldownTicks) ||
      !isFinitePositive(candidate.dashSpeed) ||
      !isFinitePositive(candidate.triggerRange)
    ) {
      throw new RangeError(
        `${id} charger telegraph requires positive integer telegraphTicks/activeTicks/cooldownTicks and finite positive dashSpeed/triggerRange`
      );
    }
    return {
      behavior: 'charger',
      telegraphTicks: candidate.telegraphTicks,
      activeTicks: candidate.activeTicks,
      cooldownTicks: candidate.cooldownTicks,
      dashSpeed: candidate.dashSpeed,
      triggerRange: candidate.triggerRange,
    };
  }

  if (candidate.behavior === 'bloater') {
    if (
      !isPositiveInteger(candidate.telegraphTicks) ||
      !isFinitePositive(candidate.burstDamage) ||
      !isFinitePositive(candidate.burstRadius)
    ) {
      throw new RangeError(
        `${id} bloater telegraph requires positive integer telegraphTicks and finite positive burstDamage/burstRadius`
      );
    }
    return {
      behavior: 'bloater',
      telegraphTicks: candidate.telegraphTicks,
      burstDamage: candidate.burstDamage,
      burstRadius: candidate.burstRadius,
    };
  }

  if (candidate.behavior === 'sniper') {
    if (
      !isPositiveInteger(candidate.telegraphTicks) ||
      !isPositiveInteger(candidate.activeTicks) ||
      !isPositiveInteger(candidate.cooldownTicks) ||
      !isFinitePositive(candidate.lineDamage) ||
      !isFinitePositive(candidate.lineTolerance) ||
      !isFinitePositive(candidate.lineRange)
    ) {
      throw new RangeError(
        `${id} sniper telegraph requires positive integer telegraphTicks/activeTicks/cooldownTicks and finite positive lineDamage/lineTolerance/lineRange`
      );
    }
    return {
      behavior: 'sniper',
      telegraphTicks: candidate.telegraphTicks,
      activeTicks: candidate.activeTicks,
      cooldownTicks: candidate.cooldownTicks,
      lineDamage: candidate.lineDamage,
      lineTolerance: candidate.lineTolerance,
      lineRange: candidate.lineRange,
    };
  }

  throw new RangeError(`${id} enemy definition telegraph has an unknown behavior`);
};

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

  const telegraph = assertTelegraphProfile(candidate.id, candidate.telegraph);

  return {
    id: candidate.id as EnemyArchetypeId,
    health: candidate.health,
    moveSpeed: candidate.moveSpeed,
    contactDamage: candidate.contactDamage,
    radius: candidate.radius,
    xpValue: candidate.xpValue,
    cost: candidate.cost,
    telegraph,
  };
};
