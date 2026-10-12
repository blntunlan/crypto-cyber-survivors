import { describe, expect, it, vi } from 'vitest';

import {
  ENEMY_HEALTH,
  ENEMY_XP_VALUE,
  LEVEL_2_XP_THRESHOLD,
  PLAYER_MAX_HEALTH,
  PLAYER_MOVE_SPEED,
  PLAYER_RADIUS,
  PLAYER_STARTING_LEVEL,
  PROJECTILE_DAMAGE,
  SIMULATION_HZ,
  STARTER_WEAPON_DAMAGE_TIER_2,
  WEAPON_RANGE,
  XP_PICKUP_LIFETIME_TICKS,
  XP_PICKUP_RADIUS,
} from '@/game-v2/config/Mvp0Config';
import {
  LEVEL_XP_STEP,
  levelXpThreshold,
  MVP1_MAX_PLAYER_LEVEL,
} from '@/game-v2/config/LevelCurve';
import { type CombatStepResult } from '@/game-v2/contracts/CombatStepResult';
import { type EntityId } from '@/game-v2/contracts/EntityId';
import {
  OFFER_CANDIDATE_COUNT,
  type OfferCandidateIndex,
  type OfferCandidate,
} from '@/game-v2/contracts/LevelUpOffer';
import { type RunCommand } from '@/game-v2/contracts/RunCommand';
import { type StepContext } from '@/game-v2/contracts/StepContext';
import { CommandRecorder } from '@/game-v2/replay/CommandRecorder';
import { DeterministicRng } from '@/game-v2/runtime/DeterministicRng';
import { GameV2Lifecycle } from '@/game-v2/runtime/GameV2Lifecycle';
import { CombatSystem } from '@/game-v2/systems/CombatSystem';
import { DashSystem } from '@/game-v2/systems/DashSystem';
import { EnemySystem } from '@/game-v2/systems/EnemySystem';
import { LevelUpOfferSystem } from '@/game-v2/systems/LevelUpOfferSystem';
import { MovementSystem } from '@/game-v2/systems/MovementSystem';
import { ProgressionSystem } from '@/game-v2/systems/ProgressionSystem';
import {
  createAbilityRegistry,
  HEAVY_PROJECTILE,
  MVP1_ABILITY_REGISTRY,
  NEEDLE_PROJECTILE,
  RAPID_PROJECTILE,
  STARTER_PROJECTILE,
  type AbilityRegistry,
} from '@/game-v2/config/AbilityRegistry';
import { MOVE_SPEED_PASSIVE } from '@/game-v2/config/PassiveRegistry';
import {
  PASSIVE_MAX_LEVEL,
  PASSIVE_MOVE_SPEED_BY_LEVEL,
} from '@/game-v2/contracts/PassiveSlot';
import { AbilityLoadoutSystem } from '@/game-v2/systems/AbilityLoadoutSystem';
import { PassiveLoadoutSystem } from '@/game-v2/systems/PassiveLoadoutSystem';
import { WeaponSystem } from '@/game-v2/systems/WeaponSystem';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { World } from '@/game-v2/world/World';

const PLAYER_MASK =
  ComponentMask.Transform |
  ComponentMask.Velocity |
  ComponentMask.Body |
  ComponentMask.Health |
  ComponentMask.Player |
  ComponentMask.AbilityLoadout |
  ComponentMask.PassiveLoadout |
  ComponentMask.LevelUpOffer;

const XP_PICKUP_MASK =
  ComponentMask.Transform | ComponentMask.Body | ComponentMask.XpPickup;

const FIXED_DELTA_SECONDS = 1 / SIMULATION_HZ;

const createContext = (
  tick: number,
  moveX = 0,
  moveY = 0,
  dashPressed = false
): StepContext => ({
  tick,
  deltaSeconds: FIXED_DELTA_SECONDS,
  intent: { moveX, moveY, dashPressed },
});

const createEmptyCombatResult = (): CombatStepResult => ({
  playerDied: false,
  killCount: 0,
  killX: new Float32Array(32),
  killY: new Float32Array(32),
  killXp: new Float32Array(32),
});

const createCombatResultWithKills = (
  kills: Array<{ x: number; y: number; xp: number }>
): CombatStepResult => {
  const res = createEmptyCombatResult();
  res.killCount = kills.length;
  for (let i = 0; i < kills.length; i += 1) {
    const k = kills[i]!;
    res.killX[i] = k.x;
    res.killY[i] = k.y;
    res.killXp[i] = k.xp;
  }
  return res;
};

/**
 * Creates a raw player entity without initializing health, maxHealth, radius,
 * the ability loadout, xp, or level. The system-specific resetPlayer methods must own
 * their respective fields.
 */
const createRawPlayer = (world: World, x = 0, y = 0): EntityId => {
  const player = world.createEntity(PLAYER_MASK);
  const slot = world.slotOf(player);
  world.x[slot] = x;
  world.y[slot] = y;
  world.previousX[slot] = x;
  world.previousY[slot] = y;
  return player;
};

/**
 * Builds a `ProgressionSystem` whose ability/passive/offer systems the test
 * keeps a reference to, so it can inspect the offer a real level-up
 * generates (its candidate order is RNG-shuffled, so no test may hardcode an
 * index without first checking what it holds).
 */
/**
 * A registry holding `starter-projectile` alone.
 *
 * `V2-111` made every occupied `auto` slot fire, so a test can no longer park
 * unwanted identities in slots 1-3 to keep them out of the offer pool — they
 * would fire. Narrowing the registry is the V2-ADR-039 way to constrain the
 * offer pool without changing what the player is holding.
 */
const STARTER_ONLY_ABILITY_REGISTRY = createAbilityRegistry([STARTER_PROJECTILE]);

const createHarness = (
  lifecycle: GameV2Lifecycle,
  commandRecorder: CommandRecorder,
  abilityRegistry: AbilityRegistry = MVP1_ABILITY_REGISTRY
): {
  progression: ProgressionSystem;
  abilityLoadout: AbilityLoadoutSystem;
  passiveLoadout: PassiveLoadoutSystem;
  offerSystem: LevelUpOfferSystem;
} => {
  const abilityLoadout = new AbilityLoadoutSystem(abilityRegistry);
  const passiveLoadout = new PassiveLoadoutSystem();
  const offerSystem = new LevelUpOfferSystem(
    abilityLoadout,
    passiveLoadout,
    abilityRegistry
  );
  const progression = new ProgressionSystem(
    lifecycle,
    commandRecorder,
    abilityLoadout,
    passiveLoadout,
    offerSystem
  );
  return { progression, abilityLoadout, passiveLoadout, offerSystem };
};

/** Finds the offer index of the first candidate of the given kind. */
const findOfferIndex = (
  offerSystem: LevelUpOfferSystem,
  world: World,
  player: EntityId,
  kind: OfferCandidate['kind'],
  identity?: string
): OfferCandidateIndex => {
  const candidates = offerSystem.candidatesAt(world, player);

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (
      candidate?.kind === kind &&
      (identity === undefined || candidate.identity === identity)
    ) {
      return index as OfferCandidateIndex;
    }
  }

  throw new Error(`no ${kind} candidate in the current offer`);
};

/**
 * Maxes `heavy-projectile` and `rapid-projectile` so `starter-projectile` is
 * the only offerable ability identity. Filling and maxing the other three
 * ability slots (whichever non-starter identities are chosen) closes the
 * free-slot escape hatch `isOfferable` grants any *un-held* identity, which
 * is what actually excludes the remaining four registered identities
 * (V2-107 grew the pool to eight) without needing to hold all seven at
 * once — only four ability slots exist. Tests that assert a specific offer
 * resolution affects the starter weapon use this to make its inclusion in
 * the next offer deterministic rather than RNG-dependent.
 */
const excludeNonStarterAbilitiesFromOffer = (
  abilityLoadout: AbilityLoadoutSystem,
  world: World,
  player: EntityId
): void => {
  for (const identity of [
    HEAVY_PROJECTILE.id,
    RAPID_PROJECTILE.id,
    NEEDLE_PROJECTILE.id,
  ]) {
    abilityLoadout.addOrAdvanceTier(world, player, identity);
    abilityLoadout.addOrAdvanceTier(world, player, identity);
    abilityLoadout.addOrAdvanceTier(world, player, identity);
  }
};

