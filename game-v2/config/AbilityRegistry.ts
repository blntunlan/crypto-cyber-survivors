import {
  MAX_ABILITY_CODE,
  isAbilityActivation,
  isAbilityTier,
  type AbilityDefinition,
  type AbilityIdentityId,
} from '@/game-v2/contracts/AbilitySlot';

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
    const { id, code, activation, authoredTiers } = candidate;

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
    if (byId.has(id)) {
      throw new RangeError('ability registry contains a duplicate identity');
    }
    if (byCode.has(code)) {
      throw new RangeError('ability registry contains a duplicate code');
    }

    const frozen = Object.freeze({ id, code, activation, authoredTiers });
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
 * `AUTO`, and only its first two tiers have authored damage: tier 3 belongs to
 * V2-102 and must not be reachable before then (V2-ADR-038).
 */
export const STARTER_PROJECTILE: AbilityDefinition = Object.freeze({
  id: 'starter-projectile',
  code: 1,
  activation: 'auto',
  authoredTiers: 2,
});

export const MVP1_ABILITY_REGISTRY = createAbilityRegistry([STARTER_PROJECTILE]);
