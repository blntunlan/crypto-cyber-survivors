import { assertAbilityTierEffect } from '@/game-v2/contracts/AbilityTierEffect';
import {
  MAX_ABILITY_CODE,
  isAbilityActivation,
  isAbilityTier,
  type AbilityDefinition,
  type AbilityIdentityId,
} from '@/game-v2/contracts/AbilitySlot';
import {
  CANNON_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  CANNON_PROJECTILE_COOLDOWN_TICKS_TIER_3,
  CANNON_PROJECTILE_DAMAGE_TIER_1,
  CANNON_PROJECTILE_DAMAGE_TIER_2,
  CANNON_PROJECTILE_RADIUS_TIER_1,
  CANNON_PROJECTILE_RADIUS_TIER_3,
  FLICKER_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  FLICKER_PROJECTILE_COOLDOWN_TICKS_TIER_3,
  FLICKER_PROJECTILE_DAMAGE_TIER_1,
  FLICKER_PROJECTILE_DAMAGE_TIER_2,
  FLICKER_PROJECTILE_RADIUS_TIER_1,
  FLICKER_PROJECTILE_RADIUS_TIER_3,
  HEAVY_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  HEAVY_PROJECTILE_COOLDOWN_TICKS_TIER_3,
  HEAVY_PROJECTILE_DAMAGE_TIER_1,
  HEAVY_PROJECTILE_DAMAGE_TIER_2,
  HEAVY_PROJECTILE_RADIUS_TIER_1,
  HEAVY_PROJECTILE_RADIUS_TIER_3,
  LANCE_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  LANCE_PROJECTILE_COOLDOWN_TICKS_TIER_3,
  LANCE_PROJECTILE_DAMAGE_TIER_1,
  LANCE_PROJECTILE_DAMAGE_TIER_2,
  LANCE_PROJECTILE_RADIUS_TIER_1,
  LANCE_PROJECTILE_RADIUS_TIER_3,
  NEEDLE_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  NEEDLE_PROJECTILE_COOLDOWN_TICKS_TIER_3,
  NEEDLE_PROJECTILE_DAMAGE_TIER_1,
  NEEDLE_PROJECTILE_DAMAGE_TIER_2,
  NEEDLE_PROJECTILE_RADIUS_TIER_1,
  NEEDLE_PROJECTILE_RADIUS_TIER_3,
  PROJECTILE_DAMAGE,
  PROJECTILE_RADIUS,
  RAPID_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  RAPID_PROJECTILE_COOLDOWN_TICKS_TIER_3,
  RAPID_PROJECTILE_DAMAGE_TIER_1,
  RAPID_PROJECTILE_DAMAGE_TIER_2,
  RAPID_PROJECTILE_RADIUS_TIER_1,
  RAPID_PROJECTILE_RADIUS_TIER_3,
  SIEGE_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  SIEGE_PROJECTILE_COOLDOWN_TICKS_TIER_3,
  SIEGE_PROJECTILE_DAMAGE_TIER_1,
  SIEGE_PROJECTILE_DAMAGE_TIER_2,
  SIEGE_PROJECTILE_RADIUS_TIER_1,
  SIEGE_PROJECTILE_RADIUS_TIER_3,
  STARTER_PROJECTILE_RADIUS_TIER_3,
  STARTER_WEAPON_COOLDOWN_TICKS_TIER_3,
  STARTER_WEAPON_DAMAGE_TIER_2,
  WEAPON_COOLDOWN_TICKS,
} from '@/game-v2/config/Mvp0Config';

/**
 * A validated set of ability definitions.
 *
 * The registry is a value rather than a module-level table so tests can build
 * a four-identity loadout before V2-106 and V2-107 author the real ones, which
 * keeps placeholder identities out of production config (V2-ADR-039).
 */