describe('Progression config invariants', () => {
  it('P1: forces LEVEL_2_XP_THRESHOLD to equal ENEMY_XP_VALUE for one-kill level up in MVP-0', () => {
    expect(LEVEL_2_XP_THRESHOLD).toBe(ENEMY_XP_VALUE);
  });

  it('P2: forces STARTER_WEAPON_DAMAGE_TIER_2 to be strictly higher and reduce hits to kill an enemy', () => {
    expect(STARTER_WEAPON_DAMAGE_TIER_2).toBeGreaterThan(PROJECTILE_DAMAGE);
    const tier1Hits = Math.ceil(ENEMY_HEALTH / PROJECTILE_DAMAGE);
    const tier2Hits = Math.ceil(ENEMY_HEALTH / STARTER_WEAPON_DAMAGE_TIER_2);
    expect(tier2Hits).toBeLessThan(tier1Hits);
  });

  it('P3: guarantees discrete player movement cannot tunnel through an XP pickup in a single tick', () => {
    const travelPerTick = PLAYER_MOVE_SPEED / SIMULATION_HZ;
    const collectionDistance = PLAYER_RADIUS + XP_PICKUP_RADIUS;
    expect(travelPerTick).toBeLessThan(collectionDistance);
  });

  it('P4: guarantees collection is a physical walk-over rather than full-screen vacuum', () => {
    const collectionDistance = PLAYER_RADIUS + XP_PICKUP_RADIUS;
    expect(collectionDistance).toBeLessThan(WEAPON_RANGE / 4);
  });

  it('P5: ensures valid positive pickup radius and bounded progression levels', () => {
    expect(XP_PICKUP_RADIUS).toBeGreaterThan(0);
    expect(Number.isFinite(XP_PICKUP_RADIUS)).toBe(true);
    expect(PLAYER_STARTING_LEVEL).toBe(1);
    // Since `V2-112` the cap is a full build's worth of picks, not one
    // (V2-ADR-080). The derivation itself is pinned in `LevelCurve.test.ts`.
    expect(MVP1_MAX_PLAYER_LEVEL).toBeGreaterThan(PLAYER_STARTING_LEVEL + 1);
  });
});

describe('ProgressionStepResult lifecycle and reuse', () => {
  it('reuses the exact same result object across multiple steps', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const progression = new ProgressionSystem(lifecycle, commandRecorder);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    const result1 = progression.step(
      world,
      player,
      createEmptyCombatResult(),
      createContext(0),
      new DeterministicRng(1)
    );
    const result2 = progression.step(
      world,
      player,
      createEmptyCombatResult(),
      createContext(1),
      new DeterministicRng(1)
    );

    expect(result2).toBe(result1);
  });

  it('resets step counters and flags cleanly across steps with and without events', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const progression = new ProgressionSystem(lifecycle, commandRecorder);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    const combatWithKill = createCombatResultWithKills([{ x: 10, y: 10, xp: 5 }]);
    const res1 = progression.step(
      world,
      player,
      combatWithKill,
      createContext(0),
      new DeterministicRng(1)
    );

    expect(res1.pickupsSpawned).toBe(1);
    expect(res1.xpCollected).toBe(0);
    expect(res1.leveledUp).toBe(false);
    expect(res1.offerPending).toBe(false);

    const res2 = progression.step(
      world,
      player,
      createEmptyCombatResult(),
      createContext(1),
      new DeterministicRng(1)
    );

    expect(res2.pickupsSpawned).toBe(0);
    expect(res2.xpCollected).toBe(0);
    expect(res2.leveledUp).toBe(false);
    expect(res2.offerPending).toBe(false);
  });

  it('lets terminal death dominate a simultaneous kill and clears reused result output', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const playerSlot = world.slotOf(player);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    weaponSystem.resetPlayer(world, player);
    const progression = new ProgressionSystem(lifecycle, commandRecorder);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    const priorResult = progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 0, y: 0, xp: LEVEL_2_XP_THRESHOLD }]),
      createContext(0),
      new DeterministicRng(1)
    );
    expect(priorResult).toEqual({
      pickupsSpawned: 1,
      xpCollected: LEVEL_2_XP_THRESHOLD,
      leveledUp: true,
      offerPending: true,
    });
    progression.resolveUpgrade(world, player, {
      tick: 0,
      type: 'choose-upgrade',
      choiceIndex: 0,
    });
    progression.resetPlayer(world, player);
    weaponSystem.resetPlayer(world, player);

    const freeSlotsBeforeDeath = world.freeSlotCount;
    const activeCountBeforeDeath = world.activeCount;
    const simultaneousKillAndDeath = createCombatResultWithKills([
      { x: 0, y: 0, xp: LEVEL_2_XP_THRESHOLD },
    ]);
    simultaneousKillAndDeath.playerDied = true;

    const terminalResult = progression.step(
      world,
      player,
      simultaneousKillAndDeath,
      createContext(1),
      new DeterministicRng(1)
    );

    expect(terminalResult).toBe(priorResult);
    expect(terminalResult).toEqual({
      pickupsSpawned: 0,
      xpCollected: 0,
      leveledUp: false,
      offerPending: false,
    });
    expect(world.freeSlotCount).toBe(freeSlotsBeforeDeath);
    expect(world.activeCount).toBe(activeCountBeforeDeath);
    expect(world.xp[playerSlot]).toBe(0);
    expect(world.level[playerSlot]).toBe(PLAYER_STARTING_LEVEL);
    expect(lifecycle.phase).toBe('playing');

    lifecycle.endRun();
    expect(lifecycle.phase).toBe('game-over');
  });

  it('returns terminal output before validating the ignored kill payload', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const progression = new ProgressionSystem(lifecycle, new CommandRecorder());
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);
    const terminalWithMalformedKills = createEmptyCombatResult();
    terminalWithMalformedKills.playerDied = true;
    terminalWithMalformedKills.killCount = Number.MAX_SAFE_INTEGER;

    expect(
      progression.step(
        world,
        player,
        terminalWithMalformedKills,
        createContext(0),
        new DeterministicRng(1)
      )
    ).toEqual({
      pickupsSpawned: 0,
      xpCollected: 0,
      leveledUp: false,
      offerPending: false,
    });
    expect(world.activeCount).toBe(1);
    expect(lifecycle.phase).toBe('playing');
  });

  it('rejects a forged non-boolean death signal without mutating progression', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const playerSlot = world.slotOf(player);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const progression = new ProgressionSystem(lifecycle, new CommandRecorder());
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);
    const forged = createCombatResultWithKills([
      { x: 0, y: 0, xp: LEVEL_2_XP_THRESHOLD },
    ]) as unknown as { playerDied: unknown };
    forged.playerDied = 'yes';
    const freeSlotsBefore = world.freeSlotCount;

    expect(() =>
      progression.step(
        world,
        player,
        forged as unknown as CombatStepResult,
        createContext(0),
        new DeterministicRng(1)
      )
    ).toThrow(TypeError);
    expect(world.freeSlotCount).toBe(freeSlotsBefore);
    expect(world.xp[playerSlot]).toBe(0);
    expect(world.level[playerSlot]).toBe(PLAYER_STARTING_LEVEL);
    expect(lifecycle.phase).toBe('playing');
  });
});

describe('Player progression initialization (resetPlayer)', () => {
  it('initializes xp to 0 and level to PLAYER_STARTING_LEVEL on a zeroed slot', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const playerSlot = world.slotOf(player);

    expect(world.xp[playerSlot]).toBe(0);
    expect(world.level[playerSlot]).toBe(0);

    const lifecycle = new GameV2Lifecycle();
    const commandRecorder = new CommandRecorder();
    const progression = new ProgressionSystem(lifecycle, commandRecorder);

    progression.resetPlayer(world, player);

    expect(world.xp[playerSlot]).toBe(0);
    expect(world.level[playerSlot]).toBe(PLAYER_STARTING_LEVEL);
  });

  it('rejects a player entity missing required components without mutating stores', () => {
    const world = new World(16);
    const invalidPlayer = world.createEntity(
      ComponentMask.Transform | ComponentMask.Health | ComponentMask.Player
    );
    const slot = world.slotOf(invalidPlayer);

    const lifecycle = new GameV2Lifecycle();
    const commandRecorder = new CommandRecorder();
    const progression = new ProgressionSystem(lifecycle, commandRecorder);

    expect(() => progression.resetPlayer(world, invalidPlayer)).toThrow(RangeError);
    expect(world.xp[slot]).toBe(0);
    expect(world.level[slot]).toBe(0);
  });

  it('rejects stepping a player that was never initialized by resetPlayer', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    combatResetPlayerHelper(world, player);

    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const progression = new ProgressionSystem(lifecycle, commandRecorder);

    expect(() =>
      progression.step(
        world,
        player,
        createEmptyCombatResult(),
        createContext(0),
        new DeterministicRng(1)
      )
    ).toThrow(RangeError);
  });
});

