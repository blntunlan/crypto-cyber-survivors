import {
  RUNTIME_CHECKPOINT_SCHEMA_VERSION,
  type LifecycleSnapshot,
  type RuntimeCheckpoint,
} from '@/game-v2/contracts/RuntimeCheckpoint';
import {
  WORLD_SNAPSHOT_SCHEMA_VERSION,
  type WorldSnapshot,
} from '@/game-v2/contracts/WorldSnapshot';
import {
  RUN_IDENTITY_SCHEMA_VERSION,
  type RunIdentity,
} from '@/game-v2/contracts/RunIdentity';
import {
  RNG_SNAPSHOT_SCHEMA_VERSION,
  type RngSnapshot,
} from '@/game-v2/runtime/DeterministicRng';
import { type World } from '@/game-v2/world/World';
import { ALL_COMPONENT_MASK } from '@/game-v2/world/ComponentMask';
import { RETIRED_ENTITY_GENERATION } from '@/game-v2/contracts/EntityId';
import { MAX_WORLD_CAPACITY } from '@/game-v2/config/Mvp0Config';
import { type GameV2Phase } from '@/game-v2/contracts/GameV2Phase';

const UINT32_MAX = 0xffffffff;
const isGameV2Phase = (phase: unknown): phase is GameV2Phase => {
  switch (phase) {
    case 'idle':
    case 'playing':
    case 'level-up':
    case 'game-over':
    case 'disposed':
      return true;
    default:
      return false;
  }
};

export type RuntimeCheckpointInput = {
  world: World;
  tick: number;
  runIdentity: RunIdentity;
  rngSnapshot: RngSnapshot;
  lifecycle: LifecycleSnapshot;
  configVersion: number;
};

const assertUint32 = (value: number, name: string, allowZero = true): void => {
  if (
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < (allowZero ? 0 : 1) ||
    value > UINT32_MAX
  ) {
    throw new RangeError(`${name} must be a valid unsigned 32-bit integer`);
  }
};

const assertSchemaVersion = (value: unknown, expected: number, name: string): void => {
  if (value !== expected) {
    throw new RangeError(`${name} schema is unsupported`);
  }
};

const assertRuntimeAuthority = (input: RuntimeCheckpointInput): void => {
  assertUint32(input.tick, 'tick');
  assertUint32(input.configVersion, 'configVersion', false);
  assertUint32(input.lifecycle.sessionEpoch, 'sessionEpoch');

  if (!isGameV2Phase(input.lifecycle.phase)) {
    throw new RangeError('lifecycle phase is unsupported');
  }

  assertSchemaVersion(
    input.runIdentity.schemaVersion,
    RUN_IDENTITY_SCHEMA_VERSION,
    'run identity'
  );
  if (input.runIdentity.runId.trim().length === 0) {
    throw new TypeError('runId must be a non-empty string');
  }
  assertUint32(input.runIdentity.seed, 'run seed');

  assertSchemaVersion(
    input.rngSnapshot.schemaVersion,
    RNG_SNAPSHOT_SCHEMA_VERSION,
    'RNG snapshot'
  );
  assertUint32(input.rngSnapshot.state, 'RNG state', false);
};

const FLOAT32_STORES = [
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
  'weaponDamage',
  'xp',
  'xpPickupValue',
] as const;

const CAPACITY_STORES = [
  'masks',
  'generations',
  'x',
  'y',
  'previousX',
  'previousY',
  'velocityX',
  'velocityY',
  'radius',
  'health',
  'maxHealth',
  'faction',
  'moveSpeed',
  'lastFacingX',
  'lastFacingY',
  'dashDirectionX',
  'dashDirectionY',
  'dashRemainingSeconds',
  'invulnerabilityTicksRemaining',
  'dashCooldownTicksRemaining',
  'dashCharges',
  'movementOverride',
  'enemySpeed',
  'contactDamage',
  'contactCooldownTicksRemaining',
  'xpValue',
  'projectileDamage',
  'projectileLifetimeTicksRemaining',
  'weaponCooldownTicksRemaining',
  'weaponDamage',
  'xp',
  'level',
  'xpPickupValue',
] as const;

