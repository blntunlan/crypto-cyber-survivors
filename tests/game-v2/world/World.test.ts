import {
  LAST_ISSUABLE_ENTITY_GENERATION,
  RETIRED_ENTITY_GENERATION,
  type EntityId,
} from '@/game-v2/contracts/EntityId';
import { ABILITY_SLOT_COUNT, abilityStoreIndex } from '@/game-v2/contracts/AbilitySlot';
import { PASSIVE_SLOT_COUNT, passiveStoreIndex } from '@/game-v2/contracts/PassiveSlot';
import { ALL_COMPONENT_MASK, ComponentMask } from '@/game-v2/world/ComponentMask';
import { World } from '@/game-v2/world/World';
import { MAX_WORLD_CAPACITY } from '@/game-v2/config/Mvp0Config';
import { describe, expect, it } from 'vitest';

const componentStores = (world: World): Array<ArrayLike<number>> => [
  world.x,
  world.y,
  world.previousX,
  world.previousY,
  world.velocityX,
  world.velocityY,
  world.radius,
  world.health,
  world.maxHealth,
  world.faction,
  world.lastFacingX,
  world.lastFacingY,
  world.dashDirectionX,
  world.dashDirectionY,
  world.dashRemainingSeconds,
  world.invulnerabilityTicksRemaining,
  world.dashCooldownTicksRemaining,
  world.dashCharges,
  world.movementOverride,
  world.enemySpeed,
  world.contactDamage,
  world.contactCooldownTicksRemaining,
  world.xpValue,
  world.projectileDamage,
  world.projectileLifetimeTicksRemaining,
  world.weaponCooldownTicksRemaining,
  world.xp,
  world.level,
  world.xpPickupValue,
];

const seedEveryComponentStore = (world: World, slot: number, firstValue = 1): void => {
  const stores = componentStores(world);

  for (let index = 0; index < stores.length; index += 1) {
    const store = stores[index];

    if (store) {
      (store as { [slot: number]: number })[slot] = index + firstValue;
    }
  }
};

const expectEveryComponentStoreToRetainValues = (
  world: World,
  slot: number,
  firstValue: number
): void => {
  const stores = componentStores(world);

  for (let index = 0; index < stores.length; index += 1) {
    expect(stores[index]?.[slot]).toBe(index + firstValue);
  }
};

const expectEveryComponentStoreToBeCleared = (world: World, slot: number): void => {
  const stores = componentStores(world);

  for (let index = 0; index < stores.length; index += 1) {
    expect(stores[index]?.[slot]).toBe(0);
  }
};