describe('XP Pickup spawning', () => {
  it('spawns one XP pickup per kill with full store initialization', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const progression = new ProgressionSystem(lifecycle, commandRecorder);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    const kills = [
      { x: 5.5, y: -2.25, xp: 5 },
      { x: -10, y: 8, xp: 15 },
    ];
    const combatResult = createCombatResultWithKills(kills);

    const res = progression.step(
      world,
      player,
      combatResult,
      createContext(0),
      new DeterministicRng(1)
    );

    expect(res.pickupsSpawned).toBe(2);

    let pickupCount = 0;
    for (let slot = 0; slot < world.masks.length; slot += 1) {
      const mask = world.masks[slot] ?? 0;
      if ((mask & XP_PICKUP_MASK) === XP_PICKUP_MASK) {
        pickupCount += 1;
        expect(world.radius[slot]).toBeCloseTo(XP_PICKUP_RADIUS);
        expect(world.previousX[slot]).toBe(world.x[slot]);
        expect(world.previousY[slot]).toBe(world.y[slot]);
      }
    }
    expect(pickupCount).toBe(2);
  });

  it('rejects batch spawn atomically if freeSlotCount is less than killCount', () => {
    const world = new World(4);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const progression = new ProgressionSystem(lifecycle, commandRecorder);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    world.createEntity(ComponentMask.Body);
    world.createEntity(ComponentMask.Body);
    expect(world.freeSlotCount).toBe(1);

    const combatResult = createCombatResultWithKills([
      { x: 10, y: 10, xp: 5 },
      { x: 20, y: 20, xp: 5 },
    ]);

    expect(() =>
      progression.step(
        world,
        player,
        combatResult,
        createContext(0),
        new DeterministicRng(1)
      )
    ).toThrow(RangeError);

    let pickupCount = 0;
    for (let slot = 0; slot < world.masks.length; slot += 1) {
      const mask = world.masks[slot] ?? 0;
      if ((mask & XP_PICKUP_MASK) === XP_PICKUP_MASK) {
        pickupCount += 1;
      }
    }
    expect(pickupCount).toBe(0);
    expect(world.freeSlotCount).toBe(1);
  });

  it('rejects a malformed later kill before publishing an earlier valid pickup', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const progression = new ProgressionSystem(lifecycle, new CommandRecorder());
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);
    const freeSlotsBefore = world.freeSlotCount;

    const combatResult = createCombatResultWithKills([
      { x: 10, y: 10, xp: 5 },
      { x: Number.NaN, y: 20, xp: 5 },
    ]);

    expect(() =>
      progression.step(
        world,
        player,
        combatResult,
        createContext(0),
        new DeterministicRng(1)
      )
    ).toThrow(RangeError);

    expect(world.freeSlotCount).toBe(freeSlotsBefore);
    for (let slot = 0; slot < world.masks.length; slot += 1) {
      expect(((world.masks[slot] ?? 0) & XP_PICKUP_MASK) === XP_PICKUP_MASK).toBe(
        false
      );
    }
  });

  it('rejects an unsafe or out-of-bounds kill batch before allocating', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const progression = new ProgressionSystem(lifecycle, new CommandRecorder());
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);
    const freeSlotsBefore = world.freeSlotCount;
    const malformed = createEmptyCombatResult();
    malformed.killCount = Number.MAX_SAFE_INTEGER;

    expect(() =>
      progression.step(
        world,
        player,
        malformed,
        createContext(0),
        new DeterministicRng(1)
      )
    ).toThrow(RangeError);
    expect(world.freeSlotCount).toBe(freeSlotsBefore);
  });

  it('requires typed kill buffers before allocating any pickup', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const progression = new ProgressionSystem(lifecycle, new CommandRecorder());
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);
    const freeSlotsBefore = world.freeSlotCount;
    const malformed = {
      ...createEmptyCombatResult(),
      killCount: 1,
      killX: [0],
    } as unknown as CombatStepResult;

    expect(() =>
      progression.step(
        world,
        player,
        malformed,
        createContext(0),
        new DeterministicRng(1)
      )
    ).toThrow(TypeError);
    expect(world.freeSlotCount).toBe(freeSlotsBefore);
  });
});

