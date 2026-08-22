import {
  MAX_PASSIVE_CODE,
  PASSIVE_MAX_LEVEL,
  isPassiveLevel,
  type PassiveDefinition,
  type PassiveIdentityId,
} from '@/game-v2/contracts/PassiveSlot';

/**
 * A validated set of passive definitions.
 *
 * As with the ability registry, this is a value rather than a module-level table
 * so tests can fill all six slots before V2-401 authors the real identities
 * (V2-ADR-039).
 */
export type PassiveRegistry = Readonly<{
  size: number;
  /** Throws `RangeError` for an identity the registry does not define. */
  byId: (id: PassiveIdentityId) => PassiveDefinition;
  /** Returns `null` for the reserved empty code and throws for an unknown one. */
  byCode: (code: number) => PassiveDefinition | null;
}>;

export const createPassiveRegistry = (
  definitions: readonly PassiveDefinition[]
): PassiveRegistry => {
  if (definitions.length === 0) {
    throw new RangeError('passive registry requires at least one definition');
  }

  const byId = new Map<PassiveIdentityId, PassiveDefinition>();
  const byCode = new Map<number, PassiveDefinition>();

  for (const candidate of definitions) {
    const { id, code, authoredLevels } = candidate;

    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new TypeError('passive identity must be a non-empty string');
    }
    if (!Number.isInteger(code) || code < 1 || code > MAX_PASSIVE_CODE) {
      throw new RangeError(
        `passive code must be an integer inside 1..${MAX_PASSIVE_CODE}`
      );
    }
    if (!isPassiveLevel(authoredLevels)) {
      throw new RangeError(
        `authored level count must be an integer inside 1..${PASSIVE_MAX_LEVEL}`
      );
    }
    if (byId.has(id)) {
      throw new RangeError('passive registry contains a duplicate identity');
    }
    if (byCode.has(code)) {
      throw new RangeError('passive registry contains a duplicate code');
    }

    const frozen = Object.freeze({ id, code, authoredLevels });
    byId.set(id, frozen);
    byCode.set(code, frozen);
  }

  return Object.freeze({
    size: byId.size,
    byId: (id: PassiveIdentityId): PassiveDefinition => {
      const definition = byId.get(id);
      if (definition === undefined) {
        throw new RangeError('unknown passive identity');
      }
      return definition;
    },
    byCode: (code: number): PassiveDefinition | null => {
      if (code === 0) {
        return null;
      }
      const definition = byCode.get(code);
      if (definition === undefined) {
        throw new RangeError('unknown passive code');
      }
      return definition;
    },
  });
};

/**
 * The first passive identity. All five of its levels are authored by
 * `PASSIVE_MOVE_SPEED_BY_LEVEL`, so nothing here is reachable before its effect
 * exists (V2-ADR-024).
 */
export const MOVE_SPEED_PASSIVE: PassiveDefinition = Object.freeze({
  id: 'move-speed',
  code: 1,
  authoredLevels: PASSIVE_MAX_LEVEL,
});

export const MVP1_PASSIVE_REGISTRY = createPassiveRegistry([MOVE_SPEED_PASSIVE]);
