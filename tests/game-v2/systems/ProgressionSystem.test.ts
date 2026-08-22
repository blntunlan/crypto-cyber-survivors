import { describe, expect, it } from 'vitest';

import {
  ENEMY_HEALTH,
  ENEMY_XP_VALUE,
  LEVEL_2_XP_THRESHOLD,
  MVP0_MAX_PLAYER_LEVEL,
  PLAYER_MAX_HEALTH,
  PLAYER_MOVE_SPEED,
  PLAYER_RADIUS,
  PLAYER_STARTING_LEVEL,
  PROJECTILE_DAMAGE,
  SIMULATION_HZ,
  STARTER_WEAPON_DAMAGE_TIER_2,
  WEAPON_RANGE,
  XP_PICKUP_RADIUS,
} from '@/game-v2/config/Mvp0Config';
import { type CombatStepResult } from '@/game-v2/contracts/CombatStepResult';
import { type EntityId } from '@/game-v2/contracts/EntityId';
import { type RunCommand } from '@/game-v2/contracts/RunCommand';
import { type StepContext } from '@/game-v2/contracts/StepContext';
import { CommandRecorder } from '@/game-v2/replay/CommandRecorder';
import { GameV2Lifecycle } from '@/game-v2/runtime/GameV2Lifecycle';
import { CombatSystem } from '@/game-v2/systems/CombatSystem';
import { DashSystem } from '@/game-v2/systems/DashSystem';
import { EnemySystem } from '@/game-v2/systems/EnemySystem';
import { MovementSystem } from '@/game-v2/systems/MovementSystem';
import { ProgressionSystem } from '@/game-v2/systems/ProgressionSystem';
import { WeaponSystem } from '@/game-v2/systems/WeaponSystem';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { World } from '@/game-v2/world/World';

const PLAYER_MASK =
  ComponentMask.Transform |
  ComponentMask.Velocity |
  ComponentMask.Body |
  ComponentMask.Health |
  ComponentMask.Player;

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
 * weaponDamage, xp, or level. The system-specific resetPlayer methods must own
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

  it('P5: ensures valid positive pickup radius and bounded MVP-0 progression levels', () => {
    expect(XP_PICKUP_RADIUS).toBeGreaterThan(0);
    expect(Number.isFinite(XP_PICKUP_RADIUS)).toBe(true);
    expect(PLAYER_STARTING_LEVEL).toBe(1);
    expect(MVP0_MAX_PLAYER_LEVEL).toBe(PLAYER_STARTING_LEVEL + 1);
  });
});

