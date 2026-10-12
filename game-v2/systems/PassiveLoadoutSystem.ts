import {
  MVP1_PASSIVE_REGISTRY,
  type PassiveRegistry,
} from '@/game-v2/config/PassiveRegistry';
import { type EntityId } from '@/game-v2/contracts/EntityId';
import {
  PASSIVE_SLOT_COUNT,
  isPassiveSlotIndex,
  type PassiveIdentityId,
  type PassiveLevel,
  type PassiveSlotIndex,
} from '@/game-v2/contracts/PassiveSlot';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { type World } from '@/game-v2/world/World';

const LOADOUT_MASK = ComponentMask.PassiveLoadout;

/**
 * The single writer of passive-slot occupancy and level.
 *
 * Like `AbilityLoadoutSystem` it holds no per-run state: `World` is
 * authoritative, so a checkpoint restore reproduces the build and `World.reset`
 * clears it (V2-ADR-025, V2-ADR-040). Every read path is allocation-free.
 */
export class PassiveLoadoutSystem {
  private readonly registry: PassiveRegistry;

  public constructor(registry: PassiveRegistry = MVP1_PASSIVE_REGISTRY) {
    this.registry = registry;
  }

  public occupiedCount(world: World, owner: EntityId): number {
    const base = this.baseIndex(world, owner);
    let count = 0;

    for (let index = 0; index < PASSIVE_SLOT_COUNT; index += 1) {
      if ((world.passiveSlotIdentity[base + index] ?? 0) !== 0) {
        count += 1;
      }
    }

    return count;
  }

  /**
   * Levels a held passive in place, or places a new one in the lowest free slot
   * at level 1, and returns the resulting level.
   *
   * A held identity never consumes a second slot, and a seventh identity throws
   * rather than replacing one: §5.3 stops offering new identities when all six
   * slots are occupied, but upgrades to held passives stay legal.
   */
  public addOrLevelUp(
    world: World,
    owner: EntityId,
    identity: PassiveIdentityId
  ): PassiveLevel {
    const base = this.baseIndex(world, owner);
    const definition = this.registry.byId(identity);

    let free = -1;

    for (let index = 0; index < PASSIVE_SLOT_COUNT; index += 1) {
      const code = world.passiveSlotIdentity[base + index] ?? 0;

      if (code === definition.code) {
        const level = world.passiveSlotLevel[base + index] ?? 0;

        if (level >= definition.authoredLevels) {
          throw new RangeError(`passive has no authored level above ${level}`);
        }

        const next = (level + 1) as PassiveLevel;
        world.passiveSlotLevel[base + index] = next;

        return next;
      }

      if (code === 0 && free === -1) {
        free = index;
      }
    }

    if (free === -1) {
      throw new RangeError('passive loadout has no free slot');
    }

    world.passiveSlotIdentity[base + free] = definition.code;
    world.passiveSlotLevel[base + free] = 1;

    return 1;
  }

  /**
   * Whether an offer of this identity could be taken right now.
   *
   * A held identity is offerable while it is below its authored ceiling; a new
   * identity only while a slot is free (§5.3).
   */
  public isOfferable(
    world: World,
    owner: EntityId,
    identity: PassiveIdentityId
  ): boolean {
    const base = this.baseIndex(world, owner);
    const definition = this.registry.byId(identity);
    let free = false;

    for (let index = 0; index < PASSIVE_SLOT_COUNT; index += 1) {
      const code = world.passiveSlotIdentity[base + index] ?? 0;

      if (code === definition.code) {
        return (world.passiveSlotLevel[base + index] ?? 0) < definition.authoredLevels;
      }

      if (code === 0) {
        free = true;
      }
    }

    return free;
  }

  public levelOf(
    world: World,
    owner: EntityId,
    identity: PassiveIdentityId
  ): PassiveLevel | null {
    const base = this.baseIndex(world, owner);
    const definition = this.registry.byId(identity);

    for (let index = 0; index < PASSIVE_SLOT_COUNT; index += 1) {
      if ((world.passiveSlotIdentity[base + index] ?? 0) === definition.code) {
        return this.readLevel(world, base + index);
      }
    }

    return null;
  }

  public identityAt(
    world: World,
    owner: EntityId,
    index: PassiveSlotIndex
  ): PassiveIdentityId | null {
    const definition = this.registry.byCode(
      world.passiveSlotIdentity[this.storeIndex(world, owner, index)] ?? 0
    );

    return definition === null ? null : definition.id;
  }

  public levelAt(
    world: World,
    owner: EntityId,
    index: PassiveSlotIndex
  ): PassiveLevel | null {
    const storeIndex = this.storeIndex(world, owner, index);

    if ((world.passiveSlotIdentity[storeIndex] ?? 0) === 0) {
      return null;
    }

    return this.readLevel(world, storeIndex);
  }

  public resetOwner(world: World, owner: EntityId): void {
    const base = this.baseIndex(world, owner);

    for (let index = 0; index < PASSIVE_SLOT_COUNT; index += 1) {
      world.passiveSlotIdentity[base + index] = 0;
      world.passiveSlotLevel[base + index] = 0;
    }
  }

  private readLevel(world: World, storeIndex: number): PassiveLevel {
    const level = world.passiveSlotLevel[storeIndex] ?? 0;

    if (level < 1) {
      throw new RangeError('occupied passive slot must carry a level');
    }

    return level as PassiveLevel;
  }

  private baseIndex(world: World, owner: EntityId): number {
    const slot = world.slotOf(owner);
    const mask = world.masks[slot];

    if (mask === undefined || (mask & LOADOUT_MASK) !== LOADOUT_MASK) {
      throw new RangeError('entity does not own a passive loadout');
    }

    return world.passiveSlotIndexOf(slot, 0);
  }

  private storeIndex(world: World, owner: EntityId, index: number): number {
    if (!isPassiveSlotIndex(index)) {
      throw new RangeError('passive slot index must be an integer inside the loadout');
    }

    return this.baseIndex(world, owner) + index;
  }
}
