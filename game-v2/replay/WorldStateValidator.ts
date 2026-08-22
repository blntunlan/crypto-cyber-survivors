import { MAX_WORLD_CAPACITY } from '@/game-v2/config/Mvp0Config';
import {
  ABILITY_MAX_TIER,
  ABILITY_SLOT_COUNT,
  abilityStoreIndex,
} from '@/game-v2/contracts/AbilitySlot';
import { RETIRED_ENTITY_GENERATION } from '@/game-v2/contracts/EntityId';
import { type WorldSnapshot } from '@/game-v2/contracts/WorldSnapshot';
import { ALL_COMPONENT_MASK, ComponentMask } from '@/game-v2/world/ComponentMask';

const UINT32_MAX = 0xffffffff;

export type AuthoritativeWorldState = Omit<WorldSnapshot, 'schemaVersion' | 'capacity'>;

type AllocatorField = 'activeCount' | 'freeSlotCount' | 'freeSlots';
type AuthoritativeStoreName = Exclude<keyof AuthoritativeWorldState, AllocatorField>;

export const AUTHORITATIVE_WORLD_STORE_SCHEMA = Object.freeze({
  float32: Object.freeze([
    'x',
    'y',
    'previousX',
    'previousY',
    'velocityX',
    'velocityY',
    'radius',
    'health',
    'maxHealth',
    'moveSpeed',
    'lastFacingX',
    'lastFacingY',
    'dashDirectionX',
    'dashDirectionY',
    'dashRemainingSeconds',
    'enemySpeed',
    'contactDamage',
    'xpValue',
    'projectileDamage',
    'xp',
    'xpPickupValue',
  ] as const satisfies ReadonlyArray<AuthoritativeStoreName>),
  uint32: Object.freeze([
    'generations',
    'masks',
  ] as const satisfies ReadonlyArray<AuthoritativeStoreName>),
  int8: Object.freeze([
    'faction',
  ] as const satisfies ReadonlyArray<AuthoritativeStoreName>),
  uint8: Object.freeze([
    'dashCharges',
    'movementOverride',
  ] as const satisfies ReadonlyArray<AuthoritativeStoreName>),
  uint16: Object.freeze([
    'invulnerabilityTicksRemaining',
    'dashCooldownTicksRemaining',
    'contactCooldownTicksRemaining',
    'projectileLifetimeTicksRemaining',
    'weaponCooldownTicksRemaining',
    'level',
  ] as const satisfies ReadonlyArray<AuthoritativeStoreName>),
  /** One entry per ability slot per world slot rather than one per world slot. */
  stridedUint8: Object.freeze([
    'abilitySlotIdentity',
    'abilitySlotTier',
  ] as const satisfies ReadonlyArray<AuthoritativeStoreName>),
});

type ListedStoreName =
  | (typeof AUTHORITATIVE_WORLD_STORE_SCHEMA.float32)[number]
  | (typeof AUTHORITATIVE_WORLD_STORE_SCHEMA.uint32)[number]
  | (typeof AUTHORITATIVE_WORLD_STORE_SCHEMA.int8)[number]
  | (typeof AUTHORITATIVE_WORLD_STORE_SCHEMA.uint8)[number]
  | (typeof AUTHORITATIVE_WORLD_STORE_SCHEMA.uint16)[number]
  | (typeof AUTHORITATIVE_WORLD_STORE_SCHEMA.stridedUint8)[number];
type AssertNever<T extends never> = T;
export type AuthoritativeWorldStoreSchemaCoverage = AssertNever<
  Exclude<AuthoritativeStoreName, ListedStoreName>
>;

const assertUint32 = (value: unknown, name: string, allowZero = true): number => {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < (allowZero ? 0 : 1) ||
    value > UINT32_MAX
  ) {
    throw new RangeError(`${name} must be a valid unsigned 32-bit integer`);
  }
  return value;
};

type WorldTypedArray =
  | Float32Array
  | Uint32Array
  | Int8Array
  | Uint8Array
  | Uint16Array;
type WorldTypedArrayConstructor = abstract new (length: number) => WorldTypedArray;

const assertStore = (
  value: unknown,
  constructor: WorldTypedArrayConstructor,
  capacity: number,
  name: string
): void => {
  if (!(value instanceof constructor) || value.length !== capacity) {
    throw new RangeError(`${name} must be a canonical typed store`);
  }
};

