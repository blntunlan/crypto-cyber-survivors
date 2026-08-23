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

/**
 * A slower-cadence, higher-burst start-eligible weapon (V2-ADR-063): it
 * reuses `WeaponSystem`'s single-target auto-fire pipeline unchanged, trading
 * cadence for burst relative to `starter-projectile`.
 */
export type HeavyProjectileTierEffect = Readonly<{
  ability: 'heavy-projectile';
  damage: number;
  projectileRadius: number;
  cooldownTicks: number;
}>;

/**
 * A faster-cadence, lower-burst start-eligible weapon (V2-ADR-063): it reuses
 * `WeaponSystem`'s single-target auto-fire pipeline unchanged, trading burst
 * for cadence relative to `starter-projectile`.
 */
export type RapidProjectileTierEffect = Readonly<{
  ability: 'rapid-projectile';
  damage: number;
  projectileRadius: number;
  cooldownTicks: number;
}>;

export type AbilityTierEffect =
  | StarterProjectileTierEffect
  | HeavyProjectileTierEffect
  | RapidProjectileTierEffect;

const isFinitePositive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

/**
 * The three single-target projectile identities (starter/heavy/rapid) share
 * this exact validation rule; only the `ability` tag differs (V2-ADR-063).
 */
const assertProjectileTierEffectFields = (
  ability: 'starter-projectile' | 'heavy-projectile' | 'rapid-projectile',
  candidate: Partial<{
    damage: number;
    projectileRadius: number;
    cooldownTicks: number;
  }>
): void => {
  if (
    !isFinitePositive(candidate.damage) ||
    !isFinitePositive(candidate.projectileRadius) ||
    !isFinitePositive(candidate.cooldownTicks) ||
    !Number.isInteger(candidate.cooldownTicks)
  ) {
    throw new RangeError(
      `${ability} tier effect requires finite positive damage, ` +
        'projectileRadius, and an integer cooldownTicks'
    );
  }
};

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
      assertProjectileTierEffectFields('starter-projectile', effect);

      return {
        ability: 'starter-projectile',
        damage: effect.damage as number,
        projectileRadius: effect.projectileRadius as number,
        cooldownTicks: effect.cooldownTicks as number,
      };
    }
    case 'heavy-projectile': {
      const effect = candidate as Partial<HeavyProjectileTierEffect>;
      assertProjectileTierEffectFields('heavy-projectile', effect);

      return {
        ability: 'heavy-projectile',
        damage: effect.damage as number,
        projectileRadius: effect.projectileRadius as number,
        cooldownTicks: effect.cooldownTicks as number,
      };
    }
    case 'rapid-projectile': {
      const effect = candidate as Partial<RapidProjectileTierEffect>;
      assertProjectileTierEffectFields('rapid-projectile', effect);

      return {
        ability: 'rapid-projectile',
        damage: effect.damage as number,
        projectileRadius: effect.projectileRadius as number,
        cooldownTicks: effect.cooldownTicks as number,
      };
    }
    default:
      throw new RangeError('unknown ability tier effect shape');
  }
};
