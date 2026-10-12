import { describe, expect, it } from 'vitest';

import { createPassiveRegistry } from '@/game-v2/config/PassiveRegistry';
import { type EntityId } from '@/game-v2/contracts/EntityId';
import {
  PASSIVE_MAX_LEVEL,
  PASSIVE_SLOT_COUNT,
  type PassiveDefinition,
  type PassiveIdentityId,
  type PassiveSlotIndex,
} from '@/game-v2/contracts/PassiveSlot';
import { PassiveLoadoutSystem } from '@/game-v2/systems/PassiveLoadoutSystem';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { World } from '@/game-v2/world/World';

const OWNER_MASK = ComponentMask.Transform | ComponentMask.PassiveLoadout;
const CAPACITY = 16;

const id = (value: string): PassiveIdentityId => value as PassiveIdentityId;

const TEST_DEFINITIONS: readonly PassiveDefinition[] = [
  { id: id('one'), code: 21, authoredLevels: 5 },
  { id: id('two'), code: 22, authoredLevels: 2 },
  { id: id('three'), code: 23, authoredLevels: 5 },
  { id: id('four'), code: 24, authoredLevels: 5 },
  { id: id('five'), code: 25, authoredLevels: 5 },
  { id: id('six'), code: 26, authoredLevels: 1 },
  { id: id('seven'), code: 27, authoredLevels: 5 },
];

const createSystem = (): PassiveLoadoutSystem =>
  new PassiveLoadoutSystem(createPassiveRegistry(TEST_DEFINITIONS));

const createOwner = (world: World): EntityId => world.createEntity(OWNER_MASK);

const fill = (system: PassiveLoadoutSystem, world: World, owner: EntityId): void => {
  for (const identity of ['one', 'two', 'three', 'four', 'five', 'six']) {
    system.addOrLevelUp(world, owner, id(identity));
  }
};

