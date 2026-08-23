import { describe, expect, it } from 'vitest';

import { createAbilityRegistry } from '@/game-v2/config/AbilityRegistry';
import { createPassiveRegistry } from '@/game-v2/config/PassiveRegistry';
import { type AbilityTierEffect } from '@/game-v2/contracts/AbilityTierEffect';
import {
  type AbilityDefinition,
  type AbilityIdentityId,
} from '@/game-v2/contracts/AbilitySlot';
import { type EntityId } from '@/game-v2/contracts/EntityId';
import {
  type PassiveDefinition,
  type PassiveIdentityId,
} from '@/game-v2/contracts/PassiveSlot';
import { DeterministicRng } from '@/game-v2/runtime/DeterministicRng';
import { AbilityLoadoutSystem } from '@/game-v2/systems/AbilityLoadoutSystem';
import { LevelUpOfferSystem } from '@/game-v2/systems/LevelUpOfferSystem';
import { PassiveLoadoutSystem } from '@/game-v2/systems/PassiveLoadoutSystem';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { World } from '@/game-v2/world/World';

const OWNER_MASK =
  ComponentMask.Transform |
  ComponentMask.AbilityLoadout |
  ComponentMask.PassiveLoadout |
  ComponentMask.LevelUpOffer;
const CAPACITY = 16;

const abilityId = (value: string): AbilityIdentityId => value as AbilityIdentityId;
const passiveId = (value: string): PassiveIdentityId => value as PassiveIdentityId;

const abilityEffect = (): AbilityTierEffect =>
  ({
    ability: 'starter-projectile',
    damage: 1,
    projectileRadius: 0.1,
    cooldownTicks: 1,
  }) as AbilityTierEffect;

const abilityDefinition = (id: string, code: number): AbilityDefinition => ({
  id: abilityId(id),
  code,
  activation: 'active',
  authoredTiers: 3,
  tierEffects: [abilityEffect(), abilityEffect(), abilityEffect()],
});

const passiveDefinition = (id: string, code: number): PassiveDefinition => ({
  id: passiveId(id),
  code,
  authoredLevels: 5,
});

/**
 * Five ability identities and five passive identities: enough to prove the
 * offer never exceeds `OFFER_CANDIDATE_COUNT` even when the offerable pool is
 * much larger, before `V2-106`/`V2-107`/`V2-401` register that many for real
 * (V2-ADR-039).
 */
const ABILITY_DEFINITIONS: readonly AbilityDefinition[] = [
  abilityDefinition('ability-a', 11),
  abilityDefinition('ability-b', 12),
  abilityDefinition('ability-c', 13),
  abilityDefinition('ability-d', 14),
  abilityDefinition('ability-e', 15),
];

const PASSIVE_DEFINITIONS: readonly PassiveDefinition[] = [
  passiveDefinition('passive-a', 21),
  passiveDefinition('passive-b', 22),
];

const createHarness = (): {
  world: World;
  owner: EntityId;
  abilityLoadout: AbilityLoadoutSystem;
  passiveLoadout: PassiveLoadoutSystem;
  offerSystem: LevelUpOfferSystem;
} => {
  const world = new World(CAPACITY);
  const owner = world.createEntity(OWNER_MASK);
  const abilityLoadout = new AbilityLoadoutSystem(
    createAbilityRegistry(ABILITY_DEFINITIONS)
  );
  const passiveLoadout = new PassiveLoadoutSystem(
    createPassiveRegistry(PASSIVE_DEFINITIONS)
  );
  const offerSystem = new LevelUpOfferSystem(
    abilityLoadout,
    passiveLoadout,
    createAbilityRegistry(ABILITY_DEFINITIONS),
    createPassiveRegistry(PASSIVE_DEFINITIONS)
  );

  return { world, owner, abilityLoadout, passiveLoadout, offerSystem };
};