const validateStores = (state: AuthoritativeWorldState, capacity: number): void => {
  for (const name of AUTHORITATIVE_WORLD_STORE_SCHEMA.float32) {
    const store = state[name];
    assertStore(store, Float32Array, capacity, name);
    for (let slot = 0; slot < capacity; slot += 1) {
      const value = store[slot];
      if (value === undefined || !Number.isFinite(value)) {
        throw new RangeError(`${name} must contain only finite values`);
      }
    }
  }
  for (const name of AUTHORITATIVE_WORLD_STORE_SCHEMA.uint32) {
    assertStore(state[name], Uint32Array, capacity, name);
  }
  for (const name of AUTHORITATIVE_WORLD_STORE_SCHEMA.int8) {
    assertStore(state[name], Int8Array, capacity, name);
  }
  for (const name of AUTHORITATIVE_WORLD_STORE_SCHEMA.uint8) {
    assertStore(state[name], Uint8Array, capacity, name);
  }
  for (const name of AUTHORITATIVE_WORLD_STORE_SCHEMA.uint16) {
    assertStore(state[name], Uint16Array, capacity, name);
  }
  for (const name of AUTHORITATIVE_WORLD_STORE_SCHEMA.stridedUint8) {
    assertStore(state[name], Uint8Array, capacity * ABILITY_SLOT_COUNT, name);
  }
};

/**
 * Ability loadout state is validated without consulting the registry: a
 * checkpoint must stay readable when V2-106 and V2-107 add identities, so the
 * invariants here are the structural ones only (V2-ADR-036, V2-ADR-037).
 */
const validateAbilityLoadout = (
  state: AuthoritativeWorldState,
  capacity: number
): void => {
  for (let slot = 0; slot < capacity; slot += 1) {
    const mask = state.masks[slot] ?? 0;
    const ownsLoadout = (mask & ComponentMask.AbilityLoadout) !== 0;

    for (let index = 0; index < ABILITY_SLOT_COUNT; index += 1) {
      const storeIndex = abilityStoreIndex(slot, index);
      const identity = state.abilitySlotIdentity[storeIndex] ?? 0;
      const tier = state.abilitySlotTier[storeIndex] ?? 0;

      if (tier > ABILITY_MAX_TIER) {
        throw new RangeError('ability slot tier is outside the supported range');
      }

      if ((identity === 0) !== (tier === 0)) {
        throw new RangeError('ability slot must pair an identity with a tier');
      }

      if (identity !== 0 && !ownsLoadout) {
        throw new RangeError('ability loadout requires the AbilityLoadout component');
      }
    }
  }
};

export const validateAuthoritativeWorldState = (
  state: AuthoritativeWorldState,
  candidateCapacity: number
): void => {
  const capacity = assertUint32(candidateCapacity, 'world capacity', false);
  if (capacity > MAX_WORLD_CAPACITY) {
    throw new RangeError(
      `world capacity must be no greater than ${MAX_WORLD_CAPACITY}`
    );
  }

  validateStores(state, capacity);
  if (!(state.freeSlots instanceof Uint16Array)) {
    throw new RangeError('freeSlots must be a canonical typed store');
  }

  const activeCount = assertUint32(state.activeCount, 'activeCount');
  const freeSlotCount = assertUint32(state.freeSlotCount, 'freeSlotCount');
  if (
    activeCount > capacity ||
    freeSlotCount > capacity ||
    state.freeSlots.length < freeSlotCount
  ) {
    throw new RangeError('allocator counts must fit canonical storage');
  }

  let observedActiveCount = 0;
  let observedRetiredCount = 0;
  for (let slot = 0; slot < capacity; slot += 1) {
    const mask = state.masks[slot];
    const generation = state.generations[slot];
    if (mask === undefined || (mask & ~ALL_COMPONENT_MASK) !== 0) {
      throw new RangeError('world contains an unsupported component mask');
    }
    if (mask !== 0) {
      if (generation === RETIRED_ENTITY_GENERATION) {
        throw new RangeError('active slot cannot use the retired generation');
      }
      observedActiveCount += 1;
    } else if (generation === RETIRED_ENTITY_GENERATION) {
      observedRetiredCount += 1;
    }
  }
  if (observedActiveCount !== activeCount) {
    throw new RangeError('activeCount does not match component masks');
  }

  const freeSlotSeen = new Uint8Array(capacity);
  for (let index = 0; index < freeSlotCount; index += 1) {
    const slot = state.freeSlots[index];
    if (slot === undefined || slot >= capacity || freeSlotSeen[slot] !== 0) {
      throw new RangeError('free slot prefix is invalid');
    }
    if (state.masks[slot] !== 0) {
      throw new RangeError('active slot cannot appear in free slot prefix');
    }
    if (state.generations[slot] === RETIRED_ENTITY_GENERATION) {
      throw new RangeError('retired slot cannot appear in free slot prefix');
    }
    freeSlotSeen[slot] = 1;
  }

  for (let slot = 0; slot < capacity; slot += 1) {
    if (
      state.masks[slot] === 0 &&
      state.generations[slot] !== RETIRED_ENTITY_GENERATION &&
      freeSlotSeen[slot] === 0
    ) {
      throw new RangeError('allocator omitted a reusable slot from its free prefix');
    }
  }
  if (observedActiveCount + freeSlotCount + observedRetiredCount !== capacity) {
    throw new RangeError(
      'allocator partition must cover every world slot exactly once'
    );
  }

  validateAbilityLoadout(state, capacity);
};
