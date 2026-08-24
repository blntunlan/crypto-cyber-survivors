import { describe, expect, it } from 'vitest';

import {
  COMMAND_RECORDING_CAPACITY,
  INPUT_RECORDING_CAPACITY,
  MVP0_CONFIG_VERSION,
} from '@/game-v2/config/Mvp0Config';
import { type RuntimeCheckpoint } from '@/game-v2/contracts/RuntimeCheckpoint';
import { WORLD_SNAPSHOT_SCHEMA_VERSION } from '@/game-v2/contracts/WorldSnapshot';
import { ABILITY_SLOT_COUNT } from '@/game-v2/contracts/AbilitySlot';
import { RETIRED_ENTITY_GENERATION } from '@/game-v2/contracts/EntityId';
import {
  OFFER_CANDIDATE_COUNT,
  OFFER_KIND_ABILITY,
  OFFER_KIND_PASSIVE,
} from '@/game-v2/contracts/LevelUpOffer';
import { type PlayerIntent } from '@/game-v2/contracts/PlayerIntent';
import { createRunIdentity } from '@/game-v2/contracts/RunIdentity';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { World } from '@/game-v2/world/World';
import { CommandRecorder } from '@/game-v2/replay/CommandRecorder';
import { InputRecorder } from '@/game-v2/replay/InputRecorder';
import { hashRuntimeCheckpoint } from '@/game-v2/replay/StateHasher';
import { writeCheckpoint } from '@/game-v2/replay/WorldSnapshotWriter';
import { validateAuthoritativeWorldState } from '@/game-v2/replay/WorldStateValidator';

const ALL_FIXTURE_COMPONENTS =
  ComponentMask.Transform |
  ComponentMask.Velocity |
  ComponentMask.Body |
  ComponentMask.Health |
  ComponentMask.Faction |
  ComponentMask.Player |
  ComponentMask.Enemy |
  ComponentMask.Projectile |
  ComponentMask.XpPickup |
  ComponentMask.AbilityLoadout |
  ComponentMask.PassiveLoadout |
  ComponentMask.LevelUpOffer;

type RuntimeInput = Parameters<typeof writeCheckpoint>[0];

const writeComponentFixtureForward = (world: World, slot: number): void => {
  world.x[slot] = 1.25;
  world.y[slot] = -2.5;
  world.previousX[slot] = 0.75;
  world.previousY[slot] = -2;
  world.velocityX[slot] = 3.5;
  world.velocityY[slot] = -4.5;
  world.radius[slot] = 0.625;
  world.health[slot] = 91.5;
  world.maxHealth[slot] = 120;
  world.faction[slot] = -1;
  world.lastFacingX[slot] = -0.6;
  world.lastFacingY[slot] = 0.8;
  world.dashDirectionX[slot] = 1;
  world.dashDirectionY[slot] = 0;
  world.dashRemainingSeconds[slot] = 0.125;
  world.invulnerabilityTicksRemaining[slot] = 7;
  world.dashCooldownTicksRemaining[slot] = 149;
  world.dashCharges[slot] = 1;
  world.movementOverride[slot] = 1;
  world.enemySpeed[slot] = 2.75;
  world.contactDamage[slot] = 13.5;
  world.contactCooldownTicksRemaining[slot] = 19;
  world.xpValue[slot] = 5;
  world.projectileDamage[slot] = 10.25;
  world.projectileLifetimeTicksRemaining[slot] = 88;
  world.weaponCooldownTicksRemaining[slot] = 17;
  world.xp[slot] = 4.25;
  world.level[slot] = 3;
  world.xpPickupValue[slot] = 6.5;
  world.abilitySlotIdentity[world.abilitySlotIndexOf(slot, 0)] = 3;
  world.abilitySlotTier[world.abilitySlotIndexOf(slot, 0)] = 2;
  world.abilitySlotIdentity[world.abilitySlotIndexOf(slot, 2)] = 7;
  world.abilitySlotTier[world.abilitySlotIndexOf(slot, 2)] = 1;
  world.passiveSlotIdentity[world.passiveSlotIndexOf(slot, 0)] = 2;
  world.passiveSlotLevel[world.passiveSlotIndexOf(slot, 0)] = 5;
  world.passiveSlotIdentity[world.passiveSlotIndexOf(slot, 4)] = 9;
  world.passiveSlotLevel[world.passiveSlotIndexOf(slot, 4)] = 1;
  world.offerCandidateKind[world.offerSlotIndexOf(slot, 0)] = OFFER_KIND_ABILITY;
  world.offerCandidateCode[world.offerSlotIndexOf(slot, 0)] = 5;
  world.offerCandidateKind[world.offerSlotIndexOf(slot, 2)] = OFFER_KIND_PASSIVE;
  world.offerCandidateCode[world.offerSlotIndexOf(slot, 2)] = 9;
  world.offerDefaultIndex[slot] = 0;
  world.rerollCharges[slot] = 1;
  world.banishCharges[slot] = 0;
  world.bannedCandidateKind[slot] = OFFER_KIND_ABILITY;
  world.bannedCandidateCode[slot] = 3;
};

