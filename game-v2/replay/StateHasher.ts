import {
  RUNTIME_CHECKPOINT_SCHEMA_VERSION,
  type RuntimeCheckpoint,
} from '@/game-v2/contracts/RuntimeCheckpoint';
import {
  WORLD_SNAPSHOT_SCHEMA_VERSION,
  type WorldSnapshot,
} from '@/game-v2/contracts/WorldSnapshot';
import { RUN_IDENTITY_SCHEMA_VERSION } from '@/game-v2/contracts/RunIdentity';
import { RNG_SNAPSHOT_SCHEMA_VERSION } from '@/game-v2/runtime/DeterministicRng';
import { validateAuthoritativeWorldState } from '@/game-v2/replay/WorldStateValidator';

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const UINT32_MAX = 0xffffffff;
const PHASE_CODE = {
  idle: 0,
  playing: 1,
  'level-up': 2,
  'game-over': 3,
  disposed: 4,
} as const;

// Canonical bytes use raw u8/i8, little-endian u16/u32/IEEE-754 f32, and
// u32-length-prefixed UTF-8 strings. Field order is fixed in hashWorld and below.
class BinaryFnv1a {
  private hash = FNV_OFFSET_BASIS;
  private readonly scratch = new ArrayBuffer(4);
  private readonly view = new DataView(this.scratch);
  private readonly bytes = new Uint8Array(this.scratch);
  private readonly textEncoder = new TextEncoder();

  public u8(value: number): void {
    this.byte(value);
  }

  public i8(value: number): void {
    this.view.setInt8(0, value);
    this.byte(this.bytes[0] ?? 0);
  }

  public u16(value: number): void {
    this.view.setUint16(0, value, true);
    this.consume(2);
  }

  public u32(value: number): void {
    this.view.setUint32(0, value, true);
    this.consume(4);
  }

  public f32(value: number): void {
    this.view.setFloat32(0, value, true);
    this.consume(4);
  }

  public string(value: string): void {
    const encoded = this.textEncoder.encode(value);
    this.u32(encoded.length);
    for (let index = 0; index < encoded.length; index += 1) {
      this.byte(encoded[index] ?? 0);
    }
  }

  public digest(): string {
    return (this.hash >>> 0).toString(16).padStart(8, '0');
  }

  private consume(length: number): void {
    for (let index = 0; index < length; index += 1) {
      this.byte(this.bytes[index] ?? 0);
    }
  }

  private byte(value: number): void {
    this.hash = Math.imul((this.hash ^ value) >>> 0, FNV_PRIME) >>> 0;
  }
}

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

const assertSchemaVersion = (value: unknown, expected: number, name: string): void => {
  if (value !== expected) {
    throw new RangeError(`${name} schema is unsupported`);
  }
};

const validateWorld = (world: WorldSnapshot): void => {
  assertSchemaVersion(
    world.schemaVersion,
    WORLD_SNAPSHOT_SCHEMA_VERSION,
    'world snapshot'
  );
  validateAuthoritativeWorldState(world, world.capacity);
  if (world.freeSlots.length !== world.freeSlotCount) {
    throw new RangeError('freeSlots length must equal freeSlotCount');
  }
};

const validateCheckpoint = (checkpoint: RuntimeCheckpoint): void => {
  assertSchemaVersion(
    checkpoint.schemaVersion,
    RUNTIME_CHECKPOINT_SCHEMA_VERSION,
    'runtime checkpoint'
  );
  assertUint32(checkpoint.configVersion, 'configVersion', false);
  assertUint32(checkpoint.tick, 'tick');
  assertSchemaVersion(
    checkpoint.runIdentity.schemaVersion,
    RUN_IDENTITY_SCHEMA_VERSION,
    'run identity'
  );
  if (
    typeof checkpoint.runIdentity.runId !== 'string' ||
    checkpoint.runIdentity.runId.trim().length === 0
  ) {
    throw new TypeError('runId must be a non-empty string');
  }
  assertUint32(checkpoint.runIdentity.seed, 'run seed');
  assertSchemaVersion(
    checkpoint.rngSnapshot.schemaVersion,
    RNG_SNAPSHOT_SCHEMA_VERSION,
    'RNG snapshot'
  );
  assertUint32(checkpoint.rngSnapshot.state, 'RNG state', false);
  if (!Object.hasOwn(PHASE_CODE, checkpoint.lifecycle.phase)) {
    throw new RangeError('lifecycle phase is unsupported');
  }
  assertUint32(checkpoint.lifecycle.sessionEpoch, 'sessionEpoch');
  validateWorld(checkpoint.world);
};