export type AbilityRegistry = Readonly<{
  size: number;
  /** Every registered identity, insertion order, frozen (V2-ADR-052). */
  ids: readonly AbilityIdentityId[];
  /** Throws `RangeError` for an identity the registry does not define. */
  byId: (id: AbilityIdentityId) => AbilityDefinition;
  /** Returns `null` for the reserved empty code and throws for an unknown one. */
  byCode: (code: number) => AbilityDefinition | null;
}>;

export const createAbilityRegistry = (
  definitions: readonly AbilityDefinition[]
): AbilityRegistry => {
  if (definitions.length === 0) {
    throw new RangeError('ability registry requires at least one definition');
  }

  const byId = new Map<AbilityIdentityId, AbilityDefinition>();
  const byCode = new Map<number, AbilityDefinition>();

  for (const candidate of definitions) {
    const { id, code, activation, authoredTiers, tierEffects, startEligible } =
      candidate;

    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new TypeError('ability identity must be a non-empty string');
    }
    if (
      !Number.isInteger(code) ||
      code < 1 ||
      code > MAX_ABILITY_CODE ||
      Number.isNaN(code)
    ) {
      throw new RangeError(
        `ability code must be an integer inside 1..${MAX_ABILITY_CODE}`
      );
    }
    if (!isAbilityActivation(activation)) {
      throw new RangeError('ability activation must be active or auto');
    }
    if (!isAbilityTier(authoredTiers)) {
      throw new RangeError('authored tier count must be 1, 2, or 3');
    }
    if (!Array.isArray(tierEffects) || tierEffects.length !== authoredTiers) {
      throw new RangeError(
        'ability tierEffects length must equal its authoredTiers count'
      );
    }
    if (typeof startEligible !== 'boolean') {
      throw new TypeError('ability startEligible must be a boolean');
    }
    if (byId.has(id)) {
      throw new RangeError('ability registry contains a duplicate identity');
    }
    if (byCode.has(code)) {
      throw new RangeError('ability registry contains a duplicate code');
    }

    const validatedTierEffects = Object.freeze(
      tierEffects.map(effect => assertAbilityTierEffect(effect))
    );

    const frozen = Object.freeze({
      id,
      code,
      activation,
      authoredTiers,
      tierEffects: validatedTierEffects,
      startEligible,
    });
    byId.set(id, frozen);
    byCode.set(code, frozen);
  }

  return Object.freeze({
    size: byId.size,
    ids: Object.freeze([...byId.keys()]),
    byId: (id: AbilityIdentityId): AbilityDefinition => {
      const definition = byId.get(id);
      if (definition === undefined) {
        throw new RangeError('unknown ability identity');
      }
      return definition;
    },
    byCode: (code: number): AbilityDefinition | null => {
      if (code === 0) {
        return null;
      }
      const definition = byCode.get(code);
      if (definition === undefined) {
        throw new RangeError('unknown ability code');
      }
      return definition;
    },
  });
};

/**
 * The starter weapon carried over from MVP-0. It is autonomous, so it displays
 * `AUTO`. All three tiers are authored (V2-102, V2-ADR-045): Tier 2 raises
 * damage, Tier 3 raises projectile radius (coverage) and shortens cooldown
 * (cadence) without raising damage again, matching design §5.2's Tier 2/Tier 3
 * split.
 */
export const STARTER_PROJECTILE: AbilityDefinition = Object.freeze({
  id: 'starter-projectile',
  code: 1,
  activation: 'auto',
  authoredTiers: 3,
  startEligible: true,
  tierEffects: Object.freeze([
    Object.freeze({
      ability: 'starter-projectile',
      damage: PROJECTILE_DAMAGE,
      projectileRadius: PROJECTILE_RADIUS,
      cooldownTicks: WEAPON_COOLDOWN_TICKS,
    }),
    Object.freeze({
      ability: 'starter-projectile',
      damage: STARTER_WEAPON_DAMAGE_TIER_2,
      projectileRadius: PROJECTILE_RADIUS,
      cooldownTicks: WEAPON_COOLDOWN_TICKS,
    }),
    Object.freeze({
      ability: 'starter-projectile',
      damage: STARTER_WEAPON_DAMAGE_TIER_2,
      projectileRadius: STARTER_PROJECTILE_RADIUS_TIER_3,
      cooldownTicks: STARTER_WEAPON_COOLDOWN_TICKS_TIER_3,
    }),
  ]),
});