describe('XP Pickup collection and overlap', () => {
  it('collects overlapping pickup exactly once, adds XP, and destroys the pickup entity', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const progression = new ProgressionSystem(lifecycle, commandRecorder);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    const pickupXpValue = 3;
    const combatResult = createCombatResultWithKills([
      { x: 20, y: 20, xp: pickupXpValue },
    ]);
    progression.step(
      world,
      player,
      combatResult,
      createContext(0),
      new DeterministicRng(1)
    );

    let pickupSlot = -1;
    for (let slot = 0; slot < world.masks.length; slot += 1) {
      if (((world.masks[slot] ?? 0) & XP_PICKUP_MASK) === XP_PICKUP_MASK) {
        pickupSlot = slot;
        break;
      }
    }
    expect(pickupSlot).toBeGreaterThanOrEqual(0);
    const pickupEntity = world.entityIdOf(pickupSlot);

    world.x[pickupSlot] = 0.2;
    world.y[pickupSlot] = 0.1;

    const res = progression.step(
      world,
      player,
      createEmptyCombatResult(),
      createContext(1),
      new DeterministicRng(1)
    );

    expect(res.xpCollected).toBe(pickupXpValue);
    expect(world.isAlive(pickupEntity)).toBe(false);
    expect(world.masks[pickupSlot]).toBe(0);
    expect(world.xpPickupValue[pickupSlot]).toBe(0);

    const resNext = progression.step(
      world,
      player,
      createEmptyCombatResult(),
      createContext(2),
      new DeterministicRng(1)
    );
    expect(resNext.xpCollected).toBe(0);
  });

  it('does not collect pickup outside overlap radius', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const playerSlot = world.slotOf(player);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const progression = new ProgressionSystem(lifecycle, commandRecorder);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    const combatResult = createCombatResultWithKills([{ x: 10, y: 10, xp: 5 }]);
    progression.step(
      world,
      player,
      combatResult,
      createContext(0),
      new DeterministicRng(1)
    );

    const res = progression.step(
      world,
      player,
      createEmptyCombatResult(),
      createContext(1),
      new DeterministicRng(1)
    );

    expect(res.xpCollected).toBe(0);
    expect(world.xp[playerSlot]).toBe(0);
  });

  it('collects pickup at exact touch boundary', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const progression = new ProgressionSystem(lifecycle, commandRecorder);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    const exactDistance = PLAYER_RADIUS + XP_PICKUP_RADIUS;
    const combatResult = createCombatResultWithKills([
      { x: exactDistance, y: 0, xp: 5 },
    ]);
    const res = progression.step(
      world,
      player,
      combatResult,
      createContext(0),
      new DeterministicRng(1)
    );

    expect(res.xpCollected).toBe(5);
  });

  it('collects multiple overlapping pickups in a single tick and adds their total XP', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const progression = new ProgressionSystem(lifecycle, commandRecorder);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    const combatResult = createCombatResultWithKills([
      { x: 0, y: 0, xp: 5 },
      { x: 0.1, y: 0.1, xp: 10 },
    ]);

    const res = progression.step(
      world,
      player,
      combatResult,
      createContext(0),
      new DeterministicRng(1)
    );

    expect(res.xpCollected).toBe(15);
  });

  it('destroys an existing leftover pickup and a newly-spawned overlapping pickup in the same tick', () => {
    // Locks in the single-pass overlap-collection refactor: existing
    // pickups are recorded as overlapping during the validation scan, new
    // kill pickups are recorded as overlapping right after creation, and
    // one final pass destroys both sets — this is the one scenario that
    // exercises both recording paths landing in the same destroy pass.
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const progression = new ProgressionSystem(lifecycle, commandRecorder);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    // A far-away kill leaves a real, non-overlapping pickup entity behind,
    // then it is repositioned onto the player to become the "existing
    // leftover pickup" the next step must find during its validation scan.
    progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 20, y: 20, xp: 7 }]),
      createContext(0),
      new DeterministicRng(1)
    );
    let existingSlot = -1;
    for (let slot = 0; slot < world.masks.length; slot += 1) {
      if (((world.masks[slot] ?? 0) & XP_PICKUP_MASK) === XP_PICKUP_MASK) {
        existingSlot = slot;
        break;
      }
    }
    expect(existingSlot).toBeGreaterThanOrEqual(0);
    const existingEntity = world.entityIdOf(existingSlot);
    world.x[existingSlot] = 0;
    world.y[existingSlot] = 0;

    const res = progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 0, y: 0, xp: 11 }]),
      createContext(1),
      new DeterministicRng(1)
    );

    expect(res.xpCollected).toBe(18);
    expect(world.isAlive(existingEntity)).toBe(false);

    let livePickupCount = 0;
    for (let slot = 0; slot < world.masks.length; slot += 1) {
      if (((world.masks[slot] ?? 0) & XP_PICKUP_MASK) === XP_PICKUP_MASK) {
        livePickupCount += 1;
      }
    }
    expect(livePickupCount).toBe(0);
  });

  it('collects pickup spawned in the same tick if enemy dies on top of player', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const progression = new ProgressionSystem(lifecycle, commandRecorder);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    const combatResult = createCombatResultWithKills([{ x: 0, y: 0, xp: 5 }]);
    const res = progression.step(
      world,
      player,
      combatResult,
      createContext(0),
      new DeterministicRng(1)
    );

    expect(res.pickupsSpawned).toBe(1);
    expect(res.xpCollected).toBe(5);
    expect(res.leveledUp).toBe(true);
  });

  it('validates every pickup before collecting any earlier valid pickup', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const playerSlot = world.slotOf(player);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const progression = new ProgressionSystem(lifecycle, new CommandRecorder());
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    const firstPickup = world.createEntity(XP_PICKUP_MASK);
    const firstSlot = world.slotOf(firstPickup);
    world.x[firstSlot] = 0;
    world.y[firstSlot] = 0;
    world.radius[firstSlot] = XP_PICKUP_RADIUS;
    world.xpPickupValue[firstSlot] = 3;

    const malformedLaterPickup = world.createEntity(XP_PICKUP_MASK);
    const laterSlot = world.slotOf(malformedLaterPickup);
    world.x[laterSlot] = Number.NaN;
    world.y[laterSlot] = 0;
    world.radius[laterSlot] = XP_PICKUP_RADIUS;
    world.xpPickupValue[laterSlot] = 2;

    expect(() =>
      progression.step(
        world,
        player,
        createEmptyCombatResult(),
        createContext(0),
        new DeterministicRng(1)
      )
    ).toThrow(RangeError);

    expect(world.isAlive(firstPickup)).toBe(true);
    expect(world.isAlive(malformedLaterPickup)).toBe(true);
    expect(world.xp[playerSlot]).toBe(0);
    expect(lifecycle.phase).toBe('playing');
  });

  it('rejects aggregate XP overflow before destroying any collectible pickup', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const playerSlot = world.slotOf(player);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const progression = new ProgressionSystem(lifecycle, new CommandRecorder());
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);
    const maximumFiniteFloat32 = 3.4028234663852886e38;

    const firstPickup = world.createEntity(XP_PICKUP_MASK);
    const firstSlot = world.slotOf(firstPickup);
    world.radius[firstSlot] = XP_PICKUP_RADIUS;
    world.xpPickupValue[firstSlot] = maximumFiniteFloat32;

    const secondPickup = world.createEntity(XP_PICKUP_MASK);
    const secondSlot = world.slotOf(secondPickup);
    world.radius[secondSlot] = XP_PICKUP_RADIUS;
    world.xpPickupValue[secondSlot] = maximumFiniteFloat32;

    expect(() =>
      progression.step(
        world,
        player,
        createEmptyCombatResult(),
        createContext(0),
        new DeterministicRng(1)
      )
    ).toThrow(RangeError);

    expect(world.isAlive(firstPickup)).toBe(true);
    expect(world.isAlive(secondPickup)).toBe(true);
    expect(world.xp[playerSlot]).toBe(0);
    expect(lifecycle.phase).toBe('playing');
  });
});