describe('LevelUpOfferSystem', () => {
  describe('generateOffer', () => {
    it('never offers more than OFFER_CANDIDATE_COUNT candidates from a larger pool', () => {
      const { world, owner, offerSystem } = createHarness();

      offerSystem.generateOffer(world, new DeterministicRng(1), owner);
      const candidates = offerSystem.candidatesAt(world, owner);

      expect(candidates).toHaveLength(3);
      const occupied = candidates.filter(candidate => candidate !== null);
      expect(occupied).toHaveLength(3);

      const identities = new Set(occupied.map(candidate => candidate.identity));
      expect(identities.size).toBe(3);
    });

    it('fills every slot when exactly OFFER_CANDIDATE_COUNT candidates are offerable', () => {
      const world = new World(CAPACITY);
      const owner = world.createEntity(OWNER_MASK);
      const abilityLoadout = new AbilityLoadoutSystem(
        createAbilityRegistry([ABILITY_DEFINITIONS[0]!, ABILITY_DEFINITIONS[1]!])
      );
      const passiveLoadout = new PassiveLoadoutSystem(
        createPassiveRegistry([PASSIVE_DEFINITIONS[0]!])
      );
      const offerSystem = new LevelUpOfferSystem(
        abilityLoadout,
        passiveLoadout,
        createAbilityRegistry([ABILITY_DEFINITIONS[0]!, ABILITY_DEFINITIONS[1]!]),
        createPassiveRegistry([PASSIVE_DEFINITIONS[0]!])
      );

      offerSystem.generateOffer(world, new DeterministicRng(1), owner);
      const candidates = offerSystem.candidatesAt(world, owner);

      expect(candidates.every(candidate => candidate !== null)).toBe(true);
    });

    it('offers fewer than three when the pool is smaller', () => {
      const world = new World(CAPACITY);
      const owner = world.createEntity(OWNER_MASK);
      const abilityLoadout = new AbilityLoadoutSystem(
        createAbilityRegistry([ABILITY_DEFINITIONS[0]!])
      );
      const passiveLoadout = new PassiveLoadoutSystem(
        createPassiveRegistry([PASSIVE_DEFINITIONS[0]!])
      );
      const offerSystem = new LevelUpOfferSystem(
        abilityLoadout,
        passiveLoadout,
        createAbilityRegistry([ABILITY_DEFINITIONS[0]!]),
        createPassiveRegistry([PASSIVE_DEFINITIONS[0]!])
      );

      offerSystem.generateOffer(world, new DeterministicRng(1), owner);
      const candidates = offerSystem.candidatesAt(world, owner);

      expect(candidates.filter(candidate => candidate !== null)).toHaveLength(2);
      expect(candidates[2]).toBeNull();
    });

    it('produces the same offer and default index for the same seed', () => {
      const first = createHarness();
      first.offerSystem.generateOffer(
        first.world,
        new DeterministicRng(7),
        first.owner
      );

      const second = createHarness();
      second.offerSystem.generateOffer(
        second.world,
        new DeterministicRng(7),
        second.owner
      );

      expect(second.offerSystem.candidatesAt(second.world, second.owner)).toEqual(
        first.offerSystem.candidatesAt(first.world, first.owner)
      );
      expect(second.offerSystem.defaultIndexOf(second.world, second.owner)).toBe(
        first.offerSystem.defaultIndexOf(first.world, first.owner)
      );
    });

    it('overwrites an offer already open', () => {
      const { world, owner, offerSystem } = createHarness();

      offerSystem.generateOffer(world, new DeterministicRng(1), owner);
      const first = offerSystem.candidatesAt(world, owner);

      offerSystem.generateOffer(world, new DeterministicRng(999), owner);
      const second = offerSystem.candidatesAt(world, owner);

      expect(second).not.toEqual(first);
    });

    it('throws when nothing is offerable', () => {
      const world = new World(CAPACITY);
      const owner = world.createEntity(OWNER_MASK);
      const abilityLoadout = new AbilityLoadoutSystem(
        createAbilityRegistry([ABILITY_DEFINITIONS[0]!])
      );
      const passiveLoadout = new PassiveLoadoutSystem(
        createPassiveRegistry([PASSIVE_DEFINITIONS[0]!])
      );
      const offerSystem = new LevelUpOfferSystem(
        abilityLoadout,
        passiveLoadout,
        createAbilityRegistry([ABILITY_DEFINITIONS[0]!]),
        createPassiveRegistry([PASSIVE_DEFINITIONS[0]!])
      );

      // Exhaust both: the ability to its tier ceiling, the passive to its level ceiling.
      abilityLoadout.add(world, owner, ABILITY_DEFINITIONS[0]!.id);
      abilityLoadout.advanceTier(world, owner, 0);
      abilityLoadout.advanceTier(world, owner, 0);
      passiveLoadout.addOrLevelUp(world, owner, PASSIVE_DEFINITIONS[0]!.id);
      for (let i = 0; i < 4; i += 1) {
        passiveLoadout.addOrLevelUp(world, owner, PASSIVE_DEFINITIONS[0]!.id);
      }

      expect(() =>
        offerSystem.generateOffer(world, new DeterministicRng(1), owner)
      ).toThrow('no offerable candidates exist');
    });
  });

  describe('candidatesAt / defaultIndexOf', () => {
    it('returns all null and a null default before any offer is generated', () => {
      const { world, owner, offerSystem } = createHarness();

      expect(offerSystem.candidatesAt(world, owner)).toEqual([null, null, null]);
      expect(offerSystem.defaultIndexOf(world, owner)).toBeNull();
    });

    it('returns a default index inside the occupied range', () => {
      const { world, owner, offerSystem } = createHarness();

      offerSystem.generateOffer(world, new DeterministicRng(3), owner);
      const candidates = offerSystem.candidatesAt(world, owner);
      const defaultIndex = offerSystem.defaultIndexOf(world, owner);

      expect(defaultIndex).not.toBeNull();
      expect(candidates[defaultIndex!]).not.toBeNull();
    });

    it('throws when the stored default index points at an empty candidate', () => {
      const world = new World(CAPACITY);
      const owner = world.createEntity(OWNER_MASK);
      const abilityLoadout = new AbilityLoadoutSystem(
        createAbilityRegistry([ABILITY_DEFINITIONS[0]!])
      );
      const passiveLoadout = new PassiveLoadoutSystem(
        createPassiveRegistry([PASSIVE_DEFINITIONS[0]!])
      );
      const offerSystem = new LevelUpOfferSystem(
        abilityLoadout,
        passiveLoadout,
        createAbilityRegistry([ABILITY_DEFINITIONS[0]!]),
        createPassiveRegistry([PASSIVE_DEFINITIONS[0]!])
      );

      offerSystem.generateOffer(world, new DeterministicRng(1), owner);
      const candidates = offerSystem.candidatesAt(world, owner);
      expect(candidates[2]).toBeNull();

      world.offerDefaultIndex[world.slotOf(owner)] = 2;

      expect(() => offerSystem.defaultIndexOf(world, owner)).toThrow(
        'offer default index is outside the offer'
      );
    });
  });

  describe('resolveIndex', () => {
    it('resolves the candidate at a valid, occupied index', () => {
      const { world, owner, offerSystem } = createHarness();
      offerSystem.generateOffer(world, new DeterministicRng(1), owner);

      const candidate = offerSystem.resolveIndex(world, owner, 0);
      expect(candidate).toEqual(offerSystem.candidatesAt(world, owner)[0]);
    });

    it('throws for an empty candidate slot', () => {
      const world = new World(CAPACITY);
      const owner = world.createEntity(OWNER_MASK);
      const abilityLoadout = new AbilityLoadoutSystem(
        createAbilityRegistry([ABILITY_DEFINITIONS[0]!])
      );
      const passiveLoadout = new PassiveLoadoutSystem(
        createPassiveRegistry([PASSIVE_DEFINITIONS[0]!])
      );
      const offerSystem = new LevelUpOfferSystem(
        abilityLoadout,
        passiveLoadout,
        createAbilityRegistry([ABILITY_DEFINITIONS[0]!]),
        createPassiveRegistry([PASSIVE_DEFINITIONS[0]!])
      );

      offerSystem.generateOffer(world, new DeterministicRng(1), owner);
      expect(offerSystem.candidatesAt(world, owner)[2]).toBeNull();

      expect(() => offerSystem.resolveIndex(world, owner, 2)).toThrow(
        'offer candidate slot is empty'
      );
    });

    it.each([-1, 3, 1.5, Number.NaN])('rejects invalid index %s', index => {
      const { world, owner, offerSystem } = createHarness();
      offerSystem.generateOffer(world, new DeterministicRng(1), owner);

      expect(() => offerSystem.resolveIndex(world, owner, index)).toThrow(
        'offer candidate index must be an integer inside the offer'
      );
    });
  });

  describe('clearOwner', () => {
    it('clears every candidate and the default index', () => {
      const { world, owner, offerSystem } = createHarness();
      offerSystem.generateOffer(world, new DeterministicRng(1), owner);

      offerSystem.clearOwner(world, owner);

      expect(offerSystem.candidatesAt(world, owner)).toEqual([null, null, null]);
      expect(offerSystem.defaultIndexOf(world, owner)).toBeNull();
    });

    it('does not touch another owner in the same world', () => {
      const { world, owner, offerSystem } = createHarness();
      const other = world.createEntity(OWNER_MASK);

      offerSystem.generateOffer(world, new DeterministicRng(1), owner);
      offerSystem.generateOffer(world, new DeterministicRng(1), other);

      offerSystem.clearOwner(world, owner);

      expect(offerSystem.candidatesAt(world, owner)).toEqual([null, null, null]);
      expect(offerSystem.candidatesAt(world, other).some(c => c !== null)).toBe(true);
    });
  });

  it('rejects an entity that does not own a level-up offer', () => {
    const world = new World(CAPACITY);
    const other = world.createEntity(ComponentMask.Transform);
    const { offerSystem } = createHarness();

    expect(() =>
      offerSystem.generateOffer(world, new DeterministicRng(1), other)
    ).toThrow('entity does not own a level-up offer');
  });

  it('hands a recycled world slot an empty offer', () => {
    const { world, owner, offerSystem } = createHarness();
    const slot = world.slotOf(owner);

    offerSystem.generateOffer(world, new DeterministicRng(1), owner);
    world.destroyEntity(owner);

    let recycled = world.createEntity(OWNER_MASK);
    while (world.slotOf(recycled) !== slot) {
      recycled = world.createEntity(OWNER_MASK);
    }

    expect(offerSystem.candidatesAt(world, recycled)).toEqual([null, null, null]);
  });
});
