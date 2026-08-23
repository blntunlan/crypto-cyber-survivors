import { assertAbilityTierEffect } from '@/game-v2/contracts/AbilityTierEffect';
import {
  MAX_ABILITY_CODE,
  isAbilityActivation,
  isAbilityTier,
  type AbilityDefinition,
  type AbilityIdentityId,
} from '@/game-v2/contracts/AbilitySlot';
import {
  PROJECTILE_DAMAGE,
  PROJECTILE_RADIUS,
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
    const { id, code, activation, authoredTiers, tierEffects } = candidate;

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
    });
    byId.set(id, frozen);
    byCode.set(code, frozen);
  }

  return Object.freeze({
    size: byId.size,
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

export const MVP1_ABILITY_REGISTRY = createAbilityRegistry([STARTER_PROJECTILE]);