describe('Level progression, surplus XP, and pause trigger', () => {
  it('requires lifecycle phase playing before progression can mutate the world', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    const progression = new ProgressionSystem(lifecycle, new CommandRecorder());
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    expect(() =>
      progression.step(
        world,
        player,
        createCombatResultWithKills([{ x: 10, y: 10, xp: 5 }]),
        createContext(0),
        new DeterministicRng(1)
      )
    ).toThrow(RangeError);
    expect(world.freeSlotCount).toBe(15);
  });

  it('advances level to 2, retains surplus XP, and pauses for level-up', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const playerSlot = world.slotOf(player);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const progression = new ProgressionSystem(lifecycle, commandRecorder);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    const surplusXp = 8;
    const combatResult = createCombatResultWithKills([{ x: 0, y: 0, xp: surplusXp }]);

    const res = progression.step(
      world,
      player,
      combatResult,
      createContext(42),
      new DeterministicRng(1)
    );

    expect(res.leveledUp).toBe(true);
    expect(res.offerPending).toBe(true);
    expect(world.level[playerSlot]).toBe(2);
    expect(world.xp[playerSlot]).toBe(surplusXp - LEVEL_2_XP_THRESHOLD);
    expect(lifecycle.phase).toBe('level-up');
  });

  it('does not level again until the next, higher threshold is met', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const playerSlot = world.slotOf(player);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    weaponSystem.resetPlayer(world, player);
    const progression = new ProgressionSystem(lifecycle, commandRecorder);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 0, y: 0, xp: LEVEL_2_XP_THRESHOLD }]),
      createContext(10),
      new DeterministicRng(1)
    );
    expect(world.level[playerSlot]).toBe(2);
    expect(lifecycle.phase).toBe('level-up');

    const command: RunCommand = {
      tick: 10,
      type: 'choose-upgrade',
      choiceIndex: 0,
    };
    progression.resolveUpgrade(world, player, command);
    expect(lifecycle.phase).toBe('playing');

    const res2 = progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 0, y: 0, xp: LEVEL_2_XP_THRESHOLD }]),
      createContext(20),
      new DeterministicRng(1)
    );

    // Since `V2-112` the curve repeats, so this no longer proves a hard cap —
    // it proves the *next* threshold is higher than one kill. Level 2 costs
    // `levelXpThreshold(2) = 7`, and a single grunt kill is worth 5.
    expect(levelXpThreshold(2)).toBe(LEVEL_2_XP_THRESHOLD + LEVEL_XP_STEP);
    expect(LEVEL_2_XP_THRESHOLD).toBeLessThan(levelXpThreshold(2));
    expect(res2.leveledUp).toBe(false);
    expect(res2.offerPending).toBe(false);
    expect(world.level[playerSlot]).toBe(2);
    expect(world.xp[playerSlot]).toBe(LEVEL_2_XP_THRESHOLD);
    expect(lifecycle.phase).toBe('playing');
  });

  it('levels again once the higher threshold is met', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const playerSlot = world.slotOf(player);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    weaponSystem.resetPlayer(world, player);
    const { progression } = createHarness(lifecycle, commandRecorder);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 0, y: 0, xp: levelXpThreshold(1) }]),
      createContext(10),
      new DeterministicRng(1)
    );
    expect(world.level[playerSlot]).toBe(2);

    progression.resolveUpgrade(world, player, {
      tick: 10,
      type: 'choose-upgrade',
      choiceIndex: 0,
    });
    expect(lifecycle.phase).toBe('playing');

    const res = progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 0, y: 0, xp: levelXpThreshold(2) }]),
      createContext(20),
      new DeterministicRng(1)
    );

    expect(res.leveledUp).toBe(true);
    expect(res.offerPending).toBe(true);
    expect(world.level[playerSlot]).toBe(3);
    expect(world.xp[playerSlot]).toBe(0);
    expect(lifecycle.phase).toBe('level-up');
  });

  it('advances exactly one level per tick and retains the surplus', () => {
    // V2-ADR-081: one card per pick. A kill batch worth two thresholds must
    // not silently consume two picks for one card.
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const playerSlot = world.slotOf(player);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    weaponSystem.resetPlayer(world, player);
    const { progression } = createHarness(lifecycle, commandRecorder);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    const twoLevelsWorth = levelXpThreshold(1) + levelXpThreshold(2);

    const res = progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 0, y: 0, xp: twoLevelsWorth }]),
      createContext(10),
      new DeterministicRng(1)
    );

    expect(res.leveledUp).toBe(true);
    expect(world.level[playerSlot]).toBe(2);
    expect(world.xp[playerSlot]).toBe(twoLevelsWorth - levelXpThreshold(1));

    // Resolving the card re-enters the branch on the very next step, because
    // the retained surplus already clears the next threshold.
    progression.resolveUpgrade(world, player, {
      tick: 10,
      type: 'choose-upgrade',
      choiceIndex: 0,
    });
    expect(lifecycle.phase).toBe('playing');

    const res2 = progression.step(
      world,
      player,
      createCombatResultWithKills([]),
      createContext(11),
      new DeterministicRng(1)
    );

    expect(res2.leveledUp).toBe(true);
    expect(world.level[playerSlot]).toBe(3);
    expect(lifecycle.phase).toBe('level-up');
  });

  it('leaves level and xp unchanged when nothing is offerable and the level-up throws', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const playerSlot = world.slotOf(player);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const { progression, abilityLoadout, passiveLoadout } = createHarness(
      lifecycle,
      commandRecorder
    );
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    // Exhaust the entire MVP-1 offerable pool. Only four ability slots exist,
    // so filling and maxing all four (rather than holding all eight
    // registered identities, which would not fit) closes the free-slot
    // escape hatch `isOfferable` grants any un-held identity — that is what
    // actually excludes the four abilities never held here (V2-107 grew the
    // registry to eight) — plus the move-speed passive to its level ceiling.
    // Once nothing is offerable, `generateOffer` throws before
    // `resolveUpgrade` can ever run, so this proves the level-up branch does
    // not commit `level`/`xp` ahead of that throw.
    for (const abilityId of [
      STARTER_PROJECTILE.id,
      HEAVY_PROJECTILE.id,
      RAPID_PROJECTILE.id,
      NEEDLE_PROJECTILE.id,
    ]) {
      abilityLoadout.addOrAdvanceTier(world, player, abilityId);
      abilityLoadout.addOrAdvanceTier(world, player, abilityId);
      abilityLoadout.addOrAdvanceTier(world, player, abilityId);
    }
    for (let i = 0; i < PASSIVE_MAX_LEVEL; i += 1) {
      passiveLoadout.addOrLevelUp(world, player, MOVE_SPEED_PASSIVE.id);
    }

    expect(() =>
      progression.step(
        world,
        player,
        createCombatResultWithKills([{ x: 0, y: 0, xp: LEVEL_2_XP_THRESHOLD }]),
        createContext(10),
        new DeterministicRng(1)
      )
    ).toThrow('no offerable candidates exist');

    expect(world.level[playerSlot]).toBe(PLAYER_STARTING_LEVEL);
    expect(world.xp[playerSlot]).toBe(0);
    expect(lifecycle.phase).toBe('playing');
  });

  it('throws RangeError if step is called while an upgrade offer is pending', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const progression = new ProgressionSystem(lifecycle, commandRecorder);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 0, y: 0, xp: LEVEL_2_XP_THRESHOLD }]),
      createContext(10),
      new DeterministicRng(1)
    );

    expect(() =>
      progression.step(
        world,
        player,
        createEmptyCombatResult(),
        createContext(11),
        new DeterministicRng(1)
      )
    ).toThrow(RangeError);
  });

  it('lets a fresh system resolve an offer represented only by lifecycle state', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    weaponSystem.resetPlayer(world, player);
    const { progression, offerSystem, abilityLoadout } = createHarness(
      lifecycle,
      commandRecorder
    );
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);
    excludeNonStarterAbilitiesFromOffer(abilityLoadout, world, player);

    progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 0, y: 0, xp: LEVEL_2_XP_THRESHOLD }]),
      createContext(10),
      new DeterministicRng(1)
    );
    const abilityIndex = findOfferIndex(offerSystem, world, player, 'ability');

    const { progression: restoredSystem } = createHarness(lifecycle, commandRecorder);
    const restoredPausedTickCommand: RunCommand = {
      tick: 500,
      type: 'choose-upgrade',
      choiceIndex: abilityIndex,
    };

    restoredSystem.resolveUpgrade(world, player, restoredPausedTickCommand);

    expect(commandRecorder.read(0)).toEqual(restoredPausedTickCommand);
    expect(weaponSystem.starterDamageOf(world, player)).toBe(
      STARTER_WEAPON_DAMAGE_TIER_2
    );
    expect(lifecycle.phase).toBe('playing');
  });
});

describe('Upgrade resolution (resolveUpgrade)', () => {
  it('resolves upgrade by recording command, applying weapon upgrade, and resuming lifecycle', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    weaponSystem.resetPlayer(world, player);
    const { progression, offerSystem, abilityLoadout } = createHarness(
      lifecycle,
      commandRecorder
    );
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);
    excludeNonStarterAbilitiesFromOffer(abilityLoadout, world, player);

    progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 0, y: 0, xp: LEVEL_2_XP_THRESHOLD }]),
      createContext(15),
      new DeterministicRng(1)
    );

    expect(lifecycle.phase).toBe('level-up');

    const command: RunCommand = {
      tick: 15,
      type: 'choose-upgrade',
      choiceIndex: findOfferIndex(offerSystem, world, player, 'ability'),
    };

    progression.resolveUpgrade(world, player, command);

    expect(commandRecorder.count).toBe(1);
    expect(commandRecorder.read(0)).toEqual(command);
    expect(weaponSystem.starterDamageOf(world, player)).toBe(
      STARTER_WEAPON_DAMAGE_TIER_2
    );
    expect(lifecycle.phase).toBe('playing');

    expect(() => progression.resolveUpgrade(world, player, command)).toThrow(
      RangeError
    );
  });

  it('rejects resolveUpgrade when no offer is pending', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    weaponSystem.resetPlayer(world, player);
    const progression = new ProgressionSystem(lifecycle, commandRecorder);
    progression.resetPlayer(world, player);

    const command: RunCommand = {
      tick: 0,
      type: 'choose-upgrade',
      choiceIndex: 0,
    };

    expect(() => progression.resolveUpgrade(world, player, command)).toThrow(
      RangeError
    );
  });

  it('accepts the owning runtime command tick without a hidden paused-tick latch', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    weaponSystem.resetPlayer(world, player);
    const { progression, offerSystem, abilityLoadout } = createHarness(
      lifecycle,
      commandRecorder
    );
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);
    excludeNonStarterAbilitiesFromOffer(abilityLoadout, world, player);

    progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 0, y: 0, xp: LEVEL_2_XP_THRESHOLD }]),
      createContext(25),
      new DeterministicRng(1)
    );

    const restoredPausedTickCommand: RunCommand = {
      tick: 24,
      type: 'choose-upgrade',
      choiceIndex: findOfferIndex(offerSystem, world, player, 'ability'),
    };

    progression.resolveUpgrade(world, player, restoredPausedTickCommand);

    expect(commandRecorder.read(0)).toEqual(restoredPausedTickCommand);
    expect(weaponSystem.starterDamageOf(world, player)).toBe(
      STARTER_WEAPON_DAMAGE_TIER_2
    );
    expect(lifecycle.phase).toBe('playing');
  });

  it('records command BEFORE applying damage upgrade so recorder failure does not mutate world', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    weaponSystem.resetPlayer(world, player);
    const { progression, offerSystem } = createHarness(lifecycle, commandRecorder);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 0, y: 0, xp: LEVEL_2_XP_THRESHOLD }]),
      createContext(10),
      new DeterministicRng(1)
    );

    const badCommand = {
      tick: 10,
      type: 'invalid-type' as unknown as 'choose-upgrade',
      choiceIndex: findOfferIndex(offerSystem, world, player, 'ability'),
    };

    expect(() =>
      progression.resolveUpgrade(
        world,
        player,
        badCommand as unknown as RunCommand & { type: 'choose-upgrade' }
      )
    ).toThrow();
    expect(weaponSystem.starterDamageOf(world, player)).toBe(PROJECTILE_DAMAGE);
    expect(lifecycle.phase).toBe('level-up');
  });
});

