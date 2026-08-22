import { describe, expect, it } from 'vitest';

import { createAbilityRegistry } from '@/game-v2/config/AbilityRegistry';
import {
  ABILITY_SLOT_COUNT,
  type AbilityDefinition,
  type AbilityIdentityId,
  type AbilitySlotIndex,
} from '@/game-v2/contracts/AbilitySlot';
import { type EntityId } from '@/game-v2/contracts/EntityId';
import { AbilityLoadoutSystem } from '@/game-v2/systems/AbilityLoadoutSystem';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { World } from '@/game-v2/world/World';

const OWNER_MASK = ComponentMask.Transform | ComponentMask.AbilityLoadout;
const CAPACITY = 16;

const id = (value: string): AbilityIdentityId => value as AbilityIdentityId;

const TEST_DEFINITIONS: readonly AbilityDefinition[] = [
  { id: id('alpha'), code: 11, activation: 'auto', authoredTiers: 3 },
  { id: id('beta'), code: 12, activation: 'active', authoredTiers: 1 },
  { id: id('gamma'), code: 13, activation: 'active', authoredTiers: 2 },
  { id: id('delta'), code: 14, activation: 'auto', authoredTiers: 2 },
  { id: id('epsilon'), code: 15, activation: 'active', authoredTiers: 3 },
];

const createSystem = (): AbilityLoadoutSystem =>
  new AbilityLoadoutSystem(createAbilityRegistry(TEST_DEFINITIONS));

const createOwner = (world: World): EntityId => world.createEntity(OWNER_MASK);

const fill = (
  system: AbilityLoadoutSystem,
  world: World,
  owner: EntityId
): AbilitySlotIndex[] => [
  system.add(world, owner, id('alpha')),
  system.add(world, owner, id('beta')),
  system.add(world, owner, id('gamma')),
  system.add(world, owner, id('delta')),
];