describe('PassiveLoadoutSystem', () => {
  it('starts every slot empty', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    expect(system.occupiedCount(world, owner)).toBe(0);
    expect(system.levelOf(world, owner, id('one'))).toBeNull();

    for (let index = 0; index < PASSIVE_SLOT_COUNT; index += 1) {
      const slotIndex = index as PassiveSlotIndex;
      expect(system.identityAt(world, owner, slotIndex)).toBeNull();
      expect(system.levelAt(world, owner, slotIndex)).toBeNull();
    }
  });

  it('takes the lowest free slot at level one', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    expect(system.addOrLevelUp(world, owner, id('one'))).toBe(1);
    expect(system.identityAt(world, owner, 0)).toBe('one');
    expect(system.levelAt(world, owner, 0)).toBe(1);

    expect(system.addOrLevelUp(world, owner, id('three'))).toBe(1);
    expect(system.identityAt(world, owner, 1)).toBe('three');
    expect(system.occupiedCount(world, owner)).toBe(2);
  });

  it('levels a held identity in place without consuming a second slot', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    system.addOrLevelUp(world, owner, id('one'));
    system.addOrLevelUp(world, owner, id('three'));

    expect(system.addOrLevelUp(world, owner, id('one'))).toBe(2);
    expect(system.addOrLevelUp(world, owner, id('one'))).toBe(3);

    expect(system.occupiedCount(world, owner)).toBe(2);
    expect(system.levelOf(world, owner, id('one'))).toBe(3);
    expect(system.levelAt(world, owner, 0)).toBe(3);
    expect(system.levelAt(world, owner, 1)).toBe(1);
  });

  it('reaches five levels and then refuses', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    for (let level = 1; level <= PASSIVE_MAX_LEVEL; level += 1) {
      expect(system.addOrLevelUp(world, owner, id('one'))).toBe(level);
    }

    expect(() => system.addOrLevelUp(world, owner, id('one'))).toThrow(
      `passive has no authored level above ${PASSIVE_MAX_LEVEL}`
    );
    expect(system.levelOf(world, owner, id('one'))).toBe(PASSIVE_MAX_LEVEL);
  });

  it('refuses to pass an identity with fewer authored levels', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    system.addOrLevelUp(world, owner, id('six'));

    expect(() => system.addOrLevelUp(world, owner, id('six'))).toThrow(
      'passive has no authored level above 1'
    );
  });

  it('refuses a seventh identity instead of replacing a held one', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    fill(system, world, owner);

    expect(() => system.addOrLevelUp(world, owner, id('seven'))).toThrow(
      'passive loadout has no free slot'
    );
    expect(system.occupiedCount(world, owner)).toBe(PASSIVE_SLOT_COUNT);
    expect(system.identityAt(world, owner, 0)).toBe('one');
    expect(system.identityAt(world, owner, 5)).toBe('six');
  });

  it('still levels a held identity when all six slots are occupied', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    fill(system, world, owner);

    expect(system.addOrLevelUp(world, owner, id('two'))).toBe(2);
    expect(system.occupiedCount(world, owner)).toBe(PASSIVE_SLOT_COUNT);
  });

  it('reports offer eligibility for new and held identities', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    expect(system.isOfferable(world, owner, id('one'))).toBe(true);

    fill(system, world, owner);

    expect(system.isOfferable(world, owner, id('seven'))).toBe(false);
    expect(system.isOfferable(world, owner, id('two'))).toBe(true);

    system.addOrLevelUp(world, owner, id('two'));

    expect(system.isOfferable(world, owner, id('two'))).toBe(false);
    expect(system.isOfferable(world, owner, id('six'))).toBe(false);
    expect(system.isOfferable(world, owner, id('one'))).toBe(true);
  });

  it('refuses an identity the registry does not know', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    expect(() => system.addOrLevelUp(world, owner, id('omega'))).toThrow(
      'unknown passive identity'
    );
    expect(() => system.isOfferable(world, owner, id('omega'))).toThrow(
      'unknown passive identity'
    );
  });

  it('clears every slot of one owner without touching another owner', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const first = createOwner(world);
    const second = createOwner(world);

    fill(system, world, first);
    system.addOrLevelUp(world, second, id('seven'));
    system.addOrLevelUp(world, second, id('seven'));

    system.resetOwner(world, first);

    expect(system.occupiedCount(world, first)).toBe(0);
    expect(system.identityAt(world, first, 5)).toBeNull();
    expect(system.levelOf(world, second, id('seven'))).toBe(2);
  });

  it('rejects a slot index outside the loadout', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    for (const index of [-1, PASSIVE_SLOT_COUNT, 1.5, Number.NaN]) {
      const invalid = index as PassiveSlotIndex;

      expect(() => system.identityAt(world, owner, invalid)).toThrow(
        'passive slot index must be an integer inside the loadout'
      );
      expect(() => system.levelAt(world, owner, invalid)).toThrow(
        'passive slot index must be an integer inside the loadout'
      );
    }
  });

  it('rejects an entity that does not carry the passive component', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const other = world.createEntity(ComponentMask.Transform);

    expect(() => system.addOrLevelUp(world, other, id('one'))).toThrow(
      'entity does not own a passive loadout'
    );
    expect(() => system.occupiedCount(world, other)).toThrow(
      'entity does not own a passive loadout'
    );
  });

  it('rejects a stale entity handle', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    system.addOrLevelUp(world, owner, id('one'));
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
  });

  it('clears every passive loadout on world reset', () => {
    const world = new World(CAPACITY);
    const system = createSystem();
    const owner = createOwner(world);

    fill(system, world, owner);
    world.reset();

    expect(world.passiveSlotIdentity.every(value => value === 0)).toBe(true);
    expect(world.passiveSlotLevel.every(value => value === 0)).toBe(true);
    expect(system.occupiedCount(world, createOwner(world))).toBe(0);
  });
});