describe('Passive upgrade resolution', () => {
  it('resolves the passive choice into a move-speed level and resumes', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    const { progression, passiveLoadout, offerSystem, abilityLoadout } = createHarness(
      lifecycle,
      commandRecorder
    );
    const movement = new MovementSystem(passiveLoadout);
    weaponSystem.resetPlayer(world, player);
    progression.resetPlayer(world, player);
    lifecycle.start();
    // Leave only starter-projectile offerable as an ability, so the
    // three-slot draw is guaranteed to include the passive candidate
    // regardless of RNG (V2-107 grew the ability pool to eight, crowding
    // out the single passive identity often enough that seed 1 alone no
    // longer guarantees it).
    excludeNonStarterAbilitiesFromOffer(abilityLoadout, world, player);
    // A real offer requires a real level-up trigger, which the offer-index
    // tests below drive through `step`; this test only needs an open offer
    // to resolve against, so it seeds one directly.
    offerSystem.generateOffer(world, new DeterministicRng(1), player);
    lifecycle.pauseForLevelUp();

    const command: RunCommand = {
      tick: 12,
      type: 'choose-upgrade',
      choiceIndex: findOfferIndex(offerSystem, world, player, 'passive'),
    };

    progression.resolveUpgrade(world, player, command);

    expect(commandRecorder.read(0)).toEqual(command);
    expect(passiveLoadout.levelOf(world, player, MOVE_SPEED_PASSIVE.id)).toBe(1);
    expect(movement.moveSpeedOf(world, player)).toBe(PASSIVE_MOVE_SPEED_BY_LEVEL[1]);
    expect(weaponSystem.starterDamageOf(world, player)).toBe(PROJECTILE_DAMAGE);
    expect(lifecycle.phase).toBe('playing');
  });

  it('leaves the passive untouched when the weapon choice is taken', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    const { progression, passiveLoadout, offerSystem, abilityLoadout } = createHarness(
      lifecycle,
      commandRecorder
    );
    weaponSystem.resetPlayer(world, player);
    progression.resetPlayer(world, player);
    lifecycle.start();
    excludeNonStarterAbilitiesFromOffer(abilityLoadout, world, player);
    offerSystem.generateOffer(world, new DeterministicRng(1), player);
    lifecycle.pauseForLevelUp();

    progression.resolveUpgrade(world, player, {
      tick: 3,
      type: 'choose-upgrade',
      choiceIndex: findOfferIndex(offerSystem, world, player, 'ability'),
    });

    expect(passiveLoadout.levelOf(world, player, MOVE_SPEED_PASSIVE.id)).toBeNull();
    expect(weaponSystem.starterDamageOf(world, player)).toBe(
      STARTER_WEAPON_DAMAGE_TIER_2
    );
  });

  it('rejects an unsupported choice before it can change the world', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    const { progression, passiveLoadout, offerSystem } = createHarness(
      lifecycle,
      commandRecorder
    );
    weaponSystem.resetPlayer(world, player);
    progression.resetPlayer(world, player);
    lifecycle.start();
    offerSystem.generateOffer(world, new DeterministicRng(1), player);
    lifecycle.pauseForLevelUp();

    expect(() =>
      progression.resolveUpgrade(world, player, {
        tick: 4,
        type: 'choose-upgrade',
        choiceIndex: 3,
      } as unknown as RunCommand & { type: 'choose-upgrade' })
    ).toThrow('offer candidate index must be an integer inside the offer');

    expect(commandRecorder.count).toBe(0);
    expect(passiveLoadout.levelOf(world, player, MOVE_SPEED_PASSIVE.id)).toBeNull();
    expect(weaponSystem.starterDamageOf(world, player)).toBe(PROJECTILE_DAMAGE);
    expect(lifecycle.phase).toBe('level-up');
  });
});

describe('resetPlayer initializes reroll/banish charges', () => {
  it('sets both charges to 1 and clears any prior ban', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    const commandRecorder = new CommandRecorder();
    const { progression } = createHarness(lifecycle, commandRecorder);

    const slot = world.slotOf(player);
    world.bannedCandidateKind[slot] = 1;
    world.bannedCandidateCode[slot] = 9;

    progression.resetPlayer(world, player);

    expect(world.rerollCharges[slot]).toBe(1);
    expect(world.banishCharges[slot]).toBe(1);
    expect(world.bannedCandidateKind[slot]).toBe(0);
    expect(world.bannedCandidateCode[slot]).toBe(0);
  });
});

describe('Reroll (rerollOffer)', () => {
  it('spends the charge, regenerates the offer, records the command, and keeps the lifecycle paused', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    weaponSystem.resetPlayer(world, player);
    const { progression, offerSystem } = createHarness(lifecycle, commandRecorder);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 0, y: 0, xp: LEVEL_2_XP_THRESHOLD }]),
      createContext(15),
      new DeterministicRng(1)
    );
    expect(lifecycle.phase).toBe('level-up');
    // MVP-1's default registries offer four identities (three abilities,
    // V2-106, plus one passive), so a fresh offer can coincidentally
    // reproduce the same candidate order as the one it replaces. A spy on
    // the real regeneration call is what actually proves reroll ran, rather
    // than an equality check that a shuffle can pass by chance.
    const generateOfferSpy = vi.spyOn(offerSystem, 'generateOffer');

    const command: RunCommand = { tick: 15, type: 'reroll-offer' };
    progression.rerollOffer(world, player, command, new DeterministicRng(999));

    expect(commandRecorder.count).toBe(1);
    expect(commandRecorder.read(0)).toEqual(command);
    expect(offerSystem.rerollChargesOf(world, player)).toBe(0);
    expect(generateOfferSpy).toHaveBeenCalledTimes(1);
    expect(generateOfferSpy).toHaveBeenCalledWith(world, expect.anything(), player);
    const after = offerSystem.candidatesAt(world, player);
    expect(after.filter(candidate => candidate !== null)).toHaveLength(
      OFFER_CANDIDATE_COUNT
    );
    expect(lifecycle.phase).toBe('level-up');
  });

  it('rejects reroll when lifecycle is not in level-up phase and mutates nothing', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const { progression } = createHarness(lifecycle, commandRecorder);
    progression.resetPlayer(world, player);

    expect(() =>
      progression.rerollOffer(
        world,
        player,
        { tick: 0, type: 'reroll-offer' },
        new DeterministicRng(1)
      )
    ).toThrow('cannot reroll offer when lifecycle is not in level-up phase');
    expect(commandRecorder.count).toBe(0);
  });

  it('rejects a second reroll once the charge is spent, without recording a second command', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    weaponSystem.resetPlayer(world, player);
    const { progression, offerSystem } = createHarness(lifecycle, commandRecorder);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 0, y: 0, xp: LEVEL_2_XP_THRESHOLD }]),
      createContext(15),
      new DeterministicRng(1)
    );
    progression.rerollOffer(
      world,
      player,
      { tick: 15, type: 'reroll-offer' },
      new DeterministicRng(1)
    );
    const after = offerSystem.candidatesAt(world, player);

    expect(() =>
      progression.rerollOffer(
        world,
        player,
        { tick: 15, type: 'reroll-offer' },
        new DeterministicRng(2)
      )
    ).toThrow('no reroll charge remains');
    expect(commandRecorder.count).toBe(1);
    expect(offerSystem.candidatesAt(world, player)).toEqual(after);
  });
});