describe('ProgressionStepResult lifecycle and reuse', () => {
  it('reuses the exact same result object across multiple steps', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    const progression = new ProgressionSystem(lifecycle, commandRecorder, weaponSystem);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    const result1 = progression.step(
      world,
      player,
      createEmptyCombatResult(),
      createContext(0)
    );
    const result2 = progression.step(
      world,
      player,
      createEmptyCombatResult(),
      createContext(1)
    );

    expect(result2).toBe(result1);
  });

  it('resets step counters and flags cleanly across steps with and without events', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    const progression = new ProgressionSystem(lifecycle, commandRecorder, weaponSystem);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    const combatWithKill = createCombatResultWithKills([{ x: 10, y: 10, xp: 5 }]);
    const res1 = progression.step(world, player, combatWithKill, createContext(0));

    expect(res1.pickupsSpawned).toBe(1);
    expect(res1.xpCollected).toBe(0);
    expect(res1.leveledUp).toBe(false);
    expect(res1.offerPending).toBe(false);

    const res2 = progression.step(
      world,
      player,
      createEmptyCombatResult(),
      createContext(1)
    );

    expect(res2.pickupsSpawned).toBe(0);
    expect(res2.xpCollected).toBe(0);
    expect(res2.leveledUp).toBe(false);
    expect(res2.offerPending).toBe(false);
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
    const weaponSystem = new WeaponSystem();
    const progression = new ProgressionSystem(lifecycle, commandRecorder, weaponSystem);

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
    const weaponSystem = new WeaponSystem();
    const progression = new ProgressionSystem(lifecycle, commandRecorder, weaponSystem);

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
    const weaponSystem = new WeaponSystem();
    const progression = new ProgressionSystem(lifecycle, commandRecorder, weaponSystem);

    expect(() =>
      progression.step(world, player, createEmptyCombatResult(), createContext(0))
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
    const weaponSystem = new WeaponSystem();
    const progression = new ProgressionSystem(lifecycle, commandRecorder, weaponSystem);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    const kills = [
      { x: 5.5, y: -2.25, xp: 5 },
      { x: -10, y: 8, xp: 15 },
    ];
    const combatResult = createCombatResultWithKills(kills);

    const res = progression.step(world, player, combatResult, createContext(0));

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
    const weaponSystem = new WeaponSystem();
    const progression = new ProgressionSystem(lifecycle, commandRecorder, weaponSystem);
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
      progression.step(world, player, combatResult, createContext(0))
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
    const progression = new ProgressionSystem(
      lifecycle,
      new CommandRecorder(),
      new WeaponSystem()
    );
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);
    const freeSlotsBefore = world.freeSlotCount;

    const combatResult = createCombatResultWithKills([
      { x: 10, y: 10, xp: 5 },
      { x: Number.NaN, y: 20, xp: 5 },
    ]);

    expect(() =>
      progression.step(world, player, combatResult, createContext(0))
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
    const progression = new ProgressionSystem(
      lifecycle,
      new CommandRecorder(),
      new WeaponSystem()
    );
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);
    const freeSlotsBefore = world.freeSlotCount;
    const malformed = createEmptyCombatResult();
    malformed.killCount = Number.MAX_SAFE_INTEGER;

    expect(() => progression.step(world, player, malformed, createContext(0))).toThrow(
      RangeError
    );
    expect(world.freeSlotCount).toBe(freeSlotsBefore);
  });

  it('requires typed kill buffers before allocating any pickup', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const progression = new ProgressionSystem(
      lifecycle,
      new CommandRecorder(),
      new WeaponSystem()
    );
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);
    const freeSlotsBefore = world.freeSlotCount;
    const malformed = {
      ...createEmptyCombatResult(),
      killCount: 1,
      killX: [0],
    } as unknown as CombatStepResult;

    expect(() => progression.step(world, player, malformed, createContext(0))).toThrow(
      TypeError
    );
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
    const weaponSystem = new WeaponSystem();
    const progression = new ProgressionSystem(lifecycle, commandRecorder, weaponSystem);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    const pickupXpValue = 3;
    const combatResult = createCombatResultWithKills([
      { x: 20, y: 20, xp: pickupXpValue },
    ]);
    progression.step(world, player, combatResult, createContext(0));

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
      createContext(1)
    );

    expect(res.xpCollected).toBe(pickupXpValue);
    expect(world.isAlive(pickupEntity)).toBe(false);
    expect(world.masks[pickupSlot]).toBe(0);
    expect(world.xpPickupValue[pickupSlot]).toBe(0);

    const resNext = progression.step(
      world,
      player,
      createEmptyCombatResult(),
      createContext(2)
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
    const weaponSystem = new WeaponSystem();
    const progression = new ProgressionSystem(lifecycle, commandRecorder, weaponSystem);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    const combatResult = createCombatResultWithKills([{ x: 10, y: 10, xp: 5 }]);
    progression.step(world, player, combatResult, createContext(0));

    const res = progression.step(
      world,
      player,
      createEmptyCombatResult(),
      createContext(1)
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
    const weaponSystem = new WeaponSystem();
    const progression = new ProgressionSystem(lifecycle, commandRecorder, weaponSystem);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    const exactDistance = PLAYER_RADIUS + XP_PICKUP_RADIUS;
    const combatResult = createCombatResultWithKills([
      { x: exactDistance, y: 0, xp: 5 },
    ]);
    const res = progression.step(world, player, combatResult, createContext(0));

    expect(res.xpCollected).toBe(5);
  });

  it('collects multiple overlapping pickups in a single tick and adds their total XP', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    const progression = new ProgressionSystem(lifecycle, commandRecorder, weaponSystem);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    const combatResult = createCombatResultWithKills([
      { x: 0, y: 0, xp: 5 },
      { x: 0.1, y: 0.1, xp: 10 },
    ]);

    const res = progression.step(world, player, combatResult, createContext(0));

    expect(res.xpCollected).toBe(15);
  });

  it('collects pickup spawned in the same tick if enemy dies on top of player', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    const progression = new ProgressionSystem(lifecycle, commandRecorder, weaponSystem);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    const combatResult = createCombatResultWithKills([{ x: 0, y: 0, xp: 5 }]);
    const res = progression.step(world, player, combatResult, createContext(0));

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
    const progression = new ProgressionSystem(
      lifecycle,
      new CommandRecorder(),
      new WeaponSystem()
    );
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
      progression.step(world, player, createEmptyCombatResult(), createContext(0))
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
    const progression = new ProgressionSystem(
      lifecycle,
      new CommandRecorder(),
      new WeaponSystem()
    );
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
      progression.step(world, player, createEmptyCombatResult(), createContext(0))
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
    const progression = new ProgressionSystem(
      lifecycle,
      new CommandRecorder(),
      new WeaponSystem()
    );
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    expect(() =>
      progression.step(
        world,
        player,
        createCombatResultWithKills([{ x: 10, y: 10, xp: 5 }]),
        createContext(0)
      )
    ).toThrow(RangeError);
    expect(world.freeSlotCount).toBe(15);
  });

  it('advances level to 2, retains surplus XP, sets paused tick, and calls pauseForLevelUp', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const playerSlot = world.slotOf(player);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    const progression = new ProgressionSystem(lifecycle, commandRecorder, weaponSystem);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    const surplusXp = 8;
    const combatResult = createCombatResultWithKills([{ x: 0, y: 0, xp: surplusXp }]);

    const res = progression.step(world, player, combatResult, createContext(42));

    expect(res.leveledUp).toBe(true);
    expect(res.offerPending).toBe(true);
    expect(world.level[playerSlot]).toBe(2);
    expect(world.xp[playerSlot]).toBe(surplusXp - LEVEL_2_XP_THRESHOLD);
    expect(lifecycle.phase).toBe('level-up');
  });

  it('does not advance beyond MVP0_MAX_PLAYER_LEVEL and accumulates XP without pausing', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const playerSlot = world.slotOf(player);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    weaponSystem.resetPlayer(world, player);
    const progression = new ProgressionSystem(lifecycle, commandRecorder, weaponSystem);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 0, y: 0, xp: LEVEL_2_XP_THRESHOLD }]),
      createContext(10)
    );
    expect(world.level[playerSlot]).toBe(2);
    expect(lifecycle.phase).toBe('level-up');

    const command: RunCommand = {
      tick: 10,
      type: 'choose-upgrade',
      choiceId: 'starter-damage-2',
    };
    progression.resolveUpgrade(world, player, command);
    expect(lifecycle.phase).toBe('playing');

    const res2 = progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 0, y: 0, xp: LEVEL_2_XP_THRESHOLD }]),
      createContext(20)
    );

    expect(res2.leveledUp).toBe(false);
    expect(res2.offerPending).toBe(false);
    expect(world.level[playerSlot]).toBe(MVP0_MAX_PLAYER_LEVEL);
    expect(world.xp[playerSlot]).toBe(LEVEL_2_XP_THRESHOLD);
    expect(lifecycle.phase).toBe('playing');
  });

  it('throws RangeError if step is called while an upgrade offer is pending', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    const progression = new ProgressionSystem(lifecycle, commandRecorder, weaponSystem);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 0, y: 0, xp: LEVEL_2_XP_THRESHOLD }]),
      createContext(10)
    );

    expect(() =>
      progression.step(world, player, createEmptyCombatResult(), createContext(11))
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
    const progression = new ProgressionSystem(lifecycle, commandRecorder, weaponSystem);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 0, y: 0, xp: LEVEL_2_XP_THRESHOLD }]),
      createContext(10)
    );

    const restoredSystem = new ProgressionSystem(
      lifecycle,
      commandRecorder,
      weaponSystem
    );
    const restoredPausedTickCommand: RunCommand = {
      tick: 500,
      type: 'choose-upgrade',
      choiceId: 'starter-damage-2',
    };

    restoredSystem.resolveUpgrade(world, player, restoredPausedTickCommand);

    expect(commandRecorder.read(0)).toEqual(restoredPausedTickCommand);
    expect(world.weaponDamage[world.slotOf(player)]).toBe(STARTER_WEAPON_DAMAGE_TIER_2);
    expect(lifecycle.phase).toBe('playing');
  });
});