describe('AbilityLoadoutSystem', () => {
  it('starts every slot empty', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    expect(system.occupiedCount(world, owner)).toBe(0);
    for (let index = 0; index < ABILITY_SLOT_COUNT; index += 1) {
      const slotIndex = index as AbilitySlotIndex;
      expect(system.identityAt(world, owner, slotIndex)).toBeNull();
      expect(system.tierAt(world, owner, slotIndex)).toBeNull();
      expect(system.activationAt(world, owner, slotIndex)).toBeNull();
    }
    expect(system.indexOf(world, owner, id('alpha'))).toBeNull();
  });

  it('adds an ability at tier one with its registered activation kind', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    expect(system.add(world, owner, id('alpha'))).toBe(0);
    expect(system.identityAt(world, owner, 0)).toBe('alpha');
    expect(system.tierAt(world, owner, 0)).toBe(1);
    expect(system.activationAt(world, owner, 0)).toBe('auto');
    expect(system.indexOf(world, owner, id('alpha'))).toBe(0);
    expect(system.occupiedCount(world, owner)).toBe(1);

    expect(system.add(world, owner, id('beta'))).toBe(1);
    expect(system.activationAt(world, owner, 1)).toBe('active');
  });

  it('fills the lowest free slot, including after a removal', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    expect(fill(system, world, owner)).toEqual([0, 1, 2, 3]);

    system.remove(world, owner, 1);
    expect(system.add(world, owner, id('epsilon'))).toBe(1);
    expect(system.identityAt(world, owner, 1)).toBe('epsilon');
    expect(system.identityAt(world, owner, 0)).toBe('alpha');
    expect(system.identityAt(world, owner, 2)).toBe('gamma');
    expect(system.identityAt(world, owner, 3)).toBe('delta');
  });

  it('refuses a fifth ability instead of replacing an occupied slot', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    fill(system, world, owner);

    expect(() => system.add(world, owner, id('epsilon'))).toThrow(
      'ability loadout has no free slot'
    );
    expect(system.occupiedCount(world, owner)).toBe(ABILITY_SLOT_COUNT);
    expect(system.identityAt(world, owner, 0)).toBe('alpha');
    expect(system.identityAt(world, owner, 3)).toBe('delta');
  });

  it('refuses to hold the same identity twice', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    system.add(world, owner, id('alpha'));
    expect(() => system.add(world, owner, id('alpha'))).toThrow(
      'ability identity already occupies a slot'
    );
    expect(system.occupiedCount(world, owner)).toBe(1);
  });

  it('refuses an identity the registry does not know', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    expect(() => system.add(world, owner, id('omega'))).toThrow(
      'unknown ability identity'
    );
    expect(system.occupiedCount(world, owner)).toBe(0);
  });

  it('removes exactly one slot and leaves the others untouched', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    fill(system, world, owner);
    system.advanceTier(world, owner, 2);

    system.remove(world, owner, 0);

    expect(system.identityAt(world, owner, 0)).toBeNull();
    expect(system.tierAt(world, owner, 0)).toBeNull();
    expect(system.occupiedCount(world, owner)).toBe(3);
    expect(system.identityAt(world, owner, 2)).toBe('gamma');
    expect(system.tierAt(world, owner, 2)).toBe(2);
  });

  it('refuses to remove an empty slot', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    expect(() => system.remove(world, owner, 0)).toThrow(
      'ability slot is already empty'
    );
  });

  it('advances a tier up to the authored ceiling of its identity', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    system.add(world, owner, id('alpha'));
    expect(system.advanceTier(world, owner, 0)).toBe(2);
    expect(system.advanceTier(world, owner, 0)).toBe(3);
    expect(() => system.advanceTier(world, owner, 0)).toThrow(
      'ability has no authored tier above 3'
    );
    expect(system.tierAt(world, owner, 0)).toBe(3);
  });

  it('refuses to advance past an identity with a single authored tier', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    system.add(world, owner, id('beta'));
    expect(() => system.advanceTier(world, owner, 0)).toThrow(
      'ability has no authored tier above 1'
    );
    expect(system.tierAt(world, owner, 0)).toBe(1);
  });

  it('refuses to advance an empty slot', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    expect(() => system.advanceTier(world, owner, 1)).toThrow('ability slot is empty');
  });

  it('clears every slot of one owner without touching another owner', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const first = createOwner(world);
    const second = createOwner(world);

    fill(system, world, first);
    system.add(world, second, id('epsilon'));
    system.advanceTier(world, second, 0);

    system.resetOwner(world, first);

    expect(system.occupiedCount(world, first)).toBe(0);
    expect(system.identityAt(world, first, 3)).toBeNull();
    expect(system.identityAt(world, second, 0)).toBe('epsilon');
    expect(system.tierAt(world, second, 0)).toBe(2);
  });

  it('rejects a slot index outside the loadout', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    for (const index of [-1, ABILITY_SLOT_COUNT, 1.5, Number.NaN]) {
      const invalid = index as AbilitySlotIndex;
      expect(() => system.identityAt(world, owner, invalid)).toThrow(
        'ability slot index must be an integer inside the loadout'
      );
      expect(() => system.remove(world, owner, invalid)).toThrow(
        'ability slot index must be an integer inside the loadout'
      );
      expect(() => system.advanceTier(world, owner, invalid)).toThrow(
        'ability slot index must be an integer inside the loadout'
      );
    }
  });

  it('rejects an entity that does not carry the loadout component', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const other = world.createEntity(ComponentMask.Transform);

    expect(() => system.add(world, other, id('alpha'))).toThrow(
      'entity does not own an ability loadout'
    );
    expect(() => system.occupiedCount(world, other)).toThrow(
      'entity does not own an ability loadout'
    );
  });

  it('rejects a stale entity handle', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    system.add(world, owner, id('alpha'));
    world.destroyEntity(owner);

    expect(() => system.identityAt(world, owner, 0)).toThrow('stale entity');
  });

  it('hands a recycled world slot an empty loadout', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);
    const slot = world.slotOf(owner);

    fill(system, world, owner);
    world.destroyEntity(owner);

    let recycled = createOwner(world);
    while (world.slotOf(recycled) !== slot) {
      recycled = createOwner(world);
    }

    expect(system.occupiedCount(world, recycled)).toBe(0);
    expect(system.identityAt(world, recycled, 0)).toBeNull();
  });

  it('clears every loadout on world reset', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    fill(system, world, owner);
    world.reset();

    const next = createOwner(world);
    expect(system.occupiedCount(world, next)).toBe(0);
    for (let index = 0; index < world.abilitySlotIdentity.length; index += 1) {
      expect(world.abilitySlotIdentity[index]).toBe(0);
      expect(world.abilitySlotTier[index]).toBe(0);
    }
  });
});