const assertWorld = (world: World): number => {
  const capacity = world.masks.length;
  assertUint32(capacity, 'world capacity', false);
  if (capacity > MAX_WORLD_CAPACITY) {
    throw new RangeError(
      `world capacity must be no greater than ${MAX_WORLD_CAPACITY}`
    );
  }

  for (const storeName of CAPACITY_STORES) {
    if (world[storeName].length !== capacity) {
      throw new RangeError(`${storeName} length must equal world capacity`);
    }
  }
  if (world.freeSlots.length !== capacity) {
    throw new RangeError('freeSlots length must equal world capacity');
  }

  assertUint32(world.activeCount, 'activeCount');
  assertUint32(world.freeSlotCount, 'freeSlotCount');
  if (world.activeCount > capacity || world.freeSlotCount > capacity) {
    throw new RangeError('allocator counts must not exceed world capacity');
  }

  let observedActiveCount = 0;
  let observedRetiredCount = 0;
  for (let slot = 0; slot < capacity; slot += 1) {
    const mask = world.masks[slot];
    const generation = world.generations[slot];
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
  if (observedActiveCount !== world.activeCount) {
    throw new RangeError('activeCount does not match component masks');
  }

  const freeSlotSeen = new Uint8Array(capacity);
  for (let index = 0; index < world.freeSlotCount; index += 1) {
    const slot = world.freeSlots[index];
    if (slot === undefined || slot >= capacity || freeSlotSeen[slot] !== 0) {
      throw new RangeError('free slot prefix is invalid');
    }
    if (world.masks[slot] !== 0) {
      throw new RangeError('active slot cannot appear in free slot prefix');
    }
    if (world.generations[slot] === RETIRED_ENTITY_GENERATION) {
      throw new RangeError('retired slot cannot appear in free slot prefix');
    }
    freeSlotSeen[slot] = 1;
  }

  for (let slot = 0; slot < capacity; slot += 1) {
    if (
      world.masks[slot] === 0 &&
      world.generations[slot] !== RETIRED_ENTITY_GENERATION &&
      freeSlotSeen[slot] === 0
    ) {
      throw new RangeError('allocator omitted a reusable slot from its free prefix');
    }
  }

  if (observedActiveCount + world.freeSlotCount + observedRetiredCount !== capacity) {
    throw new RangeError(
      'allocator partition must cover every world slot exactly once'
    );
  }

  for (const storeName of FLOAT32_STORES) {
    const store = world[storeName];
    for (let slot = 0; slot < capacity; slot += 1) {
      const value = store[slot];
      if (value === undefined || !Number.isFinite(value)) {
        throw new RangeError(`${storeName} must contain only finite values`);
      }
    }
  }

  return capacity;
};

const copyWorld = (world: World, capacity: number): WorldSnapshot => ({
  schemaVersion: WORLD_SNAPSHOT_SCHEMA_VERSION,
  capacity,
  activeCount: world.activeCount,
  freeSlotCount: world.freeSlotCount,
  freeSlots: world.freeSlots.slice(0, world.freeSlotCount),
  generations: world.generations.slice(),
  masks: world.masks.slice(),
  x: world.x.slice(),
  y: world.y.slice(),
  previousX: world.previousX.slice(),
  previousY: world.previousY.slice(),
  velocityX: world.velocityX.slice(),
  velocityY: world.velocityY.slice(),
  radius: world.radius.slice(),
  health: world.health.slice(),
  maxHealth: world.maxHealth.slice(),
  faction: world.faction.slice(),
  moveSpeed: world.moveSpeed.slice(),
  lastFacingX: world.lastFacingX.slice(),
  lastFacingY: world.lastFacingY.slice(),
  dashDirectionX: world.dashDirectionX.slice(),
  dashDirectionY: world.dashDirectionY.slice(),
  dashRemainingSeconds: world.dashRemainingSeconds.slice(),
  invulnerabilityTicksRemaining: world.invulnerabilityTicksRemaining.slice(),
  dashCooldownTicksRemaining: world.dashCooldownTicksRemaining.slice(),
  dashCharges: world.dashCharges.slice(),
  movementOverride: world.movementOverride.slice(),
  enemySpeed: world.enemySpeed.slice(),
  contactDamage: world.contactDamage.slice(),
  contactCooldownTicksRemaining: world.contactCooldownTicksRemaining.slice(),
  xpValue: world.xpValue.slice(),
  projectileDamage: world.projectileDamage.slice(),
  projectileLifetimeTicksRemaining: world.projectileLifetimeTicksRemaining.slice(),
  weaponCooldownTicksRemaining: world.weaponCooldownTicksRemaining.slice(),
  weaponDamage: world.weaponDamage.slice(),
  xp: world.xp.slice(),
  level: world.level.slice(),
  xpPickupValue: world.xpPickupValue.slice(),
});

export const writeCheckpoint = (input: RuntimeCheckpointInput): RuntimeCheckpoint => {
  assertRuntimeAuthority(input);
  const capacity = assertWorld(input.world);
  const world = copyWorld(input.world, capacity);

  return {
    schemaVersion: RUNTIME_CHECKPOINT_SCHEMA_VERSION,
    configVersion: input.configVersion,
    tick: input.tick,
    runIdentity: Object.freeze({ ...input.runIdentity }),
    rngSnapshot: Object.freeze({ ...input.rngSnapshot }),
    lifecycle: Object.freeze({ ...input.lifecycle }),
    world,
  };
};