const hashWorld = (hash: BinaryFnv1a, world: WorldSnapshot): void => {
  hash.u32(world.schemaVersion);
  hash.u32(world.capacity);
  hash.u32(world.activeCount);
  hash.u32(world.freeSlotCount);
  for (let index = 0; index < world.freeSlotCount; index += 1) {
    hash.u16(world.freeSlots[index] ?? 0);
  }

  for (let slot = 0; slot < world.capacity; slot += 1) {
    hash.u32(world.generations[slot] ?? 0);
    hash.u32(world.masks[slot] ?? 0);
    hash.f32(world.x[slot] ?? 0);
    hash.f32(world.y[slot] ?? 0);
    hash.f32(world.previousX[slot] ?? 0);
    hash.f32(world.previousY[slot] ?? 0);
    hash.f32(world.velocityX[slot] ?? 0);
    hash.f32(world.velocityY[slot] ?? 0);
    hash.f32(world.radius[slot] ?? 0);
    hash.f32(world.health[slot] ?? 0);
    hash.f32(world.maxHealth[slot] ?? 0);
    hash.i8(world.faction[slot] ?? 0);
    hash.f32(world.moveSpeed[slot] ?? 0);
    hash.f32(world.lastFacingX[slot] ?? 0);
    hash.f32(world.lastFacingY[slot] ?? 0);
    hash.f32(world.dashDirectionX[slot] ?? 0);
    hash.f32(world.dashDirectionY[slot] ?? 0);
    hash.f32(world.dashRemainingSeconds[slot] ?? 0);
    hash.u16(world.invulnerabilityTicksRemaining[slot] ?? 0);
    hash.u16(world.dashCooldownTicksRemaining[slot] ?? 0);
    hash.u8(world.dashCharges[slot] ?? 0);
    hash.u8(world.movementOverride[slot] ?? 0);
    hash.f32(world.enemySpeed[slot] ?? 0);
    hash.f32(world.contactDamage[slot] ?? 0);
    hash.u16(world.contactCooldownTicksRemaining[slot] ?? 0);
    hash.f32(world.xpValue[slot] ?? 0);
    hash.f32(world.projectileDamage[slot] ?? 0);
    hash.u16(world.projectileLifetimeTicksRemaining[slot] ?? 0);
    hash.u16(world.weaponCooldownTicksRemaining[slot] ?? 0);
    hash.f32(world.weaponDamage[slot] ?? 0);
    hash.f32(world.xp[slot] ?? 0);
    hash.u16(world.level[slot] ?? 0);
    hash.f32(world.xpPickupValue[slot] ?? 0);
  }
};

export const hashRuntimeCheckpoint = (checkpoint: RuntimeCheckpoint): string => {
  validateCheckpoint(checkpoint);

  const hash = new BinaryFnv1a();
  hash.u32(checkpoint.schemaVersion);
  hash.u32(checkpoint.configVersion);
  hash.u32(checkpoint.tick);
  hash.u32(checkpoint.runIdentity.schemaVersion);
  hash.string(checkpoint.runIdentity.runId);
  hash.u32(checkpoint.runIdentity.seed);
  hash.u32(checkpoint.rngSnapshot.schemaVersion);
  hash.u32(checkpoint.rngSnapshot.state);
  hash.u8(PHASE_CODE[checkpoint.lifecycle.phase]);
  hash.u32(checkpoint.lifecycle.sessionEpoch);
  hashWorld(hash, checkpoint.world);
  return hash.digest();
};
