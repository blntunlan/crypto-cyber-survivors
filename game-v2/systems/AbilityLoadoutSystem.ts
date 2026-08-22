import {
  MVP1_ABILITY_REGISTRY,
  type AbilityRegistry,
} from '@/game-v2/config/AbilityRegistry';
import {
  ABILITY_SLOT_COUNT,
  isAbilitySlotIndex,
  type AbilityActivation,
  type AbilityIdentityId,
  type AbilitySlotIndex,
  type AbilityTier,
} from '@/game-v2/contracts/AbilitySlot';
import { type EntityId } from '@/game-v2/contracts/EntityId';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { type World } from '@/game-v2/world/World';

const LOADOUT_MASK = ComponentMask.AbilityLoadout;

/**
 * The single writer of ability slot occupancy, activation, and tier.
 *
 * The system holds no per-run state: everything it reads and writes lives in
 * `World`, which `RuntimeCheckpoint` already carries, so a checkpoint restore
 * reproduces a build exactly and a reset clears it (V2-ADR-025, V2-ADR-036).
 * Every read path is allocation-free and safe to call per tick.
 */
export class AbilityLoadoutSystem {
  private readonly registry: AbilityRegistry;

  public constructor(registry: AbilityRegistry = MVP1_ABILITY_REGISTRY) {
    this.registry = registry;
  }

  public occupiedCount(world: World, owner: EntityId): number {
    const base = this.baseIndex(world, owner);
    let count = 0;

    for (let index = 0; index < ABILITY_SLOT_COUNT; index += 1) {
      if ((world.abilitySlotIdentity[base + index] ?? 0) !== 0) {
        count += 1;
      }
    }

    return count;
  }

  /**
   * Places an identity in the lowest free slot and returns that index.
   *
   * Throws instead of replacing an occupied slot: §5.1 forbids a new ability
   * silently consuming a slot, and the post-boss replacement in V2-310 is the
   * only path that may remove one.
   */
  public add(
    world: World,
    owner: EntityId,
    identity: AbilityIdentityId
  ): AbilitySlotIndex {
    const base = this.baseIndex(world, owner);
    const definition = this.registry.byId(identity);

    let free = -1;
    for (let index = 0; index < ABILITY_SLOT_COUNT; index += 1) {
      const code = world.abilitySlotIdentity[base + index] ?? 0;

      if (code === definition.code) {
        throw new RangeError('ability identity already occupies a slot');
      }

      if (code === 0 && free === -1) {
        free = index;
      }
    }

    if (free === -1) {
      throw new RangeError('ability loadout has no free slot');
    }

    world.abilitySlotIdentity[base + free] = definition.code;
    world.abilitySlotTier[base + free] = 1;

    return free as AbilitySlotIndex;
  }

  public remove(world: World, owner: EntityId, index: AbilitySlotIndex): void {
    const storeIndex = this.storeIndex(world, owner, index);

    if ((world.abilitySlotIdentity[storeIndex] ?? 0) === 0) {
      throw new RangeError('ability slot is already empty');
    }

    world.abilitySlotIdentity[storeIndex] = 0;
    world.abilitySlotTier[storeIndex] = 0;
  }

  /**
   * Advances one slot to its next tier and returns it.
   *
   * The ceiling is the identity's `authoredTiers`, not the universal maximum:
   * an ability may not reach a tier whose effects no block has authored yet
   * (V2-ADR-038).
   */
  public advanceTier(
    world: World,
    owner: EntityId,
    index: AbilitySlotIndex
  ): AbilityTier {
    const storeIndex = this.storeIndex(world, owner, index);
    const code = world.abilitySlotIdentity[storeIndex] ?? 0;

    if (code === 0) {
      throw new RangeError('ability slot is empty');
    }

    const definition = this.registry.byCode(code);

    if (definition === null) {
      throw new RangeError('ability slot holds the reserved empty code');
    }

    const tier = world.abilitySlotTier[storeIndex] ?? 0;

    if (tier >= definition.authoredTiers) {
      throw new RangeError(`ability has no authored tier above ${tier}`);
    }

    const next = (tier + 1) as AbilityTier;
    world.abilitySlotTier[storeIndex] = next;

    return next;
  }

  public resetOwner(world: World, owner: EntityId): void {
    const base = this.baseIndex(world, owner);

    for (let index = 0; index < ABILITY_SLOT_COUNT; index += 1) {
      world.abilitySlotIdentity[base + index] = 0;
      world.abilitySlotTier[base + index] = 0;
    }
  }

  public identityAt(
    world: World,
    owner: EntityId,
    index: AbilitySlotIndex
  ): AbilityIdentityId | null {
    const definition = this.registry.byCode(
      world.abilitySlotIdentity[this.storeIndex(world, owner, index)] ?? 0
    );

    return definition === null ? null : definition.id;
  }

  public activationAt(
    world: World,
    owner: EntityId,
    index: AbilitySlotIndex
  ): AbilityActivation | null {
    const definition = this.registry.byCode(
      world.abilitySlotIdentity[this.storeIndex(world, owner, index)] ?? 0
    );

    return definition === null ? null : definition.activation;
  }

  public tierAt(
    world: World,
    owner: EntityId,
    index: AbilitySlotIndex
  ): AbilityTier | null {
    const storeIndex = this.storeIndex(world, owner, index);

    if ((world.abilitySlotIdentity[storeIndex] ?? 0) === 0) {
      return null;
    }

    const tier = world.abilitySlotTier[storeIndex] ?? 0;

    if (tier < 1) {
      throw new RangeError('occupied ability slot must carry a tier');
    }

    return tier as AbilityTier;
  }

  public indexOf(
    world: World,
    owner: EntityId,
    identity: AbilityIdentityId
  ): AbilitySlotIndex | null {
    const base = this.baseIndex(world, owner);
    const definition = this.registry.byId(identity);

    for (let index = 0; index < ABILITY_SLOT_COUNT; index += 1) {
      if ((world.abilitySlotIdentity[base + index] ?? 0) === definition.code) {
        return index as AbilitySlotIndex;
      }
    }

    return null;
  }

  private baseIndex(world: World, owner: EntityId): number {
    const slot = world.slotOf(owner);
    const mask = world.masks[slot];

    if (mask === undefined || (mask & LOADOUT_MASK) !== LOADOUT_MASK) {
      throw new RangeError('entity does not own an ability loadout');
    }

    return world.abilitySlotIndexOf(slot, 0);
  }

  private storeIndex(world: World, owner: EntityId, index: number): number {
    if (!isAbilitySlotIndex(index)) {
      throw new RangeError('ability slot index must be an integer inside the loadout');
    }

    return this.baseIndex(world, owner) + index;
  }
}
