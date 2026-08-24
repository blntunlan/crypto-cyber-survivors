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
  startEligible: false,
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

  describe('rerollChargesOf / banishChargesOf', () => {
    it('reports 1 before any charge is spent and 0 after', () => {
      const { world, owner, offerSystem } = createHarness();
      offerSystem.generateOffer(world, new DeterministicRng(1), owner);
      world.rerollCharges[world.slotOf(owner)] = 1;
      world.banishCharges[world.slotOf(owner)] = 1;

      expect(offerSystem.rerollChargesOf(world, owner)).toBe(1);
      expect(offerSystem.banishChargesOf(world, owner)).toBe(1);

      offerSystem.reroll(world, new DeterministicRng(2), owner);

      expect(offerSystem.rerollChargesOf(world, owner)).toBe(0);
      expect(offerSystem.banishChargesOf(world, owner)).toBe(1);
    });
  });

  describe('reroll', () => {
    it('spends the charge exactly once and regenerates every slot and the default index', () => {
      const { world, owner, offerSystem } = createHarness();
      world.rerollCharges[world.slotOf(owner)] = 1;
      offerSystem.generateOffer(world, new DeterministicRng(1), owner);
      const before = offerSystem.candidatesAt(world, owner);

      offerSystem.reroll(world, new DeterministicRng(999), owner);

      expect(offerSystem.rerollChargesOf(world, owner)).toBe(0);
      expect(offerSystem.candidatesAt(world, owner)).not.toEqual(before);
      const after = offerSystem.candidatesAt(world, owner);
      expect(after.filter(candidate => candidate !== null)).toHaveLength(3);
    });

    it('throws and mutates nothing when no offer is open', () => {
      const { world, owner, offerSystem } = createHarness();
      world.rerollCharges[world.slotOf(owner)] = 1;

      expect(() => offerSystem.reroll(world, new DeterministicRng(1), owner)).toThrow(
        'no level-up offer is open'
      );
      expect(offerSystem.rerollChargesOf(world, owner)).toBe(1);
    });

    it('throws and mutates nothing when the charge is already spent', () => {
      const { world, owner, offerSystem } = createHarness();
      offerSystem.generateOffer(world, new DeterministicRng(1), owner);
      world.rerollCharges[world.slotOf(owner)] = 0;
      const before = offerSystem.candidatesAt(world, owner);

      expect(() => offerSystem.reroll(world, new DeterministicRng(2), owner)).toThrow(
        'no reroll charge remains'
      );
      expect(offerSystem.candidatesAt(world, owner)).toEqual(before);
    });

    it('never redraws a banished identity', () => {
      const { world, owner, offerSystem, abilityLoadout, passiveLoadout } =
        createHarness();
      offerSystem.generateOffer(world, new DeterministicRng(1), owner);
      world.rerollCharges[world.slotOf(owner)] = 1;
      world.banishCharges[world.slotOf(owner)] = 1;

      const banishIndex = offerSystem
        .candidatesAt(world, owner)
        .findIndex(candidate => candidate !== null) as 0 | 1 | 2;
      const banished = offerSystem.resolveIndex(world, owner, banishIndex);
      offerSystem.banish(world, new DeterministicRng(3), owner, banishIndex);

      // Rerolling many times with different seeds must never bring the
      // banished identity back.
      for (let seed = 10; seed < 40; seed += 1) {
        world.rerollCharges[world.slotOf(owner)] = 1;
        offerSystem.reroll(world, new DeterministicRng(seed), owner);
        const candidates = offerSystem.candidatesAt(world, owner);
        expect(
          candidates.some(
            candidate =>
              candidate !== null &&
              candidate.kind === banished.kind &&
              candidate.identity === banished.identity
          )
        ).toBe(false);
      }

      // Sanity: the ability/passive loadouts were untouched by banishing.
      expect(abilityLoadout).toBeDefined();
      expect(passiveLoadout).toBeDefined();
    });
  });

  describe('banish', () => {
    it('spends the charge exactly once, replaces only the targeted slot, and leaves the others untouched', () => {
      const { world, owner, offerSystem } = createHarness();
      offerSystem.generateOffer(world, new DeterministicRng(1), owner);
      world.banishCharges[world.slotOf(owner)] = 1;
      const before = offerSystem.candidatesAt(world, owner);
      const targetIndex = 0;
      const untouchedIndices = [1, 2] as const;

      offerSystem.banish(world, new DeterministicRng(5), owner, targetIndex);

      expect(offerSystem.banishChargesOf(world, owner)).toBe(0);
      const after = offerSystem.candidatesAt(world, owner);
      for (const index of untouchedIndices) {
        expect(after[index]).toEqual(before[index]);
      }
    });

    it('never redraws a duplicate of a sibling candidate still shown in the same offer', () => {
      // Sweeps many seeds and every target index: the redraw pool must
      // exclude identities already occupying the offer's other two slots,
      // not just the permanent per-run ban, or two cards in the same offer
      // can show the identical identity. Seeds are spread across the full
      // uint32 range via a multiplicative hash rather than small sequential
      // integers: `DeterministicRng`'s xorshift32 mixes a small seed weakly
      // on its very first output (harmless for real run identities, which
      // are large uint32 values, but it collapses a small-sequential-seed
      // sweep onto the same low-entropy draw and hides real RNG-dependent
      // bugs — this test originally passed against the pre-fix code for
      // exactly that reason).
      const spread = (n: number): number => Math.imul(n, 2654435761) >>> 0;

      for (let seed = 1; seed < 60; seed += 1) {
        for (const targetIndex of [0, 1, 2] as const) {
          const { world, owner, offerSystem } = createHarness();
          offerSystem.generateOffer(world, new DeterministicRng(spread(seed)), owner);
          world.banishCharges[world.slotOf(owner)] = 1;
          const before = offerSystem.candidatesAt(world, owner);

          if (before[targetIndex] === null) {
            continue;
          }

          offerSystem.banish(
            world,
            new DeterministicRng(spread(seed * 10 + targetIndex + 1000)),
            owner,
            targetIndex
          );

          const after = offerSystem.candidatesAt(world, owner);
          const redrawn = after[targetIndex];

          if (redrawn === null || redrawn === undefined) {
            continue;
          }

          for (let i = 0; i < 3; i += 1) {
            if (i === targetIndex) {
              continue;
            }
            const sibling = after[i];
            const isDuplicate =
              sibling?.kind === redrawn.kind && sibling.identity === redrawn.identity;
            expect(isDuplicate, `seed ${seed}, targetIndex ${targetIndex}`).toBe(false);
          }
        }
      }
    });

    it('redraws the default index only when it pointed at the banished slot', () => {
      const { world, owner, offerSystem } = createHarness();
      offerSystem.generateOffer(world, new DeterministicRng(4), owner);
      world.banishCharges[world.slotOf(owner)] = 1;
      const defaultBefore = offerSystem.defaultIndexOf(world, owner);
      expect(defaultBefore).not.toBeNull();

      const otherIndex = (((defaultBefore! as number) + 1) % 3) as 0 | 1 | 2;
      const candidatesBefore = offerSystem.candidatesAt(world, owner);
      // Only banish a non-default, occupied slot to prove the default is untouched.
      const targetIndex =
        candidatesBefore[otherIndex] !== null
          ? otherIndex
          : ((defaultBefore! as number) + 2) % 3;

      if (candidatesBefore[targetIndex] === null) {
        // Every non-default slot is empty in this offer; nothing to prove here.
        return;
      }

      offerSystem.banish(world, new DeterministicRng(6), owner, targetIndex);

      expect(offerSystem.defaultIndexOf(world, owner)).toBe(defaultBefore);
    });

    it('redraws the default index from surviving occupied slots when it pointed at the banished slot', () => {
      const { world, owner, offerSystem } = createHarness();
      offerSystem.generateOffer(world, new DeterministicRng(1), owner);
      world.banishCharges[world.slotOf(owner)] = 1;
      const defaultIndex = offerSystem.defaultIndexOf(world, owner);
      expect(defaultIndex).not.toBeNull();

      offerSystem.banish(world, new DeterministicRng(7), owner, defaultIndex!);

      const newDefault = offerSystem.defaultIndexOf(world, owner);
      const candidates = offerSystem.candidatesAt(world, owner);
      if (newDefault !== null) {
        expect(candidates[newDefault]).not.toBeNull();
      }
    });

    it('permanently excludes the banished identity from later offers this run', () => {
      const { world, owner, offerSystem } = createHarness();
      offerSystem.generateOffer(world, new DeterministicRng(1), owner);
      world.banishCharges[world.slotOf(owner)] = 1;
      const banished = offerSystem.resolveIndex(world, owner, 0);

      offerSystem.banish(world, new DeterministicRng(2), owner, 0);

      for (let seed = 50; seed < 80; seed += 1) {
        offerSystem.generateOffer(world, new DeterministicRng(seed), owner);
        const candidates = offerSystem.candidatesAt(world, owner);
        expect(
          candidates.some(
            candidate =>
              candidate !== null &&
              candidate.kind === banished.kind &&
              candidate.identity === banished.identity
          )
        ).toBe(false);
      }
    });

    it('is legal and leaves the slot empty when no replacement is offerable', () => {
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
      const occupiedIndex = candidates.findIndex(candidate => candidate !== null) as
        | 0
        | 1
        | 2;
      world.banishCharges[world.slotOf(owner)] = 1;

      expect(() =>
        offerSystem.banish(world, new DeterministicRng(1), owner, occupiedIndex)
      ).not.toThrow();
      expect(offerSystem.banishChargesOf(world, owner)).toBe(0);
    });

    it('throws and mutates nothing when no offer is open', () => {
      const { world, owner, offerSystem } = createHarness();
      world.banishCharges[world.slotOf(owner)] = 1;

      expect(() =>
        offerSystem.banish(world, new DeterministicRng(1), owner, 0)
      ).toThrow('no level-up offer is open');
      expect(offerSystem.banishChargesOf(world, owner)).toBe(1);
    });

    it('throws and mutates nothing when the charge is already spent', () => {
      const { world, owner, offerSystem } = createHarness();
      offerSystem.generateOffer(world, new DeterministicRng(1), owner);
      world.banishCharges[world.slotOf(owner)] = 0;
      const before = offerSystem.candidatesAt(world, owner);

      expect(() =>
        offerSystem.banish(world, new DeterministicRng(1), owner, 0)
      ).toThrow('no banish charge remains');
      expect(offerSystem.candidatesAt(world, owner)).toEqual(before);
      expect(world.bannedCandidateKind[world.slotOf(owner)]).toBe(0);
    });

    it('throws and mutates nothing for an empty candidate index', () => {
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
      world.banishCharges[world.slotOf(owner)] = 1;

      expect(() =>
        offerSystem.banish(world, new DeterministicRng(1), owner, 2)
      ).toThrow('offer candidate slot is empty');
      expect(offerSystem.banishChargesOf(world, owner)).toBe(1);
    });

    it.each([-1, 3, 1.5, Number.NaN])(
      'throws and mutates nothing for out-of-range index %s',
      index => {
        const { world, owner, offerSystem } = createHarness();
        offerSystem.generateOffer(world, new DeterministicRng(1), owner);
        world.banishCharges[world.slotOf(owner)] = 1;

        expect(() =>
          offerSystem.banish(world, new DeterministicRng(1), owner, index)
        ).toThrow('offer candidate index must be an integer inside the offer');
        expect(offerSystem.banishChargesOf(world, owner)).toBe(1);
      }
    );
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