const writeComponentFixtureReverse = (world: World, slot: number): void => {
  world.bannedCandidateCode[slot] = 3;
  world.bannedCandidateKind[slot] = OFFER_KIND_ABILITY;
  world.banishCharges[slot] = 0;
  world.rerollCharges[slot] = 1;
  world.offerDefaultIndex[slot] = 0;
  world.offerCandidateCode[world.offerSlotIndexOf(slot, 2)] = 9;
  world.offerCandidateKind[world.offerSlotIndexOf(slot, 2)] = OFFER_KIND_PASSIVE;
  world.offerCandidateCode[world.offerSlotIndexOf(slot, 0)] = 5;
  world.offerCandidateKind[world.offerSlotIndexOf(slot, 0)] = OFFER_KIND_ABILITY;
  world.passiveSlotLevel[world.passiveSlotIndexOf(slot, 4)] = 1;
  world.passiveSlotIdentity[world.passiveSlotIndexOf(slot, 4)] = 9;
  world.passiveSlotLevel[world.passiveSlotIndexOf(slot, 0)] = 5;
  world.passiveSlotIdentity[world.passiveSlotIndexOf(slot, 0)] = 2;
  world.abilitySlotTier[world.abilitySlotIndexOf(slot, 2)] = 1;
  world.abilitySlotIdentity[world.abilitySlotIndexOf(slot, 2)] = 7;
  world.abilitySlotTier[world.abilitySlotIndexOf(slot, 0)] = 2;
  world.abilitySlotIdentity[world.abilitySlotIndexOf(slot, 0)] = 3;
  world.xpPickupValue[slot] = 6.5;
  world.level[slot] = 3;
  world.xp[slot] = 4.25;
  world.weaponCooldownTicksRemaining[slot] = 17;
  world.projectileLifetimeTicksRemaining[slot] = 88;
  world.projectileDamage[slot] = 10.25;
  world.xpValue[slot] = 5;
  world.contactCooldownTicksRemaining[slot] = 19;
  world.contactDamage[slot] = 13.5;
  world.enemySpeed[slot] = 2.75;
  world.movementOverride[slot] = 1;
  world.dashCharges[slot] = 1;
  world.dashCooldownTicksRemaining[slot] = 149;
  world.invulnerabilityTicksRemaining[slot] = 7;
  world.dashRemainingSeconds[slot] = 0.125;
  world.dashDirectionY[slot] = 0;
  world.dashDirectionX[slot] = 1;
  world.lastFacingY[slot] = 0.8;
  world.lastFacingX[slot] = -0.6;
  world.faction[slot] = -1;
  world.maxHealth[slot] = 120;
  world.health[slot] = 91.5;
  world.radius[slot] = 0.625;
  world.velocityY[slot] = -4.5;
  world.velocityX[slot] = 3.5;
  world.previousY[slot] = -2;
  world.previousX[slot] = 0.75;
  world.y[slot] = -2.5;
  world.x[slot] = 1.25;
};

const createRuntimeInput = (
  propertyOrder: 'forward' | 'reverse' = 'forward'
): RuntimeInput => {
  const world = new World(3);
  const entity = world.createEntity(ALL_FIXTURE_COMPONENTS);
  const slot = world.slotOf(entity);

  if (propertyOrder === 'forward') {
    writeComponentFixtureForward(world, slot);
    return {
      world,
      tick: 42,
      runIdentity: createRunIdentity('golden-run-α', 0x12345678),
      rngSnapshot: { schemaVersion: 1, state: 0x9abcdef0 },
      lifecycle: { phase: 'level-up', sessionEpoch: 3 },
      configVersion: MVP0_CONFIG_VERSION,
    };
  }

  writeComponentFixtureReverse(world, slot);
  return {
    configVersion: MVP0_CONFIG_VERSION,
    lifecycle: { sessionEpoch: 3, phase: 'level-up' },
    rngSnapshot: { state: 0x9abcdef0, schemaVersion: 1 },
    runIdentity: createRunIdentity('golden-run-α', 0x12345678),
    tick: 42,
    world,
  };
};

const checkpointHash = (input: RuntimeInput): string =>
  hashRuntimeCheckpoint(writeCheckpoint(input));

const hashAfterWorldMutation = (
  mutate: (world: World, slot: number) => void
): string => {
  const input = createRuntimeInput();
  mutate(input.world, 0);
  return checkpointHash(input);
};