describe('Upgrade resolution (resolveUpgrade)', () => {
  it('resolves upgrade by recording command, applying weapon upgrade, and resuming lifecycle', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const playerSlot = world.slotOf(player);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    weaponSystem.resetPlayer(world, player);
    const progression = new ProgressionSystem(lifecycle, commandRecorder, weaponSystem);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 0, y: 0, xp: LEVEL_2_XP_THRESHOLD }]),
      createContext(15)
    );

    expect(lifecycle.phase).toBe('level-up');

    const command: RunCommand = {
      tick: 15,
      type: 'choose-upgrade',
      choiceId: 'starter-damage-2',
    };

    progression.resolveUpgrade(world, player, command);

    expect(commandRecorder.count).toBe(1);
    expect(commandRecorder.read(0)).toEqual(command);
    expect(world.weaponDamage[playerSlot]).toBe(STARTER_WEAPON_DAMAGE_TIER_2);
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
    const progression = new ProgressionSystem(lifecycle, commandRecorder, weaponSystem);
    progression.resetPlayer(world, player);

    const command: RunCommand = {
      tick: 0,
      type: 'choose-upgrade',
      choiceId: 'starter-damage-2',
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
    const progression = new ProgressionSystem(lifecycle, commandRecorder, weaponSystem);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 0, y: 0, xp: LEVEL_2_XP_THRESHOLD }]),
      createContext(25)
    );

    const restoredPausedTickCommand: RunCommand = {
      tick: 24,
      type: 'choose-upgrade',
      choiceId: 'starter-damage-2',
    };

    progression.resolveUpgrade(world, player, restoredPausedTickCommand);

    expect(commandRecorder.read(0)).toEqual(restoredPausedTickCommand);
    expect(world.weaponDamage[world.slotOf(player)]).toBe(STARTER_WEAPON_DAMAGE_TIER_2);
    expect(lifecycle.phase).toBe('playing');
  });

  it('records command BEFORE applying damage upgrade so recorder failure does not mutate world', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const playerSlot = world.slotOf(player);
    const lifecycle = new GameV2Lifecycle();
    lifecycle.start();
    const commandRecorder = new CommandRecorder();
    const weaponSystem = new WeaponSystem();
    weaponSystem.resetPlayer(world, player);
    const progression = new ProgressionSystem(lifecycle, commandRecorder, weaponSystem);
    progression.resetPlayer(world, player);
    combatResetPlayerHelper(world, player);

    progression.step(
      world,
      player,
      createCombatResultWithKills([{ x: 0, y: 0, xp: LEVEL_2_XP_THRESHOLD }]),
      createContext(10)
    );

    const badCommand = {
      tick: 10,
      type: 'invalid-type' as unknown as 'choose-upgrade',
      choiceId: 'starter-damage-2' as const,
    };

    expect(() =>
      progression.resolveUpgrade(world, player, badCommand as unknown as RunCommand)
    ).toThrow();
    expect(world.weaponDamage[playerSlot]).toBe(PROJECTILE_DAMAGE);
    expect(lifecycle.phase).toBe('level-up');
  });
});

