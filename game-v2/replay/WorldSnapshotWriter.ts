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
import { type GameV2Phase } from '@/game-v2/contracts/GameV2Phase';
import { validateAuthoritativeWorldState } from '@/game-v2/replay/WorldStateValidator';

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

const assertWorld = (world: World): number => {
  const capacity = world.masks.length;
  validateAuthoritativeWorldState(world, capacity);
  if (world.freeSlots.length !== capacity) {
    throw new RangeError('freeSlots length must equal world capacity');
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
  xp: world.xp.slice(),
  level: world.level.slice(),
  xpPickupValue: world.xpPickupValue.slice(),
  abilitySlotIdentity: world.abilitySlotIdentity.slice(),
  abilitySlotTier: world.abilitySlotTier.slice(),
  passiveSlotIdentity: world.passiveSlotIdentity.slice(),
  passiveSlotLevel: world.passiveSlotLevel.slice(),
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