describe('canonical runtime checkpoint', () => {
  it('locks the schema and fixed replay budgets independently', () => {
    expect(MVP0_CONFIG_VERSION).toBe(1);
    expect(INPUT_RECORDING_CAPACITY).toBe(216_000);
    expect(COMMAND_RECORDING_CAPACITY).toBe(64);
  });

  it('has a hard-coded binary FNV-1a golden independent of property write order', () => {
    const hashA = checkpointHash(createRuntimeInput('forward'));
    const hashB = checkpointHash(createRuntimeInput('reverse'));

    // V2-111 (V2-ADR-076): the golden shifted again because
    // `weaponCooldownTicksRemaining` moved out of the per-world-slot u16 run
    // and into the per-ability-slot loop, so each slot now contributes
    // `ABILITY_SLOT_COUNT` cooldown u16s instead of one. Recomputed and pinned
    // to schema 7.
    expect(WORLD_SNAPSHOT_SCHEMA_VERSION).toBe(7);
    expect(hashA).toBe('9760ebe8');
    expect(hashB).toBe(hashA);
    expect(hashA).toMatch(/^[0-9a-f]{8}$/);
  });

  it('copies every slot in ascending index order and only the active free-stack prefix', () => {
    const input = createRuntimeInput();
    const checkpoint = writeCheckpoint(input);

    expect(checkpoint.world.capacity).toBe(3);
    expect(checkpoint.world.generations).toEqual(new Uint32Array([0, 0, 0]));
    expect(checkpoint.world.masks).toEqual(
      new Uint32Array([ALL_FIXTURE_COMPONENTS, 0, 0])
    );
    expect(checkpoint.world.x).toEqual(new Float32Array([1.25, 0, 0]));
    expect(checkpoint.world.activeCount).toBe(1);
    expect(checkpoint.world.freeSlotCount).toBe(2);
    expect(checkpoint.world.freeSlots).toEqual(new Uint16Array([2, 1]));

    input.world.x[0] = 99;
    input.world.freeSlots[0] = 0;
    expect(checkpoint.world.x[0]).toBe(1.25);
    expect(checkpoint.world.freeSlots).toEqual(new Uint16Array([2, 1]));
  });

  it('changes for every runtime authority and allocator count', () => {
    const baseline = checkpointHash(createRuntimeInput());
    const cases: ReadonlyArray<readonly [string, (input: RuntimeInput) => void]> = [
      ['config version', input => (input.configVersion = 2)],
      ['tick', input => (input.tick = 43)],
      [
        'run id',
        input =>
          (input.runIdentity = createRunIdentity(
            'different-run',
            input.runIdentity.seed
          )),
      ],
      [
        'run seed',
        input =>
          (input.runIdentity = createRunIdentity(input.runIdentity.runId, 0x12345679)),
      ],
      [
        'RNG state',
        input => (input.rngSnapshot = { ...input.rngSnapshot, state: 0x9abcdef1 }),
      ],
      [
        'lifecycle phase',
        input => (input.lifecycle = { ...input.lifecycle, phase: 'playing' }),
      ],
      [
        'session epoch',
        input => (input.lifecycle = { ...input.lifecycle, sessionEpoch: 4 }),
      ],
      [
        'active and free counts',
        input => {
          input.world.createEntity(ComponentMask.Transform);
        },
      ],
    ];

    for (const [name, mutate] of cases) {
      const input = createRuntimeInput();
      mutate(input);
      expect(checkpointHash(input), name).not.toBe(baseline);
    }
  });

  it('changes for generation, mask, cooldown, and every component-store family', () => {
    const baseline = checkpointHash(createRuntimeInput());
    const cases: ReadonlyArray<
      readonly [string, (world: World, slot: number) => void]
    > = [
      ['generation', (world, slot) => (world.generations[slot] = 1)],
      [
        'mask',
        (world, slot) =>
          (world.masks[slot] = ALL_FIXTURE_COMPONENTS ^ ComponentMask.Body),
      ],
      ['transform', (world, slot) => (world.x[slot] = 1.5)],
      ['velocity', (world, slot) => (world.velocityX[slot] = 3.75)],
      ['body', (world, slot) => (world.radius[slot] = 0.75)],
      ['health', (world, slot) => (world.health[slot] = 90)],
      ['faction', (world, slot) => (world.faction[slot] = 1)],
      ['player', (world, slot) => (world.lastFacingX[slot] = 0.25)],
      [
        'passive identity',
        (world, slot) =>
          (world.passiveSlotIdentity[world.passiveSlotIndexOf(slot, 0)] = 6),
      ],
      [
        'passive level',
        (world, slot) =>
          (world.passiveSlotLevel[world.passiveSlotIndexOf(slot, 0)] = 4),
      ],
      [
        'passive slot position',
        (world, slot) => {
          const from = world.passiveSlotIndexOf(slot, 0);
          const to = world.passiveSlotIndexOf(slot, 1);
          world.passiveSlotIdentity[to] = world.passiveSlotIdentity[from] ?? 0;
          world.passiveSlotLevel[to] = world.passiveSlotLevel[from] ?? 0;
          world.passiveSlotIdentity[from] = 0;
          world.passiveSlotLevel[from] = 0;
        },
      ],
      ['cooldown', (world, slot) => (world.dashCooldownTicksRemaining[slot] = 150)],
      ['enemy', (world, slot) => (world.enemySpeed[slot] = 3)],
      ['projectile', (world, slot) => (world.projectileDamage[slot] = 11)],
      ['progression', (world, slot) => (world.xp[slot] = 5)],
      [
        'ability identity',
        (world, slot) =>
          (world.abilitySlotIdentity[world.abilitySlotIndexOf(slot, 0)] = 4),
      ],
      [
        'ability tier',
        (world, slot) => (world.abilitySlotTier[world.abilitySlotIndexOf(slot, 0)] = 3),
      ],
      [
        'ability slot position',
        (world, slot) => {
          const from = world.abilitySlotIndexOf(slot, 0);
          const to = world.abilitySlotIndexOf(slot, 1);
          world.abilitySlotIdentity[to] = world.abilitySlotIdentity[from] ?? 0;
          world.abilitySlotTier[to] = world.abilitySlotTier[from] ?? 0;
          world.abilitySlotIdentity[from] = 0;
          world.abilitySlotTier[from] = 0;
        },
      ],
      ['XP pickup', (world, slot) => (world.xpPickupValue[slot] = 7)],
      [
        'offer kind',
        (world, slot) =>
          (world.offerCandidateKind[world.offerSlotIndexOf(slot, 0)] =
            OFFER_KIND_PASSIVE),
      ],
      [
        'offer code',
        (world, slot) =>
          (world.offerCandidateCode[world.offerSlotIndexOf(slot, 0)] = 6),
      ],
      ['offer default index', (world, slot) => (world.offerDefaultIndex[slot] = 2)],
      ['reroll charges', (world, slot) => (world.rerollCharges[slot] = 0)],
      ['banish charges', (world, slot) => (world.banishCharges[slot] = 1)],
      [
        'banned candidate kind',
        (world, slot) => (world.bannedCandidateKind[slot] = OFFER_KIND_PASSIVE),
      ],
      ['banned candidate code', (world, slot) => (world.bannedCandidateCode[slot] = 4)],
      ['convergence', (world, slot) => (world.convergence[slot] = 12.5)],
      ['convergence reached', (world, slot) => (world.convergenceReached[slot] = 1)],
    ];

    for (const [name, mutate] of cases) {
      expect(hashAfterWorldMutation(mutate), name).not.toBe(baseline);
    }
  });

  it('hashes the allocator free-stack prefix in exact order but ignores its tail', () => {
    const createDestroyedPair = (reverseDestroyOrder: boolean): RuntimeInput => {
      const input = createRuntimeInput();
      const first = input.world.createEntity(ComponentMask.Transform);
      const second = input.world.createEntity(ComponentMask.Transform);

      if (reverseDestroyOrder) {
        input.world.destroyEntity(second);
        input.world.destroyEntity(first);
      } else {
        input.world.destroyEntity(first);
        input.world.destroyEntity(second);
      }

      return input;
    };

    const ordered = createDestroyedPair(false);
    const reversed = createDestroyedPair(true);
    expect(ordered.world.freeSlotCount).toBe(reversed.world.freeSlotCount);
    expect(checkpointHash(ordered)).not.toBe(checkpointHash(reversed));

    const withTailMutation = createRuntimeInput();
    withTailMutation.world.freeSlots[withTailMutation.world.freeSlotCount] = 2;
    expect(checkpointHash(withTailMutation)).toBe(checkpointHash(createRuntimeInput()));
  });

  it.each([
    [
      'active retired-generation sentinel',
      (input: RuntimeInput) => {
        input.world.generations[0] = RETIRED_ENTITY_GENERATION;
      },
    ],
    [
      'retired slot in the free prefix',
      (input: RuntimeInput) => {
        input.world.generations[input.world.freeSlots[0] ?? 0] =
          RETIRED_ENTITY_GENERATION;
      },
    ],
    [
      'omitted reusable slot',
      (input: RuntimeInput) => {
        (input.world as unknown as { freeSlotsInUse: number }).freeSlotsInUse -= 1;
      },
    ],
  ] as const)('rejects allocator corruption: %s', (_name, corrupt) => {
    const input = createRuntimeInput();
    corrupt(input);
    expect(() => writeCheckpoint(input)).toThrow(/allocator|slot|generation/i);
  });

  it('accepts a complete partition containing an inactive retired slot', () => {
    const checkpoint = writeCheckpoint(createRuntimeInput());
    checkpoint.world.generations[1] = RETIRED_ENTITY_GENERATION;
    const withRetiredSlot = {
      ...checkpoint,
      world: {
        ...checkpoint.world,
        freeSlotCount: 1,
        freeSlots: new Uint16Array([2]),
      },
    };

    expect(hashRuntimeCheckpoint(withRetiredSlot)).toMatch(/^[0-9a-f]{8}$/);
  });

  it.each([
    [
      'active retired-generation sentinel',
      (checkpoint: RuntimeCheckpoint) => {
        checkpoint.world.generations[0] = RETIRED_ENTITY_GENERATION;
      },
    ],
    [
      'retired slot in the free prefix',
      (checkpoint: RuntimeCheckpoint) => {
        checkpoint.world.generations[checkpoint.world.freeSlots[0] ?? 0] =
          RETIRED_ENTITY_GENERATION;
      },
    ],
    [
      'omitted reusable slot',
      (checkpoint: RuntimeCheckpoint) => {
        Object.assign(checkpoint.world, {
          freeSlotCount: 1,
          freeSlots: checkpoint.world.freeSlots.slice(0, 1),
        });
      },
    ],
  ] as const)('refuses to hash allocator corruption: %s', (_name, corrupt) => {
    const checkpoint = writeCheckpoint(createRuntimeInput());
    corrupt(checkpoint);
    expect(() => hashRuntimeCheckpoint(checkpoint)).toThrow(
      /allocator|slot|generation/i
    );
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects non-finite component value %s before publishing a checkpoint',
    invalid => {
      const input = createRuntimeInput();
      input.world.contactDamage[0] = invalid;

      expect(() => writeCheckpoint(input)).toThrow(/finite/i);
    }
  );

  it.each([
    [
      'tick',
      (input: RuntimeInput) => {
        input.tick = -1;
      },
    ],
    [
      'config version',
      (input: RuntimeInput) => {
        input.configVersion = 0;
      },
    ],
    [
      'lifecycle epoch',
      (input: RuntimeInput) => {
        input.lifecycle = { ...input.lifecycle, sessionEpoch: Number.NaN };
      },
    ],
  ] as const)(
    'rejects an invalid %s before publishing a checkpoint',
    (_name, mutate) => {
      const input = createRuntimeInput();
      mutate(input);
      expect(() => writeCheckpoint(input)).toThrow();
    }
  );

  it('rejects unsupported checkpoint, world, run identity, and RNG schemas', () => {
    const checkpoint = writeCheckpoint(createRuntimeInput());
    const unsupportedCheckpoint = {
      ...checkpoint,
      schemaVersion: 99,
    } as unknown as RuntimeCheckpoint;
    const unsupportedWorld = {
      ...checkpoint,
      world: { ...checkpoint.world, schemaVersion: 99 },
    } as unknown as RuntimeCheckpoint;
    const unsupportedRunIdentity = {
      ...checkpoint,
      runIdentity: { ...checkpoint.runIdentity, schemaVersion: 99 },
    } as unknown as RuntimeCheckpoint;
    const unsupportedRng = {
      ...checkpoint,
      rngSnapshot: { ...checkpoint.rngSnapshot, schemaVersion: 99 },
    } as unknown as RuntimeCheckpoint;

    expect(() => hashRuntimeCheckpoint(unsupportedCheckpoint)).toThrow(/schema/i);
    expect(() => hashRuntimeCheckpoint(unsupportedWorld)).toThrow(/schema/i);
    expect(() => hashRuntimeCheckpoint(unsupportedRunIdentity)).toThrow(/schema/i);
    expect(() => hashRuntimeCheckpoint(unsupportedRng)).toThrow(/schema/i);

    const invalidRunInput = createRuntimeInput();
    invalidRunInput.runIdentity = unsupportedRunIdentity.runIdentity;
    const invalidRngInput = createRuntimeInput();
    invalidRngInput.rngSnapshot = unsupportedRng.rngSnapshot;
    expect(() => writeCheckpoint(invalidRunInput)).toThrow(/schema/i);
    expect(() => writeCheckpoint(invalidRngInput)).toThrow(/schema/i);
  });

  it('rejects ability loadout state that breaks its structural invariants', () => {
    const cases: ReadonlyArray<readonly [string, RegExp, (world: World) => void]> = [
      [
        'tier above the ceiling',
        /tier is outside/i,
        world => {
          world.abilitySlotTier[world.abilitySlotIndexOf(0, 0)] = 4;
        },
      ],
      [
        'tier without an identity',
        /pair an identity with a tier/i,
        world => {
          world.abilitySlotIdentity[world.abilitySlotIndexOf(0, 1)] = 0;
          world.abilitySlotTier[world.abilitySlotIndexOf(0, 1)] = 1;
        },
      ],
      [
        'identity without a tier',
        /pair an identity with a tier/i,
        world => {
          world.abilitySlotIdentity[world.abilitySlotIndexOf(0, 1)] = 5;
          world.abilitySlotTier[world.abilitySlotIndexOf(0, 1)] = 0;
        },
      ],
      [
        'loadout on an entity without the component',
        /requires the AbilityLoadout component/i,
        world => {
          world.masks[0] = ALL_FIXTURE_COMPONENTS ^ ComponentMask.AbilityLoadout;
        },
      ],
      [
        'loadout on an empty world slot',
        /requires the AbilityLoadout component/i,
        world => {
          world.abilitySlotIdentity[world.abilitySlotIndexOf(1, 0)] = 5;
          world.abilitySlotTier[world.abilitySlotIndexOf(1, 0)] = 1;
        },
      ],
    ];

    for (const [name, message, mutate] of cases) {
      const input = createRuntimeInput();
      mutate(input.world);
      expect(() => writeCheckpoint(input), name).toThrow(message);
    }
  });

  it('rejects a weapon cooldown store still sized one entry per world slot', () => {
    // V2-111, V2-ADR-076. The pre-V2-111 store was `Uint16Array(capacity)`.
    // A forged checkpoint carrying that shape must be refused at the boundary
    // rather than silently read with the wrong stride.
    const input = createRuntimeInput();
    const capacity = input.world.masks.length;

    expect(input.world.weaponCooldownTicksRemaining).toHaveLength(
      capacity * ABILITY_SLOT_COUNT
    );

    (
      input.world as unknown as { weaponCooldownTicksRemaining: Uint16Array }
    ).weaponCooldownTicksRemaining = new Uint16Array(capacity);

    expect(() => writeCheckpoint(input)).toThrow(
      /weaponCooldownTicksRemaining must be a canonical typed store/
    );
  });

  it('rejects passive loadout state that breaks its structural invariants', () => {
    const cases: ReadonlyArray<readonly [string, RegExp, (world: World) => void]> = [
      [
        'level above the ceiling',
        /level is outside/i,
        world => {
          world.passiveSlotLevel[world.passiveSlotIndexOf(0, 0)] = 6;
        },
      ],
      [
        'level without an identity',
        /pair an identity with a level/i,
        world => {
          world.passiveSlotLevel[world.passiveSlotIndexOf(0, 1)] = 1;
        },
      ],
      [
        'identity without a level',
        /pair an identity with a level/i,
        world => {
          world.passiveSlotIdentity[world.passiveSlotIndexOf(0, 1)] = 5;
        },
      ],
      [
        'loadout on an entity without the component',
        /requires the PassiveLoadout component/i,
        world => {
          world.masks[0] = ALL_FIXTURE_COMPONENTS ^ ComponentMask.PassiveLoadout;
        },
      ],
      [
        'loadout on an empty world slot',
        /requires the PassiveLoadout component/i,
        world => {
          world.passiveSlotIdentity[world.passiveSlotIndexOf(1, 0)] = 5;
          world.passiveSlotLevel[world.passiveSlotIndexOf(1, 0)] = 1;
        },
      ],
    ];

    for (const [name, message, mutate] of cases) {
      const input = createRuntimeInput();
      mutate(input.world);
      expect(() => writeCheckpoint(input), name).toThrow(message);
    }
  });

  it('rejects level-up offer state that breaks its structural invariants', () => {
    const cases: ReadonlyArray<readonly [string, RegExp, (world: World) => void]> = [
      [
        'unsupported kind',
        /offer candidate kind is unsupported/i,
        world => {
          world.offerCandidateKind[world.offerSlotIndexOf(0, 1)] = 99;
          world.offerCandidateCode[world.offerSlotIndexOf(0, 1)] = 1;
        },
      ],
      [
        'kind without a code',
        /offer candidate must pair a kind with a code/i,
        world => {
          world.offerCandidateCode[world.offerSlotIndexOf(0, 0)] = 0;
        },
      ],
      [
        'code without a kind',
        /offer candidate must pair a kind with a code/i,
        world => {
          world.offerCandidateKind[world.offerSlotIndexOf(0, 1)] = 0;
          world.offerCandidateCode[world.offerSlotIndexOf(0, 1)] = 3;
        },
      ],
      [
        'offer on an entity without the component',
        /requires the LevelUpOffer component/i,
        world => {
          world.masks[0] = ALL_FIXTURE_COMPONENTS ^ ComponentMask.LevelUpOffer;
        },
      ],
      [
        'offer on an empty world slot',
        /requires the LevelUpOffer component/i,
        world => {
          world.offerCandidateKind[world.offerSlotIndexOf(1, 0)] = OFFER_KIND_ABILITY;
          world.offerCandidateCode[world.offerSlotIndexOf(1, 0)] = 4;
        },
      ],
      [
        'default index outside the offer',
        /offer default index is outside the offer/i,
        world => {
          world.offerDefaultIndex[0] = 3;
        },
      ],
      [
        'default index pointing at an empty candidate',
        /offer default index must select an occupied candidate/i,
        world => {
          world.offerDefaultIndex[0] = 1;
        },
      ],
      [
        'two candidates sharing the same kind and code',
        /offer candidates must be pairwise distinct/i,
        world => {
          // The fixture's own index 0 is {ABILITY, 5}; duplicating it into
          // the empty index 1 must be rejected (V2-109 review finding: this
          // exact duplicate state was reachable through
          // `LevelUpOfferSystem.banish`'s pre-fix redraw pool).
          world.offerCandidateKind[world.offerSlotIndexOf(0, 1)] = OFFER_KIND_ABILITY;
          world.offerCandidateCode[world.offerSlotIndexOf(0, 1)] = 5;
        },
      ],
    ];

    for (const [name, message, mutate] of cases) {
      const input = createRuntimeInput();
      mutate(input.world);
      expect(() => writeCheckpoint(input), name).toThrow(message);
    }
  });

  it('rejects reroll/banish charge and banned-candidate state that breaks its structural invariants', () => {
    const cases: ReadonlyArray<readonly [string, RegExp, (world: World) => void]> = [
      [
        'reroll charge above 1',
        /reroll charges must be 0 or 1/i,
        world => {
          world.rerollCharges[0] = 2;
        },
      ],
      [
        'banish charge above 1',
        /banish charges must be 0 or 1/i,
        world => {
          world.banishCharges[0] = 2;
        },
      ],
      [
        'reroll charge on an entity without the component',
        /offer charges require the LevelUpOffer component/i,
        world => {
          // Clears the fixture's own offer candidates first so this case
          // isolates the charge-ownership check rather than tripping the
          // earlier offer-candidate ownership check for the same reason.
          world.masks[0] = ALL_FIXTURE_COMPONENTS ^ ComponentMask.LevelUpOffer;
          for (let index = 0; index < OFFER_CANDIDATE_COUNT; index += 1) {
            world.offerCandidateKind[world.offerSlotIndexOf(0, index)] = 0;
            world.offerCandidateCode[world.offerSlotIndexOf(0, index)] = 0;
          }
          world.offerDefaultIndex[0] = 0;
        },
      ],
      [
        'banish charge on an empty world slot',
        /offer charges require the LevelUpOffer component/i,
        world => {
          world.banishCharges[1] = 1;
        },
      ],
      [
        'unsupported banned kind',
        /banned candidate kind is unsupported/i,
        world => {
          world.bannedCandidateKind[0] = 99;
          world.bannedCandidateCode[0] = 1;
        },
      ],
      [
        'banned kind without a code',
        /banned candidate must pair a kind with a code/i,
        world => {
          world.bannedCandidateCode[0] = 0;
        },
      ],
      [
        'banned code without a kind',
        /banned candidate must pair a kind with a code/i,
        world => {
          world.bannedCandidateKind[0] = 0;
          world.bannedCandidateCode[0] = 5;
        },
      ],
      [
        'banned candidate on an entity without the component',
        /banned candidate requires the LevelUpOffer component/i,
        world => {
          // Clears the fixture's own offer candidates and charges first so
          // this case isolates the banned-candidate ownership check.
          world.masks[0] = ALL_FIXTURE_COMPONENTS ^ ComponentMask.LevelUpOffer;
          for (let index = 0; index < OFFER_CANDIDATE_COUNT; index += 1) {
            world.offerCandidateKind[world.offerSlotIndexOf(0, index)] = 0;
            world.offerCandidateCode[world.offerSlotIndexOf(0, index)] = 0;
          }
          world.offerDefaultIndex[0] = 0;
          world.rerollCharges[0] = 0;
          world.banishCharges[0] = 0;
        },
      ],
      [
        'banned candidate on an empty world slot',
        /banned candidate requires the LevelUpOffer component/i,
        world => {
          world.bannedCandidateKind[1] = OFFER_KIND_ABILITY;
          world.bannedCandidateCode[1] = 2;
        },
      ],
    ];

    for (const [name, message, mutate] of cases) {
      const input = createRuntimeInput();
      mutate(input.world);
      expect(() => writeCheckpoint(input), name).toThrow(message);
    }
  });

  it('rejects a passive store that is not one entry per passive slot', () => {
    const input = createRuntimeInput();
    Object.defineProperty(input.world, 'passiveSlotLevel', {
      value: new Uint8Array(input.world.masks.length),
    });

    expect(() => writeCheckpoint(input)).toThrow(
      'passiveSlotLevel must be a canonical typed store'
    );
  });

  it('rejects an ability store that is not one entry per ability slot', () => {
    const input = createRuntimeInput();
    Object.defineProperty(input.world, 'abilitySlotTier', {
      value: new Uint8Array(input.world.masks.length),
    });

    expect(() => writeCheckpoint(input)).toThrow(
      'abilitySlotTier must be a canonical typed store'
    );
  });

  it('rejects a non-finite checkpoint value without producing a hash', () => {
    const checkpoint = writeCheckpoint(createRuntimeInput());
    checkpoint.world.x[0] = Number.NaN;

    expect(() => hashRuntimeCheckpoint(checkpoint)).toThrow(/finite/i);
  });

  it('rejects prototype property names as unsupported lifecycle phases', () => {
    const checkpoint = writeCheckpoint(createRuntimeInput());
    const invalidPhase = {
      ...checkpoint,
      lifecycle: { ...checkpoint.lifecycle, phase: 'toString' },
    } as unknown as RuntimeCheckpoint;

    expect(() => hashRuntimeCheckpoint(invalidPhase)).toThrow(/phase/i);
  });

  it('rejects a world writer input above the locked 4096-slot bound', () => {
    const input = createRuntimeInput();
    Object.defineProperty(input.world, 'masks', {
      value: new Uint32Array(4097),
    });

    expect(() => writeCheckpoint(input)).toThrow(/4096/);
  });

  it('refuses to hash a forged canonical snapshot above the 4096-slot bound', () => {
    const checkpoint = writeCheckpoint(createRuntimeInput());
    const oversized = {
      ...checkpoint,
      world: { ...checkpoint.world, capacity: 4097 },
    } as RuntimeCheckpoint;

    expect(() => hashRuntimeCheckpoint(oversized)).toThrow(/4096/);
  });
});

describe('shared authoritative world validation', () => {
  type CorruptibleWorldState = Pick<
    World,
    'contactDamage' | 'freeSlots' | 'generations' | 'xpPickupValue'
  >;

  it('accepts both clean live-world and snapshot representations', () => {
    const input = createRuntimeInput();
    const checkpoint = writeCheckpoint(createRuntimeInput());

    expect(() =>
      validateAuthoritativeWorldState(input.world, input.world.masks.length)
    ).not.toThrow();
    expect(() =>
      validateAuthoritativeWorldState(checkpoint.world, checkpoint.world.capacity)
    ).not.toThrow();
  });

  it.each([
    [
      'non-finite component',
      (state: CorruptibleWorldState) => {
        state.contactDamage[0] = Number.NaN;
      },
    ],
    [
      'active retired sentinel',
      (state: CorruptibleWorldState) => {
        state.generations[0] = RETIRED_ENTITY_GENERATION;
      },
    ],
    [
      'duplicate free prefix slot',
      (state: CorruptibleWorldState) => {
        state.freeSlots[1] = state.freeSlots[0] ?? 0;
      },
    ],
    [
      'authoritative store length mismatch',
      (state: CorruptibleWorldState) => {
        Object.defineProperty(state, 'xpPickupValue', {
          value: new Float32Array(2),
        });
      },
    ],
  ] as const)(
    'rejects the same forged %s through writer and hasher',
    (_name, corrupt) => {
      const input = createRuntimeInput();
      corrupt(input.world);
      expect(() => writeCheckpoint(input)).toThrow();

      const checkpoint = writeCheckpoint(createRuntimeInput());
      corrupt(checkpoint.world);
      expect(() => hashRuntimeCheckpoint(checkpoint)).toThrow();
    }
  );
});

describe('InputRecorder', () => {
  it('keeps preallocated history private and reads contiguous frames into caller output', () => {
    const recorder = new InputRecorder();
    const mutableIntent: PlayerIntent = {
      moveX: 0,
      moveY: 0,
      dashPressed: false,
    };
    mutableIntent.moveX = 0.6;
    mutableIntent.moveY = 0.8;
    mutableIntent.dashPressed = true;

    expect('ticks' in recorder).toBe(false);
    expect('moveX' in recorder).toBe(false);
    expect('moveY' in recorder).toBe(false);
    expect('dashPressed' in recorder).toBe(false);
    expect('framesInUse' in recorder).toBe(false);
    expect(recorder.capacity).toBe(216_000);

    recorder.record(1, mutableIntent);
    mutableIntent.moveX = 0;
    mutableIntent.moveY = 0;
    mutableIntent.dashPressed = false;
    recorder.record(2, { moveX: -1, moveY: 0, dashPressed: false });

    expect(recorder.count).toBe(2);
    const first = { tick: 0, moveX: 0, moveY: 0, dashPressed: false };
    const second = { tick: 0, moveX: 0, moveY: 0, dashPressed: true };
    recorder.read(0, first);
    recorder.read(1, second);
    expect(first.tick).toBe(1);
    expect(first.moveX).toBeCloseTo(0.6);
    expect(first.moveY).toBeCloseTo(0.8);
    expect(first.dashPressed).toBe(true);
    expect(second).toEqual({ tick: 2, moveX: -1, moveY: 0, dashPressed: false });
  });

  it('does not let caller output mutation rewrite recorded history', () => {
    const recorder = new InputRecorder();
    recorder.record(1, { moveX: 0.25, moveY: -0.5, dashPressed: true });
    const output = { tick: 0, moveX: 0, moveY: 0, dashPressed: false };

    recorder.read(0, output);
    output.tick = 99;
    output.moveX = 1;
    output.moveY = 0;
    output.dashPressed = false;
    recorder.read(0, output);

    expect(output).toEqual({
      tick: 1,
      moveX: 0.25,
      moveY: -0.5,
      dashPressed: true,
    });
  });

  it.each([-1, 1, 1.5, Number.NaN])(
    'rejects invalid read index %s without changing caller output',
    index => {
      const recorder = new InputRecorder();
      recorder.record(1, { moveX: 0.25, moveY: -0.5, dashPressed: true });
      const output = { tick: 77, moveX: 0.75, moveY: 0, dashPressed: false };

      expect(() => recorder.read(index, output)).toThrow(/index/i);
      expect(output).toEqual({
        tick: 77,
        moveX: 0.75,
        moveY: 0,
        dashPressed: false,
      });
    }
  );

  it.each([
    ['missing first tick', 2, { moveX: 0, moveY: 0, dashPressed: false }],
    ['duplicate tick', 1, { moveX: 0, moveY: 0, dashPressed: false }],
    ['non-finite movement', 2, { moveX: Number.NaN, moveY: 0, dashPressed: false }],
    ['oversized movement', 2, { moveX: 0.8, moveY: 0.8, dashPressed: false }],
    ['non-boolean dash', 2, { moveX: 0, moveY: 0, dashPressed: 1 }],
  ] as const)('rejects %s atomically', (_name, tick, intent) => {
    const recorder = new InputRecorder();
    if (tick !== 2 || _name !== 'missing first tick') {
      recorder.record(1, { moveX: 0.25, moveY: -0.5, dashPressed: true });
    }
    const beforeCount = recorder.count;
    const before = { tick: 0, moveX: 0, moveY: 0, dashPressed: false };
    if (beforeCount > 0) {
      recorder.read(0, before);
    }

    expect(() => recorder.record(tick, intent as never)).toThrow();
    expect(recorder.count).toBe(beforeCount);
    if (beforeCount > 0) {
      const after = { tick: 0, moveX: 0, moveY: 0, dashPressed: false };
      recorder.read(0, after);
      expect(after).toEqual(before);
    }
  });

  it('throws on fixed-capacity overflow without altering the recorded prefix', () => {
    const recorder = new InputRecorder();
    for (let tick = 1; tick <= INPUT_RECORDING_CAPACITY; tick += 1) {
      recorder.record(tick, { moveX: 0, moveY: 0, dashPressed: false });
    }

    expect(() =>
      recorder.record(INPUT_RECORDING_CAPACITY + 1, {
        moveX: 1,
        moveY: 0,
        dashPressed: true,
      })
    ).toThrow(/capacity|overflow/i);
    expect(recorder.count).toBe(INPUT_RECORDING_CAPACITY);
    const last = { tick: 0, moveX: 0, moveY: 0, dashPressed: true };
    recorder.read(INPUT_RECORDING_CAPACITY - 1, last);
    expect(last).toEqual({
      tick: INPUT_RECORDING_CAPACITY,
      moveX: 0,
      moveY: 0,
      dashPressed: false,
    });
  });
});

describe('CommandRecorder', () => {
  it('preallocates exactly the configured capacity and preserves insertion order', () => {
    const recorder = new CommandRecorder();
    const first = {
      tick: 0,
      type: 'choose-upgrade',
      choiceIndex: 0,
    } as const;
    const second = {
      tick: 42,
      type: 'choose-upgrade',
      choiceIndex: 0,
    } as const;

    recorder.record(first);
    recorder.record(second);

    expect('commands' in recorder).toBe(false);
    expect('entries' in recorder).toBe(false);
    expect('commandsInUse' in recorder).toBe(false);
    expect(recorder.capacity).toBe(64);
    expect(recorder.count).toBe(2);
    expect(recorder.read(0)).toEqual(first);
    expect(recorder.read(1)).toEqual(second);
  });

  it('copies and freezes commands so caller mutation cannot rewrite recorded history', () => {
    const recorder = new CommandRecorder();
    const callerOwned = {
      tick: 7,
      type: 'choose-upgrade',
      choiceIndex: 0,
    } as const;

    recorder.record(callerOwned);
    (callerOwned as { tick: number }).tick = 99;

    expect(recorder.read(0)).not.toBe(callerOwned);
    expect(recorder.read(0)).toEqual({
      tick: 7,
      type: 'choose-upgrade',
      choiceIndex: 0,
    });
    expect(Object.isFrozen(recorder.read(0))).toBe(true);
  });

  it.each([-1, 0, 0.5, Number.NaN])('rejects invalid command read index %s', index => {
    const recorder = new CommandRecorder();
    expect(() => recorder.read(index)).toThrow(/index/i);
    expect(recorder.count).toBe(0);
  });

  it.each([
    ['negative tick', { tick: -1, type: 'choose-upgrade', choiceIndex: 0 }],
    ['fractional tick', { tick: 1.5, type: 'choose-upgrade', choiceIndex: 0 }],
    ['wrong command', { tick: 1, type: 'reroll', choiceIndex: 0 }],
    ['wrong choice', { tick: 1, type: 'choose-upgrade', choiceIndex: 3 }],
  ] as const)('rejects %s atomically', (_name, command) => {
    const recorder = new CommandRecorder();
    expect(() => recorder.record(command as never)).toThrow();
    expect(recorder.count).toBe(0);
    expect(() => recorder.read(0)).toThrow(/index/i);
  });

  it('rejects duplicate and non-monotonic paused ticks without changing the prefix', () => {
    const recorder = new CommandRecorder();
    recorder.record({
      tick: 9,
      type: 'choose-upgrade',
      choiceIndex: 0,
    });

    for (const tick of [9, 8]) {
      expect(() =>
        recorder.record({
          tick,
          type: 'choose-upgrade',
          choiceIndex: 0,
        })
      ).toThrow(/tick/i);
      expect(recorder.count).toBe(1);
      expect(recorder.read(0).tick).toBe(9);
    }
  });

  it('throws on fixed-capacity overflow without altering the recorded prefix', () => {
    const recorder = new CommandRecorder();
    for (let tick = 0; tick < COMMAND_RECORDING_CAPACITY; tick += 1) {
      recorder.record({
        tick,
        type: 'choose-upgrade',
        choiceIndex: 0,
      });
    }

    expect(() =>
      recorder.record({
        tick: COMMAND_RECORDING_CAPACITY,
        type: 'choose-upgrade',
        choiceIndex: 0,
      })
    ).toThrow(/capacity|overflow/i);
    expect(recorder.count).toBe(COMMAND_RECORDING_CAPACITY);
    expect(recorder.read(COMMAND_RECORDING_CAPACITY - 1).tick).toBe(
      COMMAND_RECORDING_CAPACITY - 1
    );
  });
});