/**
 * A start-eligible weapon that trades cadence for burst (V2-106,
 * V2-ADR-063): same single-target auto-fire pipeline as `starter-projectile`,
 * opening at the identical Tier 1 damage-per-tick baseline but with double
 * the damage and double the cooldown.
 */
export const HEAVY_PROJECTILE: AbilityDefinition = Object.freeze({
  id: 'heavy-projectile',
  code: 2,
  activation: 'auto',
  authoredTiers: 3,
  startEligible: true,
  tierEffects: Object.freeze([
    Object.freeze({
      ability: 'heavy-projectile',
      damage: HEAVY_PROJECTILE_DAMAGE_TIER_1,
      projectileRadius: HEAVY_PROJECTILE_RADIUS_TIER_1,
      cooldownTicks: HEAVY_PROJECTILE_COOLDOWN_TICKS_TIER_1,
    }),
    Object.freeze({
      ability: 'heavy-projectile',
      damage: HEAVY_PROJECTILE_DAMAGE_TIER_2,
      projectileRadius: HEAVY_PROJECTILE_RADIUS_TIER_1,
      cooldownTicks: HEAVY_PROJECTILE_COOLDOWN_TICKS_TIER_1,
    }),
    Object.freeze({
      ability: 'heavy-projectile',
      damage: HEAVY_PROJECTILE_DAMAGE_TIER_2,
      projectileRadius: HEAVY_PROJECTILE_RADIUS_TIER_3,
      cooldownTicks: HEAVY_PROJECTILE_COOLDOWN_TICKS_TIER_3,
    }),
  ]),
});

/**
 * A start-eligible weapon that trades burst for cadence (V2-106,
 * V2-ADR-063): same single-target auto-fire pipeline as `starter-projectile`,
 * opening at the identical Tier 1 damage-per-tick baseline but with half the
 * damage and half the cooldown.
 */
export const RAPID_PROJECTILE: AbilityDefinition = Object.freeze({
  id: 'rapid-projectile',
  code: 3,
  activation: 'auto',
  authoredTiers: 3,
  startEligible: true,
  tierEffects: Object.freeze([
    Object.freeze({
      ability: 'rapid-projectile',
      damage: RAPID_PROJECTILE_DAMAGE_TIER_1,
      projectileRadius: RAPID_PROJECTILE_RADIUS_TIER_1,
      cooldownTicks: RAPID_PROJECTILE_COOLDOWN_TICKS_TIER_1,
    }),
    Object.freeze({
      ability: 'rapid-projectile',
      damage: RAPID_PROJECTILE_DAMAGE_TIER_2,
      projectileRadius: RAPID_PROJECTILE_RADIUS_TIER_1,
      cooldownTicks: RAPID_PROJECTILE_COOLDOWN_TICKS_TIER_1,
    }),
    Object.freeze({
      ability: 'rapid-projectile',
      damage: RAPID_PROJECTILE_DAMAGE_TIER_2,
      projectileRadius: RAPID_PROJECTILE_RADIUS_TIER_3,
      cooldownTicks: RAPID_PROJECTILE_COOLDOWN_TICKS_TIER_3,
    }),
  ]),
});

/**
 * A mid-run-only weapon (`V2-107`, V2-ADR-066/067/068): same single-target
 * auto-fire pipeline, tuned to one tenth of `starter-projectile`'s own Tier 1
 * damage and cooldown — the fastest, lightest identity in the family.
 */
