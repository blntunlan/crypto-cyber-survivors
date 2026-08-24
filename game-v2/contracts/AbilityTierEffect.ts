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

/**
 * The five mid-run-only identities (`V2-107`, V2-ADR-066): each extends
 * V2-ADR-063's precedent — the same unchanged single-target auto-fire
 * pipeline, tuned as a multiple of `starter-projectile`'s own Tier 1 numbers
 * so every projectile-family identity opens at the identical Tier 1
 * damage-per-tick baseline.
 */
export type NeedleProjectileTierEffect = Readonly<{
  ability: 'needle-projectile';
  damage: number;
  projectileRadius: number;
  cooldownTicks: number;
}>;

export type FlickerProjectileTierEffect = Readonly<{
  ability: 'flicker-projectile';
  damage: number;
  projectileRadius: number;
  cooldownTicks: number;
}>;

export type LanceProjectileTierEffect = Readonly<{
  ability: 'lance-projectile';
  damage: number;
  projectileRadius: number;
  cooldownTicks: number;
}>;

export type CannonProjectileTierEffect = Readonly<{
  ability: 'cannon-projectile';
  damage: number;
  projectileRadius: number;
  cooldownTicks: number;
}>;

export type SiegeProjectileTierEffect = Readonly<{
  ability: 'siege-projectile';
  damage: number;
  projectileRadius: number;
  cooldownTicks: number;
}>;

export type AbilityTierEffect =
  | StarterProjectileTierEffect
  | HeavyProjectileTierEffect
  | RapidProjectileTierEffect
  | NeedleProjectileTierEffect
  | FlickerProjectileTierEffect
  | LanceProjectileTierEffect
  | CannonProjectileTierEffect
  | SiegeProjectileTierEffect;

const isFinitePositive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

/**
 * All eight single-target projectile identities share this exact validation
 * rule; only the `ability` tag differs (V2-ADR-063, V2-ADR-066).
 */
const assertProjectileTierEffectFields = (
  ability: AbilityTierEffect['ability'],
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
    case 'needle-projectile': {
      const effect = candidate as Partial<NeedleProjectileTierEffect>;
      assertProjectileTierEffectFields('needle-projectile', effect);

      return {
        ability: 'needle-projectile',
        damage: effect.damage as number,
        projectileRadius: effect.projectileRadius as number,
        cooldownTicks: effect.cooldownTicks as number,
      };
    }
    case 'flicker-projectile': {
      const effect = candidate as Partial<FlickerProjectileTierEffect>;
      assertProjectileTierEffectFields('flicker-projectile', effect);

      return {
        ability: 'flicker-projectile',
        damage: effect.damage as number,
        projectileRadius: effect.projectileRadius as number,
        cooldownTicks: effect.cooldownTicks as number,
      };
    }
    case 'lance-projectile': {
      const effect = candidate as Partial<LanceProjectileTierEffect>;
      assertProjectileTierEffectFields('lance-projectile', effect);

      return {
        ability: 'lance-projectile',
        damage: effect.damage as number,
        projectileRadius: effect.projectileRadius as number,
        cooldownTicks: effect.cooldownTicks as number,
      };
    }
    case 'cannon-projectile': {
      const effect = candidate as Partial<CannonProjectileTierEffect>;
      assertProjectileTierEffectFields('cannon-projectile', effect);

      return {
        ability: 'cannon-projectile',
        damage: effect.damage as number,
        projectileRadius: effect.projectileRadius as number,
        cooldownTicks: effect.cooldownTicks as number,
      };
    }
    case 'siege-projectile': {
      const effect = candidate as Partial<SiegeProjectileTierEffect>;
      assertProjectileTierEffectFields('siege-projectile', effect);

      return {
        ability: 'siege-projectile',
        damage: effect.damage as number,
        projectileRadius: effect.projectileRadius as number,
        cooldownTicks: effect.cooldownTicks as number,
      };
    }
    default:
      throw new RangeError('unknown ability tier effect shape');
  }
};