describe('Banish (banishOffer)', () => {
  it('spends the charge, bans the identity, records the command, and keeps the lifecycle paused', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    weaponSystem.resetPlayer(world, player);
    const { progression, offerSystem } = createHarness(lifecycle, commandRecorder);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 0, y: 0, xp: LEVEL_2_XP_THRESHOLD }]),
      createContext(15),
      new DeterministicRng(1)
    );
    expect(lifecycle.phase).toBe('level-up');
    const targetIndex = findOfferIndex(offerSystem, world, player, 'ability');
    const banished = offerSystem.resolveIndex(world, player, targetIndex);

    const command: RunCommand = {
      tick: 15,
      type: 'banish-offer',
      choiceIndex: targetIndex,
    };
    progression.banishOffer(world, player, command, new DeterministicRng(3));

    expect(commandRecorder.count).toBe(1);
    expect(commandRecorder.read(0)).toEqual(command);
    expect(offerSystem.banishChargesOf(world, player)).toBe(0);
    expect(lifecycle.phase).toBe('level-up');

    // The banished identity never reappears, even from a fresh offer.
    for (let seed = 20; seed < 40; seed += 1) {
      offerSystem.generateOffer(world, new DeterministicRng(seed), player);
      const candidates = offerSystem.candidatesAt(world, player);
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

  it('rejects banish when lifecycle is not in level-up phase and mutates nothing', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const { progression } = createHarness(lifecycle, commandRecorder);
    progression.resetPlayer(world, player);

    expect(() =>
      progression.banishOffer(
        world,
        player,
        {
          tick: 0,
          type: 'banish-offer',
          choiceIndex: 0,
        },
        new DeterministicRng(1)
      )
    ).toThrow('cannot banish offer when lifecycle is not in level-up phase');
    expect(commandRecorder.count).toBe(0);
  });

  it('rejects an out-of-range or empty choiceIndex before recording or mutating', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    weaponSystem.resetPlayer(world, player);
    const { progression, offerSystem, abilityLoadout, passiveLoadout } = createHarness(
      lifecycle,
      commandRecorder
    );
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    // Leave only starter-projectile offerable, so the offer always has an
    // empty slot: fill and max the other three ability slots to close the
    // free-slot escape hatch `isOfferable` grants any un-held identity
    // (V2-107 grew the pool to eight, so simply holding two of them, as
    // V2-106 originally did, is no longer enough on its own).
    excludeNonStarterAbilitiesFromOffer(abilityLoadout, world, player);
    for (let i = 0; i < PASSIVE_MAX_LEVEL; i += 1) {
      passiveLoadout.addOrLevelUp(world, player, MOVE_SPEED_PASSIVE.id);
    }

    progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 0, y: 0, xp: LEVEL_2_XP_THRESHOLD }]),
      createContext(15),
      new DeterministicRng(1)
    );
    const emptyIndex = offerSystem
      .candidatesAt(world, player)
      .findIndex(candidate => candidate === null) as OfferCandidateIndex;
    expect(emptyIndex).toBeGreaterThanOrEqual(0);

    expect(() =>
      progression.banishOffer(
        world,
        player,
        {
          tick: 15,
          type: 'banish-offer',
          choiceIndex: emptyIndex,
        },
        new DeterministicRng(1)
      )
    ).toThrow('offer candidate slot is empty');
    expect(commandRecorder.count).toBe(0);
    expect(offerSystem.banishChargesOf(world, player)).toBe(1);
  });

  it('rejects a second banish once the charge is spent, without recording a second command', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    weaponSystem.resetPlayer(world, player);
    const { progression, offerSystem } = createHarness(lifecycle, commandRecorder);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 0, y: 0, xp: LEVEL_2_XP_THRESHOLD }]),
      createContext(15),
      new DeterministicRng(1)
    );
    const firstIndex = findOfferIndex(offerSystem, world, player, 'ability');
    progression.banishOffer(
      world,
      player,
      { tick: 15, type: 'banish-offer', choiceIndex: firstIndex },
      new DeterministicRng(1)
    );

    expect(() =>
      progression.banishOffer(
        world,
        player,
        { tick: 15, type: 'banish-offer', choiceIndex: 0 },
        new DeterministicRng(2)
      )
    ).toThrow('no banish charge remains');
    expect(commandRecorder.count).toBe(1);
  });
});

describe('WeaponSystem.advanceStarterTier', () => {
  it('raises the starter slot to tier 2 and with it the fired damage', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const weaponSystem = new WeaponSystem();
    const loadout = new AbilityLoadoutSystem();
    weaponSystem.resetPlayer(world, player);

    expect(weaponSystem.starterDamageOf(world, player)).toBe(PROJECTILE_DAMAGE);
    expect(loadout.tierAt(world, player, 0)).toBe(1);

    expect(weaponSystem.advanceStarterTier(world, player)).toBe(2);

    expect(loadout.tierAt(world, player, 0)).toBe(2);
    expect(weaponSystem.starterDamageOf(world, player)).toBe(
      STARTER_WEAPON_DAMAGE_TIER_2
    );
  });

  it('rejects an upgrade application past the authored tier ceiling', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const weaponSystem = new WeaponSystem();
    weaponSystem.resetPlayer(world, player);

    weaponSystem.advanceStarterTier(world, player);
    weaponSystem.advanceStarterTier(world, player);

    expect(() => weaponSystem.advanceStarterTier(world, player)).toThrow(RangeError);
  });

  it('rejects an uninitialized player or missing player components', () => {
    const world = new World(16);
    const invalidPlayer = world.createEntity(ComponentMask.Transform);
    const weaponSystem = new WeaponSystem();

    expect(() => weaponSystem.advanceStarterTier(world, invalidPlayer)).toThrow(
      RangeError
    );
  });
});

