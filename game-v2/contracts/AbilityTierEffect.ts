/**
 * Typed, ability-specific tier effects (design §5.2, V2-ADR-044).
 *
 * Every ability identity defines its own effect shape rather than filling a
 * shared numeric struct — design §5.2 explicitly forbids "a universal damage
 * and radius multiplier pipeline". `AbilityTierEffect` is a discriminated
 * union over one member type per distinct shape, so a new ability
 * (`V2-106`, `V2-107`) adds its own member and every reader that switches on
 * `ability` must handle it or fail to compile.
 */
export type StarterProjectileTierEffect = Readonly<{
  ability: 'starter-projectile';
  damage: number;
  projectileRadius: number;
  cooldownTicks: number;
}>;

export type AbilityTierEffect = StarterProjectileTierEffect;

const isFinitePositive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

/**
 * Validates one tier effect against its own shape.
 *
 * The `switch` is exhaustive over `AbilityTierEffect['ability']`: adding a
 * union member without a matching `case` here is a compile error, which is
 * the enforcement mechanism V2-ADR-044 relies on.
 */
export const assertAbilityTierEffect = (value: unknown): AbilityTierEffect => {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError('ability tier effect must be an object');
  }

  const candidate = value as { ability?: unknown };

  switch (candidate.ability) {
    case 'starter-projectile': {
      const effect = candidate as Partial<StarterProjectileTierEffect>;

      if (
        !isFinitePositive(effect.damage) ||
        !isFinitePositive(effect.projectileRadius) ||
        !isFinitePositive(effect.cooldownTicks) ||
        !Number.isInteger(effect.cooldownTicks)
      ) {
        throw new RangeError(
          'starter-projectile tier effect requires finite positive damage, ' +
            'projectileRadius, and an integer cooldownTicks'
        );
      }

      return {
        ability: 'starter-projectile',
        damage: effect.damage,
        projectileRadius: effect.projectileRadius,
        cooldownTicks: effect.cooldownTicks,
      };
    }
    default:
      throw new RangeError('unknown ability tier effect shape');
  }
};