export const NEEDLE_PROJECTILE: AbilityDefinition = Object.freeze({
  id: 'needle-projectile',
  code: 4,
  activation: 'auto',
  authoredTiers: 3,
  startEligible: false,
  tierEffects: Object.freeze([
    Object.freeze({
      ability: 'needle-projectile',
      damage: NEEDLE_PROJECTILE_DAMAGE_TIER_1,
      projectileRadius: NEEDLE_PROJECTILE_RADIUS_TIER_1,
      cooldownTicks: NEEDLE_PROJECTILE_COOLDOWN_TICKS_TIER_1,
    }),
    Object.freeze({
      ability: 'needle-projectile',
      damage: NEEDLE_PROJECTILE_DAMAGE_TIER_2,
      projectileRadius: NEEDLE_PROJECTILE_RADIUS_TIER_1,
      cooldownTicks: NEEDLE_PROJECTILE_COOLDOWN_TICKS_TIER_1,
    }),
    Object.freeze({
      ability: 'needle-projectile',
      damage: NEEDLE_PROJECTILE_DAMAGE_TIER_2,
      projectileRadius: NEEDLE_PROJECTILE_RADIUS_TIER_3,
      cooldownTicks: NEEDLE_PROJECTILE_COOLDOWN_TICKS_TIER_3,
    }),
  ]),
});

/**
 * A mid-run-only weapon (`V2-107`, V2-ADR-066/067/068): same single-target
 * auto-fire pipeline, tuned to one fifth of `starter-projectile`'s own Tier 1
 * damage and cooldown.
 */
export const FLICKER_PROJECTILE: AbilityDefinition = Object.freeze({
  id: 'flicker-projectile',
  code: 5,
  activation: 'auto',
  authoredTiers: 3,
  startEligible: false,
  tierEffects: Object.freeze([
    Object.freeze({
      ability: 'flicker-projectile',
      damage: FLICKER_PROJECTILE_DAMAGE_TIER_1,
      projectileRadius: FLICKER_PROJECTILE_RADIUS_TIER_1,
      cooldownTicks: FLICKER_PROJECTILE_COOLDOWN_TICKS_TIER_1,
    }),
    Object.freeze({
      ability: 'flicker-projectile',
      damage: FLICKER_PROJECTILE_DAMAGE_TIER_2,
      projectileRadius: FLICKER_PROJECTILE_RADIUS_TIER_1,
      cooldownTicks: FLICKER_PROJECTILE_COOLDOWN_TICKS_TIER_1,
    }),
    Object.freeze({
      ability: 'flicker-projectile',
      damage: FLICKER_PROJECTILE_DAMAGE_TIER_2,
      projectileRadius: FLICKER_PROJECTILE_RADIUS_TIER_3,
      cooldownTicks: FLICKER_PROJECTILE_COOLDOWN_TICKS_TIER_3,
    }),
  ]),
});

/**
 * A mid-run-only weapon (`V2-107`, V2-ADR-066/067/068): same single-target
 * auto-fire pipeline, tuned to one and a half times `starter-projectile`'s
 * own Tier 1 damage and cooldown.
 */
export const LANCE_PROJECTILE: AbilityDefinition = Object.freeze({
  id: 'lance-projectile',
  code: 6,
  activation: 'auto',
  authoredTiers: 3,
  startEligible: false,
  tierEffects: Object.freeze([
    Object.freeze({
      ability: 'lance-projectile',
      damage: LANCE_PROJECTILE_DAMAGE_TIER_1,
      projectileRadius: LANCE_PROJECTILE_RADIUS_TIER_1,
      cooldownTicks: LANCE_PROJECTILE_COOLDOWN_TICKS_TIER_1,
    }),
    Object.freeze({
      ability: 'lance-projectile',
      damage: LANCE_PROJECTILE_DAMAGE_TIER_2,
      projectileRadius: LANCE_PROJECTILE_RADIUS_TIER_1,
      cooldownTicks: LANCE_PROJECTILE_COOLDOWN_TICKS_TIER_1,
    }),
    Object.freeze({
      ability: 'lance-projectile',
      damage: LANCE_PROJECTILE_DAMAGE_TIER_2,
      projectileRadius: LANCE_PROJECTILE_RADIUS_TIER_3,
      cooldownTicks: LANCE_PROJECTILE_COOLDOWN_TICKS_TIER_3,
    }),
  ]),
});