describe('End-to-end real production path integration test', () => {
  it('runs complete loop: kill -> XP spawn -> collect -> pause -> upgrade -> resume -> upgraded kill in fewer hits', () => {
    const world = new World(64);
    const player = createRawPlayer(world, 0, 0);
    const playerSlot = world.slotOf(player);

    const lifecycle = new GameV2Lifecycle();
    const commandRecorder = new CommandRecorder();
    const combatSystem = new CombatSystem();
    const dashSystem = new DashSystem();
    const weaponSystem = new WeaponSystem();
    const movementSystem = new MovementSystem();
    const enemySystem = new EnemySystem();
    const {
      progression: progressionSystem,
      offerSystem,
      // V2-106 grew the offerable ability pool; a starter-only registry keeps
      // this test's upgraded-kill assertion deterministic instead of
      // RNG-dependent on which ability offers. Before `V2-111` this test parked
      // the other identities in slots 1-3 to exclude them — which now makes
      // them fire, so the exclusion moved to the registry (V2-ADR-039).
    } = createHarness(lifecycle, commandRecorder, STARTER_ONLY_ABILITY_REGISTRY);

    // Initial production reset
    combatSystem.resetPlayer(world, player);
    dashSystem.resetPlayer(world, player);
    weaponSystem.resetPlayer(world, player);
    progressionSystem.resetPlayer(world, player);
    lifecycle.start();

    expect(world.health[playerSlot]).toBe(PLAYER_MAX_HEALTH);
    expect(weaponSystem.starterDamageOf(world, player)).toBe(PROJECTILE_DAMAGE);
    expect(world.xp[playerSlot]).toBe(0);
    expect(world.level[playerSlot]).toBe(1);
    expect(lifecycle.phase).toBe('playing');

    // Spawn first enemy at x = 3, y = 0
    const enemy1 = enemySystem.spawnEnemy(
      world,
      { nextFloat: () => 0 },
      { type: 'point', x: 3, y: 0 }
    );
    expect(world.isAlive(enemy1)).toBe(true);
    const enemy1Slot = world.slotOf(enemy1);
    let enemy1HealthBeforeTick = world.health[enemy1Slot] ?? 0;
    let enemy1ProjectileHits = 0;

    // Run tick loop until enemy 1 dies
    // Weapon cooldown is 30 ticks. Enemy has 30 HP, tier 1 weapon does 10 damage -> 3 hits.
    // Fires on ticks 0, 30, 60. Projectile reaches x=3 in ~13 ticks. Death around tick 73.
    let enemy1Died = false;
    let deathTick = -1;

    for (let tick = 0; tick < 100; tick += 1) {
      const ctx = createContext(tick);
      weaponSystem.step(world, player, ctx);
      const combatRes = combatSystem.step(world, player, ctx);
      const enemy1HealthAfterCombat = world.health[enemy1Slot] ?? 0;
      const enemy1HealthDrop = enemy1HealthBeforeTick - enemy1HealthAfterCombat;
      if (enemy1HealthDrop > 0) {
        expect(enemy1HealthDrop).toBe(PROJECTILE_DAMAGE);
        enemy1ProjectileHits += 1;
      }
      enemy1HealthBeforeTick = enemy1HealthAfterCombat;
      const progRes = progressionSystem.step(
        world,
        player,
        combatRes,
        ctx,
        new DeterministicRng(1)
      );

      if (combatRes.killCount === 1) {
        enemy1Died = true;
        deathTick = tick;
        expect(progRes.pickupsSpawned).toBe(1);
        break;
      }
    }

    expect(enemy1Died).toBe(true);
    expect(enemy1ProjectileHits).toBe(3);
    expect(world.isAlive(enemy1)).toBe(false);

    // 1. Assert exactly one pickup exists at death position (x=3, y=0) carrying ENEMY_XP_VALUE
    let pickupCount = 0;
    let pickupSlot = -1;
    for (let slot = 0; slot < world.masks.length; slot += 1) {
      const mask = world.masks[slot] ?? 0;
      if ((mask & XP_PICKUP_MASK) === XP_PICKUP_MASK) {
        pickupCount += 1;
        pickupSlot = slot;
      }
    }
    expect(pickupCount).toBe(1);
    expect(pickupSlot).toBeGreaterThanOrEqual(0);
    expect(world.x[pickupSlot]).toBeCloseTo(3, 1);
    expect(world.y[pickupSlot]).toBeCloseTo(0, 1);
    expect(world.xpPickupValue[pickupSlot]).toBe(ENEMY_XP_VALUE);

    // 2. Move player towards the pickup with real MovementSystem
    // Player speed is 6 units/sec. At 60 Hz, ~0.1 units per tick. Distance is 3 units -> ~30 ticks.
    let levelUpTick = -1;
    for (let tick = deathTick + 1; tick <= deathTick + 40; tick += 1) {
      const ctx = createContext(tick, 1, 0); // Intent: move right
      movementSystem.step(world, player, ctx);
      weaponSystem.step(world, player, ctx);
      const combatRes = combatSystem.step(world, player, ctx);
      const progRes = progressionSystem.step(
        world,
        player,
        combatRes,
        ctx,
        new DeterministicRng(1)
      );

      if (progRes.leveledUp) {
        levelUpTick = tick;
        expect(progRes.xpCollected).toBe(ENEMY_XP_VALUE);
        break;
      }
    }

    // 3. Assert collection tick advances level to 2 and leaves phase === 'level-up'
    expect(levelUpTick).toBeGreaterThan(deathTick);
    expect(world.level[playerSlot]).toBe(2);
    expect(lifecycle.phase).toBe('level-up');
    expect(world.isAlive(world.entityIdOf(pickupSlot))).toBe(false);

    // 4. Resolve upgrade with RunCommand at the paused tick
    const upgradeCommand: RunCommand = {
      tick: levelUpTick,
      type: 'choose-upgrade',
      choiceIndex: findOfferIndex(offerSystem, world, player, 'ability'),
    };
    progressionSystem.resolveUpgrade(world, player, upgradeCommand);

    expect(commandRecorder.count).toBe(1);
    expect(commandRecorder.read(0)).toEqual(upgradeCommand);
    expect(weaponSystem.starterDamageOf(world, player)).toBe(
      STARTER_WEAPON_DAMAGE_TIER_2
    );
    expect(lifecycle.phase).toBe('playing');

    // 5. Post-resume: spawn second enemy at x = 3, y = 0
    // With upgraded damage (15), enemy (30 HP) dies in exactly 2 hits (ticks 0 and 30 relative to weapon cooldown)
    // instead of 3 hits!
    const enemy2 = enemySystem.spawnEnemy(
      world,
      { nextFloat: () => 0 },
      { type: 'point', x: 3, y: 0 }
    );
    expect(world.isAlive(enemy2)).toBe(true);
    const enemy2Slot = world.slotOf(enemy2);
    let enemy2HealthBeforeTick = world.health[enemy2Slot] ?? 0;
    let enemy2ProjectileHits = 0;

    let enemy2Died = false;
    const startEnemy2Tick = levelUpTick + 1;

    for (let tick = startEnemy2Tick; tick <= startEnemy2Tick + 80; tick += 1) {
      const ctx = createContext(tick);
      weaponSystem.step(world, player, ctx);
      const combatRes = combatSystem.step(world, player, ctx);
      const enemy2HealthAfterCombat = world.health[enemy2Slot] ?? 0;
      const enemy2HealthDrop = enemy2HealthBeforeTick - enemy2HealthAfterCombat;
      if (enemy2HealthDrop > 0) {
        expect(enemy2HealthDrop).toBe(STARTER_WEAPON_DAMAGE_TIER_2);
        enemy2ProjectileHits += 1;
      }
      enemy2HealthBeforeTick = enemy2HealthAfterCombat;
      progressionSystem.step(world, player, combatRes, ctx, new DeterministicRng(1));

      if (combatRes.killCount === 1) {
        enemy2Died = true;
        break;
      }
    }

    expect(enemy2Died).toBe(true);
    expect(enemy2ProjectileHits).toBe(2);
    expect(world.isAlive(enemy2)).toBe(false);
  });
});

const combatResetPlayerHelper = (world: World, player: EntityId): void => {
  const slot = world.slotOf(player);
  world.health[slot] = PLAYER_MAX_HEALTH;
  world.maxHealth[slot] = PLAYER_MAX_HEALTH;
  world.radius[slot] = PLAYER_RADIUS;
};

describe('XP pickup lifetime (V2-112, V2-ADR-083)', () => {
  const pickupSlots = (world: World): number[] => {
    const slots: number[] = [];
    for (let slot = 0; slot < world.masks.length; slot += 1) {
      if (((world.masks[slot] ?? 0) & XP_PICKUP_MASK) === XP_PICKUP_MASK) {
        slots.push(slot);
      }
    }
    return slots;
  };

  const harness = (): {
    world: World;
    player: EntityId;
    progression: ProgressionSystem;
  } => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const { progression } = createHarness(lifecycle, new CommandRecorder());
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);
    new WeaponSystem().resetPlayer(world, player);
    return { world, player, progression };
  };

  it('spawns pickups with the full lifetime and counts it down', () => {
    const { world, player, progression } = harness();

    progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 50, y: 0, xp: 1 }]),
      createContext(0),
      new DeterministicRng(1)
    );

    const slot = pickupSlots(world)[0] as number;
    expect(world.lifetimeTicksRemaining[slot]).toBe(XP_PICKUP_LIFETIME_TICKS);

    progression.step(
      world,
      player,
      createCombatResultWithKills([]),
      createContext(1),
      new DeterministicRng(1)
    );

    expect(world.lifetimeTicksRemaining[slot]).toBe(XP_PICKUP_LIFETIME_TICKS - 1);
  });

  it('destroys a pickup the player never reached once its lifetime runs out', () => {
    const { world, player, progression } = harness();

    progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 50, y: 0, xp: 1 }]),
      createContext(0),
      new DeterministicRng(1)
    );
    expect(pickupSlots(world)).toHaveLength(1);

    for (let tick = 1; tick <= XP_PICKUP_LIFETIME_TICKS; tick += 1) {
      progression.step(
        world,
        player,
        createCombatResultWithKills([]),
        createContext(tick),
        new DeterministicRng(1)
      );
    }

    // Without this the run's only bound was world capacity, which a long run
    // reaches — `WeaponSystem` then throws `entity capacity exhausted`.
    expect(pickupSlots(world)).toHaveLength(0);
  });

  it('collects a pickup expiring on the same tick exactly once', () => {
    // The double-record case: overlapping *and* on its final lifetime tick.
    // Recording it in both branches would destroy the same slot twice.
    const { world, player, progression } = harness();
    const playerSlot = world.slotOf(player);

    progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 50, y: 0, xp: 7 }]),
      createContext(0),
      new DeterministicRng(1)
    );

    const slot = pickupSlots(world)[0] as number;
    world.lifetimeTicksRemaining[slot] = 1;
    world.x[playerSlot] = world.x[slot] ?? 0;
    world.y[playerSlot] = world.y[slot] ?? 0;

    const before = world.activeCount;
    const result = progression.step(
      world,
      player,
      createCombatResultWithKills([]),
      createContext(1),
      new DeterministicRng(1)
    );

    // Collected, not silently expired: the XP must land on the player.
    expect(result.xpCollected).toBe(7);
    expect(pickupSlots(world)).toHaveLength(0);
    // Exactly one entity left the world; a double destroy would free two.
    expect(world.activeCount).toBe(before - 1);
  });
});