describe('World', () => {
  it('assigns every component bit to its unique canonical position', () => {
    const bits = [
      ComponentMask.Transform,
      ComponentMask.Velocity,
      ComponentMask.Body,
      ComponentMask.Health,
      ComponentMask.Faction,
      ComponentMask.Player,
      ComponentMask.Enemy,
      ComponentMask.Projectile,
      ComponentMask.XpPickup,
      ComponentMask.AbilityLoadout,
      ComponentMask.PassiveLoadout,
    ];
    let combinedMask = 0;

    for (let index = 0; index < bits.length; index += 1) {
      const bit = bits[index];

      expect(bit).toBe(1 << index);
      combinedMask |= bit ?? 0;
    }

    expect(new Set(bits).size).toBe(11);
    expect(combinedMask).toBe(ALL_COMPONENT_MASK);
  });

  it('allocates ability loadout stores at one entry per ability slot', () => {
    const world = new World(8);

    expect(world.abilitySlotIdentity).toHaveLength(8 * ABILITY_SLOT_COUNT);
    expect(world.abilitySlotTier).toHaveLength(8 * ABILITY_SLOT_COUNT);
    expect(world.abilitySlotIndexOf(3, 2)).toBe(abilityStoreIndex(3, 2));
    expect(world.abilitySlotIndexOf(0, 0)).toBe(0);
    expect(world.abilitySlotIndexOf(7, ABILITY_SLOT_COUNT - 1)).toBe(
      8 * ABILITY_SLOT_COUNT - 1
    );
  });

  it('allocates passive loadout stores at one entry per passive slot', () => {
    const world = new World(8);

    expect(world.passiveSlotIdentity).toHaveLength(8 * PASSIVE_SLOT_COUNT);
    expect(world.passiveSlotLevel).toHaveLength(8 * PASSIVE_SLOT_COUNT);
    expect(world.passiveSlotIndexOf(3, 2)).toBe(passiveStoreIndex(3, 2));
    expect(world.passiveSlotIndexOf(7, PASSIVE_SLOT_COUNT - 1)).toBe(
      8 * PASSIVE_SLOT_COUNT - 1
    );

    for (const slot of [-1, 8, 1.5, Number.NaN]) {
      expect(() => world.passiveSlotIndexOf(slot, 0)).toThrow(
        'slot must be an integer inside the world capacity'
      );
    }

    for (const index of [-1, PASSIVE_SLOT_COUNT, 1.5, Number.NaN]) {
      expect(() => world.passiveSlotIndexOf(0, index)).toThrow(
        'passive slot index must be an integer inside the loadout'
      );
    }
  });

  it('clears passive loadout entries when a slot is destroyed or the world resets', () => {
    const world = new World(4);
    const entity = world.createEntity(ComponentMask.PassiveLoadout);
    const slot = world.slotOf(entity);
    const neighbour = world.createEntity(ComponentMask.PassiveLoadout);
    const neighbourSlot = world.slotOf(neighbour);

    for (let index = 0; index < PASSIVE_SLOT_COUNT; index += 1) {
      world.passiveSlotIdentity[world.passiveSlotIndexOf(slot, index)] = index + 1;
      world.passiveSlotLevel[world.passiveSlotIndexOf(slot, index)] = 1;
      world.passiveSlotIdentity[world.passiveSlotIndexOf(neighbourSlot, index)] = 9;
      world.passiveSlotLevel[world.passiveSlotIndexOf(neighbourSlot, index)] = 2;
    }

    world.destroyEntity(entity);

    for (let index = 0; index < PASSIVE_SLOT_COUNT; index += 1) {
      expect(world.passiveSlotIdentity[world.passiveSlotIndexOf(slot, index)]).toBe(0);
      expect(world.passiveSlotLevel[world.passiveSlotIndexOf(slot, index)]).toBe(0);
      expect(
        world.passiveSlotIdentity[world.passiveSlotIndexOf(neighbourSlot, index)]
      ).toBe(9);
    }

    world.reset();

    expect(world.passiveSlotIdentity.every(value => value === 0)).toBe(true);
    expect(world.passiveSlotLevel.every(value => value === 0)).toBe(true);
  });

  it('rejects an ability store index outside the world or the loadout', () => {
    const world = new World(8);

    for (const slot of [-1, 8, 1.5, Number.NaN]) {
      expect(() => world.abilitySlotIndexOf(slot, 0)).toThrow(
        'slot must be an integer inside the world capacity'
      );
    }

    for (const index of [-1, ABILITY_SLOT_COUNT, 1.5, Number.NaN]) {
      expect(() => world.abilitySlotIndexOf(0, index)).toThrow(
        'ability slot index must be an integer inside the loadout'
      );
    }
  });

  it('clears ability loadout entries when a slot is destroyed or the world resets', () => {
    const world = new World(4);
    const entity = world.createEntity(ComponentMask.AbilityLoadout);
    const slot = world.slotOf(entity);
    const neighbour = world.createEntity(ComponentMask.AbilityLoadout);
    const neighbourSlot = world.slotOf(neighbour);

    for (let index = 0; index < ABILITY_SLOT_COUNT; index += 1) {
      world.abilitySlotIdentity[world.abilitySlotIndexOf(slot, index)] = index + 1;
      world.abilitySlotTier[world.abilitySlotIndexOf(slot, index)] = 1;
      world.abilitySlotIdentity[world.abilitySlotIndexOf(neighbourSlot, index)] = 9;
      world.abilitySlotTier[world.abilitySlotIndexOf(neighbourSlot, index)] = 2;
    }

    world.destroyEntity(entity);

    for (let index = 0; index < ABILITY_SLOT_COUNT; index += 1) {
      expect(world.abilitySlotIdentity[world.abilitySlotIndexOf(slot, index)]).toBe(0);
      expect(world.abilitySlotTier[world.abilitySlotIndexOf(slot, index)]).toBe(0);
      expect(
        world.abilitySlotIdentity[world.abilitySlotIndexOf(neighbourSlot, index)]
      ).toBe(9);
    }

    world.reset();

    expect(world.abilitySlotIdentity.every(value => value === 0)).toBe(true);
    expect(world.abilitySlotTier.every(value => value === 0)).toBe(true);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 4097])(
    'rejects invalid capacity %s before a world exists',
    capacity => {
      expect(() => new World(capacity)).toThrow(RangeError);
    }
  );

  it('allocates the locked 4096-slot capacity with complete fixed stores', () => {
    expect(MAX_WORLD_CAPACITY).toBe(4096);
    const world = new World(4096);
    const stores = componentStores(world);

    expect(world.masks).toHaveLength(4096);
    expect(world.generations).toHaveLength(4096);
    expect(world.freeSlots).toHaveLength(4096);
    expect(world.freeSlotCount).toBe(4096);

    for (let index = 0; index < stores.length; index += 1) {
      expect(stores[index]).toHaveLength(4096);
    }

    const entity = world.createEntity(ComponentMask.Transform);

    expect(world.slotOf(entity)).toBe(0);
    expect(world.isAlive(entity)).toBe(true);
    expect(world.activeCount).toBe(1);
    expect(world.freeSlotCount).toBe(4095);
  });

  it('reuses released slots in deterministic stack order while stale handles stay invalid', () => {
    const world = new World(4);
    const first = world.createEntity(ComponentMask.Transform);
    const second = world.createEntity(ComponentMask.Velocity);
    const firstSlot = world.slotOf(first);
    const secondSlot = world.slotOf(second);

    expect(firstSlot).toBe(0);
    expect(secondSlot).toBe(1);
    expect(world.activeCount).toBe(2);
    expect(world.freeSlotCount).toBe(2);
    expect(Array.from(world.freeSlots.subarray(0, world.freeSlotCount))).toEqual([
      3, 2,
    ]);

    world.destroyEntity(second);
    world.destroyEntity(first);

    expect(world.activeCount).toBe(0);
    expect(Array.from(world.freeSlots.subarray(0, world.freeSlotCount))).toEqual([
      3,
      2,
      secondSlot,
      firstSlot,
    ]);

    const firstReplacement = world.createEntity(ComponentMask.Transform);
    const secondReplacement = world.createEntity(ComponentMask.Velocity);

    expect(world.slotOf(firstReplacement)).toBe(firstSlot);
    expect(world.slotOf(secondReplacement)).toBe(secondSlot);
    expect(world.isAlive(first)).toBe(false);
    expect(() => world.slotOf(first)).toThrow('stale entity');
  });

  it('throws when creating an entity beyond fixed capacity', () => {
    const world = new World(2);
    world.createEntity(ComponentMask.Transform);
    world.createEntity(ComponentMask.Transform);

    expect(() => world.createEntity(ComponentMask.Transform)).toThrow(
      'capacity exhausted'
    );
    expect(world.activeCount).toBe(2);
    expect(world.freeSlotCount).toBe(0);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 1 << 11, 0x1_0000_0000])(
    'rejects invalid component mask %s without consuming a slot',
    mask => {
      const world = new World(1);
      const initialFreeSlotCount = world.freeSlotCount;

      expect(() => world.createEntity(mask)).toThrow(RangeError);

      expect(world.activeCount).toBe(0);
      expect(world.freeSlotCount).toBe(initialFreeSlotCount);
      expect(world.masks[0]).toBe(0);
      expect(world.generations[0]).toBe(0);
    }
  );

  it('requires every requested component bit in allocation-free component queries', () => {
    const world = new World(2);
    const entity = world.createEntity(
      ComponentMask.Transform | ComponentMask.Velocity | ComponentMask.Player
    );

    expect(world.hasComponents(entity, ComponentMask.Transform)).toBe(true);
    expect(
      world.hasComponents(entity, ComponentMask.Transform | ComponentMask.Velocity)
    ).toBe(true);
    expect(
      world.hasComponents(entity, ComponentMask.Transform | ComponentMask.Health)
    ).toBe(false);
    expect(() => world.hasComponents(entity, 0)).toThrow(RangeError);
    expect(world.isAlive(entity)).toBe(true);
  });

  it('clears every authoritative component store when destroying an entity', () => {
    const world = new World(1);
    const entity = world.createEntity(
      ComponentMask.Transform |
        ComponentMask.Velocity |
        ComponentMask.Body |
        ComponentMask.Health |
        ComponentMask.Faction |
        ComponentMask.Player |
        ComponentMask.Enemy |
        ComponentMask.Projectile |
        ComponentMask.XpPickup
    );
    const slot = world.slotOf(entity);
    seedEveryComponentStore(world, slot);

    world.destroyEntity(entity);

    expect(world.masks[slot]).toBe(0);
    expect(world.generations[slot]).toBe(1);
    expectEveryComponentStoreToBeCleared(world, slot);
  });

  it('rejects invalid handles without mutating allocator or component state', () => {
    const world = new World(1);
    const original = world.createEntity(ComponentMask.Transform);
    const slot = world.slotOf(original);
    seedEveryComponentStore(world, slot);
    world.destroyEntity(original);
    const replacement = world.createEntity(ComponentMask.Health);
    world.health[slot] = 17;
    const masksBefore = world.masks[slot];
    const generationBefore = world.generations[slot];
    const activeCountBefore = world.activeCount;
    const freeSlotCountBefore = world.freeSlotCount;

    const invalidHandles = [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      -1,
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
      Number.MAX_SAFE_INTEGER,
      original,
    ];

    for (let index = 0; index < invalidHandles.length; index += 1) {
      const invalidHandle = invalidHandles[index];

      expect(() => world.destroyEntity(invalidHandle as EntityId)).toThrow(
        'stale entity'
      );
    }

    expect(() => world.hasComponents(original, ComponentMask.Transform)).toThrow(
      'stale entity'
    );

    expect(world.masks[slot]).toBe(masksBefore);
    expect(world.generations[slot]).toBe(generationBefore);
    expect(world.activeCount).toBe(activeCountBefore);
    expect(world.freeSlotCount).toBe(freeSlotCountBefore);
    expect(world.health[slot]).toBe(17);
    expect(world.isAlive(replacement)).toBe(true);
  });

  it('rejects an unissued same-generation handle without mutating world storage', () => {
    const world = new World(2);
    const allocated = world.createEntity(ComponentMask.Transform);
    const allocatedSlot = world.slotOf(allocated);
    const unissuedHandle = 1 as EntityId;
    const unissuedSlot = 1;
    seedEveryComponentStore(world, allocatedSlot, 1);
    seedEveryComponentStore(world, unissuedSlot, 101);

    expect(world.isAlive(unissuedHandle)).toBe(false);
    expect(() => world.slotOf(unissuedHandle)).toThrow('stale entity');
    expect(() => world.destroyEntity(unissuedHandle)).toThrow('stale entity');
    expect(() => world.hasComponents(unissuedHandle, ComponentMask.Transform)).toThrow(
      'stale entity'
    );

    expect(world.activeCount).toBe(1);
    expect(world.freeSlotCount).toBe(1);
    expect(world.freeSlots[0]).toBe(1);
    expect(world.masks[allocatedSlot]).toBe(ComponentMask.Transform);
    expect(world.masks[unissuedSlot]).toBe(0);
    expect(world.generations[allocatedSlot]).toBe(0);
    expect(world.generations[unissuedSlot]).toBe(0);
    expectEveryComponentStoreToRetainValues(world, allocatedSlot, 1);
    expectEveryComponentStoreToRetainValues(world, unissuedSlot, 101);
  });

  it('invalidates every prior handle and clears all stores on reset', () => {
    const world = new World(2);
    const first = world.createEntity(ComponentMask.Player);
    const second = world.createEntity(ComponentMask.Enemy);
    const firstSlot = world.slotOf(first);
    const secondSlot = world.slotOf(second);
    seedEveryComponentStore(world, firstSlot);
    seedEveryComponentStore(world, secondSlot);

    world.reset();

    expect(world.activeCount).toBe(0);
    expect(world.freeSlotCount).toBe(2);
    expect(Array.from(world.freeSlots.subarray(0, world.freeSlotCount))).toEqual([
      1, 0,
    ]);
    expect(world.masks[firstSlot]).toBe(0);
    expect(world.masks[secondSlot]).toBe(0);
    expect(world.generations[firstSlot]).toBe(1);
    expect(world.generations[secondSlot]).toBe(1);
    expectEveryComponentStoreToBeCleared(world, firstSlot);
    expectEveryComponentStoreToBeCleared(world, secondSlot);
    expect(world.isAlive(first)).toBe(false);
    expect(world.isAlive(second)).toBe(false);
    expect(() => world.slotOf(first)).toThrow('stale entity');
    expect(() => world.slotOf(second)).toThrow('stale entity');
  });

  it('retires a slot at the final generation instead of wrapping it into validity', () => {
    expect(LAST_ISSUABLE_ENTITY_GENERATION).toBe(0xfffffffe);
    expect(RETIRED_ENTITY_GENERATION).toBe(0xffffffff);
    const world = new World(1);
    world.generations[0] = LAST_ISSUABLE_ENTITY_GENERATION;
    const finalGenerationEntity = world.createEntity(ComponentMask.Transform);

    world.destroyEntity(finalGenerationEntity);

    expect(world.isAlive(finalGenerationEntity)).toBe(false);
    expect(world.generations[0]).toBe(RETIRED_ENTITY_GENERATION);
    expect(world.freeSlotCount).toBe(0);
    expect(world.activeCount).toBe(0);
    expect(() => world.createEntity(ComponentMask.Transform)).toThrow(
      'capacity exhausted'
    );
  });

  it('keeps retired slots out of the deterministic free stack after reset', () => {
    const world = new World(2);
    world.generations[0] = LAST_ISSUABLE_ENTITY_GENERATION;
    const finalGenerationEntity = world.createEntity(ComponentMask.Transform);

    world.destroyEntity(finalGenerationEntity);
    world.reset();

    expect(world.freeSlotCount).toBe(1);
    expect(world.freeSlots[0]).toBe(1);
    expect(world.slotOf(world.createEntity(ComponentMask.Transform))).toBe(1);
    expect(() => world.createEntity(ComponentMask.Transform)).toThrow(
      'capacity exhausted'
    );
  });

  it('never issues the retired-generation sentinel from a free-stack slot', () => {
    const world = new World(1);
    world.generations[0] = RETIRED_ENTITY_GENERATION;

    expect(() => world.createEntity(ComponentMask.Transform)).toThrow('retired');

    expect(world.activeCount).toBe(0);
    expect(world.freeSlotCount).toBe(1);
    expect(world.masks[0]).toBe(0);
  });

  it('advances only live generations during reset while retaining reusable free slots', () => {
    const world = new World(2);
    const entity = world.createEntity(ComponentMask.Transform);

    world.destroyEntity(entity);
    world.reset();

    expect(world.generations[0]).toBe(1);
    expect(world.generations[1]).toBe(0);
    expect(world.freeSlotCount).toBe(2);
    expect(Array.from(world.freeSlots.subarray(0, world.freeSlotCount))).toEqual([
      1, 0,
    ]);
  });

  it('round-trips every live handle through the single entity-id encoder', () => {
    const world = new World(8);
    world.generations[0] = 3;
    world.generations[1] = 5;
    const first = world.createEntity(ComponentMask.Transform);
    const second = world.createEntity(ComponentMask.Enemy);

    expect(world.slotOf(first)).toBe(0);
    expect(world.slotOf(second)).toBe(1);
    // Independent literals: generation * capacity 8 + slot.
    expect(first).toBe(24);
    expect(second).toBe(41);
    expect(world.entityIdOf(0)).toBe(24);
    expect(world.entityIdOf(1)).toBe(41);
    expect(world.entityIdOf(world.slotOf(first))).toBe(first);
    expect(world.entityIdOf(world.slotOf(second))).toBe(second);
    expect(world.isAlive(world.entityIdOf(world.slotOf(second)))).toBe(true);
  });

  it('encodes the bumped generation term after a slot is destroyed and recreated', () => {
    const world = new World(8);
    const first = world.createEntity(ComponentMask.Transform);
    const second = world.createEntity(ComponentMask.Enemy);
    const secondSlot = world.slotOf(second);

    expect(secondSlot).toBe(1);
    expect(second).toBe(1);

    world.destroyEntity(second);

    const replacement = world.createEntity(ComponentMask.Enemy);
    const replacementSlot = world.slotOf(replacement);

    expect(replacementSlot).toBe(secondSlot);
    expect(world.generations[replacementSlot]).toBe(1);
    // Independent literals: generation 1 * capacity 8 + slot 1.
    expect(replacement).toBe(9);
    expect(world.entityIdOf(replacementSlot)).toBe(9);
    expect(world.entityIdOf(replacementSlot)).toBe(replacement);
    expect(world.entityIdOf(world.slotOf(first))).toBe(first);
    expect(world.isAlive(first)).toBe(true);
  });

  it.each([
    -1,
    8,
    9,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.MAX_SAFE_INTEGER,
  ])('rejects slot %s outside the world capacity without mutating state', slot => {
    const world = new World(8);
    world.createEntity(ComponentMask.Transform);

    expect(() => world.entityIdOf(slot)).toThrow(RangeError);

    expect(world.activeCount).toBe(1);
    expect(world.freeSlotCount).toBe(7);
    expect(world.generations[0]).toBe(0);
    expect(world.masks[0]).toBe(ComponentMask.Transform);
  });

  it('refuses to encode a retired slot into an entity handle', () => {
    const world = new World(2);
    world.generations[0] = LAST_ISSUABLE_ENTITY_GENERATION;
    const finalGenerationEntity = world.createEntity(ComponentMask.Transform);

    expect(world.entityIdOf(0)).toBe(finalGenerationEntity);

    world.destroyEntity(finalGenerationEntity);

    expect(world.generations[0]).toBe(RETIRED_ENTITY_GENERATION);
    expect(() => world.entityIdOf(0)).toThrow(RangeError);
    expect(() => world.entityIdOf(0)).toThrow('retired');
    expect(world.isAlive(finalGenerationEntity)).toBe(false);
  });

  it('encodes a reusable free slot into a handle that is already dead', () => {
    const world = new World(4);
    const entity = world.createEntity(ComponentMask.Transform);
    const slot = world.slotOf(entity);

    world.destroyEntity(entity);

    const freeSlotId = world.entityIdOf(slot);

    expect(freeSlotId).not.toBe(entity);
    expect(world.isAlive(freeSlotId)).toBe(false);
    expect(() => world.slotOf(freeSlotId)).toThrow('stale entity');
  });

  it('retires a live final-generation entity during reset', () => {
    const world = new World(1);
    world.generations[0] = LAST_ISSUABLE_ENTITY_GENERATION;
    world.createEntity(ComponentMask.Transform);

    world.reset();

    expect(world.generations[0]).toBe(RETIRED_ENTITY_GENERATION);
    expect(world.freeSlotCount).toBe(0);
    expect(() => world.createEntity(ComponentMask.Transform)).toThrow(
      'capacity exhausted'
    );
  });
});