/**
 * A mid-run-only weapon (`V2-107`, V2-ADR-066/067/068): same single-target
 * auto-fire pipeline, tuned to two and a half times `starter-projectile`'s
 * own Tier 1 damage and cooldown.
 */
export const CANNON_PROJECTILE: AbilityDefinition = Object.freeze({
  id: 'cannon-projectile',
  code: 7,
  activation: 'auto',
  authoredTiers: 3,
  startEligible: false,
  tierEffects: Object.freeze([
    Object.freeze({
      ability: 'cannon-projectile',
      damage: CANNON_PROJECTILE_DAMAGE_TIER_1,
      projectileRadius: CANNON_PROJECTILE_RADIUS_TIER_1,
      cooldownTicks: CANNON_PROJECTILE_COOLDOWN_TICKS_TIER_1,
    }),
    Object.freeze({
      ability: 'cannon-projectile',
      damage: CANNON_PROJECTILE_DAMAGE_TIER_2,
      projectileRadius: CANNON_PROJECTILE_RADIUS_TIER_1,
      cooldownTicks: CANNON_PROJECTILE_COOLDOWN_TICKS_TIER_1,
    }),
    Object.freeze({
      ability: 'cannon-projectile',
      damage: CANNON_PROJECTILE_DAMAGE_TIER_2,
      projectileRadius: CANNON_PROJECTILE_RADIUS_TIER_3,
      cooldownTicks: CANNON_PROJECTILE_COOLDOWN_TICKS_TIER_3,
    }),
  ]),
});

/**
 * A mid-run-only weapon (`V2-107`, V2-ADR-066/067/068): same single-target
 * auto-fire pipeline, tuned to four times `starter-projectile`'s own Tier 1
 * damage and cooldown — the slowest, heaviest identity in the family.
 */
export const SIEGE_PROJECTILE: AbilityDefinition = Object.freeze({
  id: 'siege-projectile',
  code: 8,
  activation: 'auto',
  authoredTiers: 3,
  startEligible: false,
  tierEffects: Object.freeze([
    Object.freeze({
      ability: 'siege-projectile',
      damage: SIEGE_PROJECTILE_DAMAGE_TIER_1,
      projectileRadius: SIEGE_PROJECTILE_RADIUS_TIER_1,
      cooldownTicks: SIEGE_PROJECTILE_COOLDOWN_TICKS_TIER_1,
    }),
    Object.freeze({
      ability: 'siege-projectile',
      damage: SIEGE_PROJECTILE_DAMAGE_TIER_2,
      projectileRadius: SIEGE_PROJECTILE_RADIUS_TIER_1,
      cooldownTicks: SIEGE_PROJECTILE_COOLDOWN_TICKS_TIER_1,
    }),
    Object.freeze({
      ability: 'siege-projectile',
      damage: SIEGE_PROJECTILE_DAMAGE_TIER_2,
      projectileRadius: SIEGE_PROJECTILE_RADIUS_TIER_3,
      cooldownTicks: SIEGE_PROJECTILE_COOLDOWN_TICKS_TIER_3,
    }),
  ]),
});

export const MVP1_ABILITY_REGISTRY = createAbilityRegistry([
  STARTER_PROJECTILE,
  HEAVY_PROJECTILE,
  RAPID_PROJECTILE,
  NEEDLE_PROJECTILE,
  FLICKER_PROJECTILE,
  LANCE_PROJECTILE,
  CANNON_PROJECTILE,
  SIEGE_PROJECTILE,
]);