describe('WeaponSystem.applyDamageUpgrade', () => {
  it('upgrades player weapon damage to STARTER_WEAPON_DAMAGE_TIER_2', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const slot = world.slotOf(player);
    const weaponSystem = new WeaponSystem();
    weaponSystem.resetPlayer(world, player);

    expect(world.weaponDamage[slot]).toBe(PROJECTILE_DAMAGE);

    weaponSystem.applyDamageUpgrade(world, player);

    expect(world.weaponDamage[slot]).toBe(STARTER_WEAPON_DAMAGE_TIER_2);
  });

  it('rejects a second upgrade application with RangeError', () => {
    const world = new World(16);
    const player = createRawPlayer(world, 0, 0);
    const weaponSystem = new WeaponSystem();
    weaponSystem.resetPlayer(world, player);

    weaponSystem.applyDamageUpgrade(world, player);

    expect(() => weaponSystem.applyDamageUpgrade(world, player)).toThrow(RangeError);
  });

  it('rejects an uninitialized player or missing player components', () => {
    const world = new World(16);
    const invalidPlayer = world.createEntity(ComponentMask.Transform);
    const weaponSystem = new WeaponSystem();

    expect(() => weaponSystem.applyDamageUpgrade(world, invalidPlayer)).toThrow(
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
    const progressionSystem = new ProgressionSystem(
      lifecycle,
      commandRecorder,
      weaponSystem
    );

    // Initial production reset
    combatSystem.resetPlayer(world, player);
    dashSystem.resetPlayer(world, player);
    weaponSystem.resetPlayer(world, player);
    progressionSystem.resetPlayer(world, player);
    lifecycle.start();

    expect(world.health[playerSlot]).toBe(PLAYER_MAX_HEALTH);
    expect(world.weaponDamage[playerSlot]).toBe(PROJECTILE_DAMAGE);
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

    // Run tick loop until enemy 1 dies
    // Weapon cooldown is 30 ticks. Enemy has 30 HP, tier 1 weapon does 10 damage -> 3 hits.
    // Fires on ticks 0, 30, 60. Projectile reaches x=3 in ~13 ticks. Death around tick 73.
    let enemy1Died = false;
    let deathTick = -1;

    for (let tick = 0; tick < 100; tick += 1) {
      const ctx = createContext(tick);
      weaponSystem.step(world, player, ctx);
      const combatRes = combatSystem.step(world, player, ctx);
      const progRes = progressionSystem.step(world, player, combatRes, ctx);

      if (combatRes.killCount === 1) {
        enemy1Died = true;
        deathTick = tick;
        expect(progRes.pickupsSpawned).toBe(1);
        break;
      }
    }

    expect(enemy1Died).toBe(true);
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
      const progRes = progressionSystem.step(world, player, combatRes, ctx);

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
      choiceId: 'starter-damage-2',
    };
    progressionSystem.resolveUpgrade(world, player, upgradeCommand);

    expect(commandRecorder.count).toBe(1);
    expect(commandRecorder.read(0)).toEqual(upgradeCommand);
    expect(world.weaponDamage[playerSlot]).toBe(STARTER_WEAPON_DAMAGE_TIER_2);
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

    let enemy2Died = false;
    const startEnemy2Tick = levelUpTick + 1;

    for (let tick = startEnemy2Tick; tick <= startEnemy2Tick + 80; tick += 1) {
      const ctx = createContext(tick);
      weaponSystem.step(world, player, ctx);
      const combatRes = combatSystem.step(world, player, ctx);
      progressionSystem.step(world, player, combatRes, ctx);

      if (combatRes.killCount === 1) {
        enemy2Died = true;
        break;
      }
    }

    expect(enemy2Died).toBe(true);
    expect(world.isAlive(enemy2)).toBe(false);
  });
});

const combatResetPlayerHelper = (world: World, player: EntityId): void => {
  const slot = world.slotOf(player);
  world.health[slot] = PLAYER_MAX_HEALTH;
  world.maxHealth[slot] = PLAYER_MAX_HEALTH;
  world.radius[slot] = PLAYER_RADIUS;
};
