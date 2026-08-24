import { describe, expect, it } from 'vitest';

import {
  COMBAT_KILL_BUFFER_CAPACITY,
  CONVERGENCE_MAX_CYCLE_TICKS,
  CONVERGENCE_MIN_CYCLE_TICKS,
  CONVERGENCE_THRESHOLD,
  ENEMY_XP_VALUE,
  SIMULATION_HZ,
} from '@/game-v2/config/Mvp0Config';
import { type CombatStepResult } from '@/game-v2/contracts/CombatStepResult';
import { type EntityId } from '@/game-v2/contracts/EntityId';
import { type StepContext } from '@/game-v2/contracts/StepContext';
import { ConvergenceSystem } from '@/game-v2/systems/ConvergenceSystem';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { World } from '@/game-v2/world/World';

const PLAYER_MASK = ComponentMask.Player;

const FIXED_DELTA_SECONDS = 1 / SIMULATION_HZ;

const createContext = (tick: number): StepContext => ({
  tick,
  deltaSeconds: FIXED_DELTA_SECONDS,
  intent: { moveX: 0, moveY: 0, dashPressed: false },
});

const createEmptyCombatResult = (): CombatStepResult => ({
  playerDied: false,
  killCount: 0,
  killX: new Float32Array(COMBAT_KILL_BUFFER_CAPACITY),
  killY: new Float32Array(COMBAT_KILL_BUFFER_CAPACITY),
  killXp: new Float32Array(COMBAT_KILL_BUFFER_CAPACITY),
});

const createCombatResultWithKills = (xpValues: number[]): CombatStepResult => {
  const result = createEmptyCombatResult();
  result.killCount = xpValues.length;
  for (let index = 0; index < xpValues.length; index += 1) {
    result.killXp[index] = xpValues[index]!;
  }
  return result;
};

const createPlayer = (world: World): EntityId => world.createEntity(PLAYER_MASK);

describe('ConvergenceSystem', () => {
  it('resetPlayer zeroes accumulated convergence and the reached latch', () => {
    const world = new World(4);
    const player = createPlayer(world);
    const slot = world.slotOf(player);
    world.convergence[slot] = 999;
    world.convergenceReached[slot] = 1;

    new ConvergenceSystem().resetPlayer(world, player);

    expect(world.convergence[slot]).toBe(0);
    expect(world.convergenceReached[slot]).toBe(0);
  });

  it('resetPlayer rejects an entity missing the Player component', () => {
    const world = new World(4);
    const nonPlayer = world.createEntity(ComponentMask.Transform);

    expect(() => new ConvergenceSystem().resetPlayer(world, nonPlayer)).toThrow(
      RangeError
    );
  });

  it('accumulates exactly the sum of killXp across the batch', () => {
    const world = new World(4);
    const system = new ConvergenceSystem();
    const player = createPlayer(world);
    system.resetPlayer(world, player);
    const slot = world.slotOf(player);

    system.step(
      world,
      player,
      createCombatResultWithKills([5, 2.5, 7.5]),
      createContext(1)
    );

    expect(world.convergence[slot]).toBe(15);
  });

  it('accumulates across multiple ticks rather than resetting each tick', () => {
    const world = new World(4);
    const system = new ConvergenceSystem();
    const player = createPlayer(world);
    system.resetPlayer(world, player);
    const slot = world.slotOf(player);

    system.step(world, player, createCombatResultWithKills([5]), createContext(1));
    system.step(world, player, createCombatResultWithKills([5]), createContext(2));

    expect(world.convergence[slot]).toBe(10);
  });

  it('does not mutate convergence on a zero-kill tick', () => {
    const world = new World(4);
    const system = new ConvergenceSystem();
    const player = createPlayer(world);
    system.resetPlayer(world, player);
    const slot = world.slotOf(player);

    system.step(world, player, createEmptyCombatResult(), createContext(1));

    expect(world.convergence[slot]).toBe(0);
  });

  it('does not mutate convergence or the latch on a lethal (playerDied) tick', () => {
    const world = new World(4);
    const system = new ConvergenceSystem();
    const player = createPlayer(world);
    system.resetPlayer(world, player);
    const slot = world.slotOf(player);
    world.convergence[slot] = 10;

    const lethalResult = createCombatResultWithKills([9999]);
    lethalResult.playerDied = true;

    const result = system.step(world, player, lethalResult, createContext(1));

    expect(world.convergence[slot]).toBe(10);
    expect(world.convergenceReached[slot]).toBe(0);
    expect(result.convergenceReachedThisTick).toBe(false);
  });

  it('never flips the latch before the minimum-cycle tick floor, however high convergence is', () => {
    const world = new World(4);
    const system = new ConvergenceSystem();
    const player = createPlayer(world);
    system.resetPlayer(world, player);
    const slot = world.slotOf(player);
    world.convergence[slot] = CONVERGENCE_THRESHOLD * 10;

    const result = system.step(
      world,
      player,
      createEmptyCombatResult(),
      createContext(CONVERGENCE_MIN_CYCLE_TICKS - 1)
    );

    expect(world.convergenceReached[slot]).toBe(0);
    expect(result.convergenceReachedThisTick).toBe(false);
  });

  it('flips the latch once both the minimum-tick floor and the threshold are met', () => {
    const world = new World(4);
    const system = new ConvergenceSystem();
    const player = createPlayer(world);
    system.resetPlayer(world, player);
    const slot = world.slotOf(player);
    world.convergence[slot] = CONVERGENCE_THRESHOLD - ENEMY_XP_VALUE;

    const result = system.step(
      world,
      player,
      createCombatResultWithKills([ENEMY_XP_VALUE]),
      createContext(CONVERGENCE_MIN_CYCLE_TICKS)
    );

    expect(world.convergenceReached[slot]).toBe(1);
    expect(result.convergenceReachedThisTick).toBe(true);
  });

  it('flips the latch at the maximum-cycle tick ceiling even when convergence is far below threshold', () => {
    const world = new World(4);
    const system = new ConvergenceSystem();
    const player = createPlayer(world);
    system.resetPlayer(world, player);
    const slot = world.slotOf(player);

    const result = system.step(
      world,
      player,
      createEmptyCombatResult(),
      createContext(CONVERGENCE_MAX_CYCLE_TICKS)
    );

    expect(world.convergence[slot]).toBeLessThan(CONVERGENCE_THRESHOLD);
    expect(world.convergenceReached[slot]).toBe(1);
    expect(result.convergenceReachedThisTick).toBe(true);
  });

  it('does not flip the ceiling override one tick before the maximum-cycle tick', () => {
    const world = new World(4);
    const system = new ConvergenceSystem();
    const player = createPlayer(world);
    system.resetPlayer(world, player);
    const slot = world.slotOf(player);

    const result = system.step(
      world,
      player,
      createEmptyCombatResult(),
      createContext(CONVERGENCE_MAX_CYCLE_TICKS - 1)
    );

    expect(world.convergenceReached[slot]).toBe(0);
    expect(result.convergenceReachedThisTick).toBe(false);
  });

  it('latches idempotently: it does not re-fire the edge on a later tick', () => {
    const world = new World(4);
    const system = new ConvergenceSystem();
    const player = createPlayer(world);
    system.resetPlayer(world, player);
    const slot = world.slotOf(player);

    system.step(
      world,
      player,
      createEmptyCombatResult(),
      createContext(CONVERGENCE_MAX_CYCLE_TICKS)
    );
    expect(world.convergenceReached[slot]).toBe(1);

    const result = system.step(
      world,
      player,
      createEmptyCombatResult(),
      createContext(CONVERGENCE_MAX_CYCLE_TICKS + 1)
    );

    expect(world.convergenceReached[slot]).toBe(1);
    expect(result.convergenceReachedThisTick).toBe(false);
  });

  it('reuses one scratch result object instead of allocating per tick', () => {
    const world = new World(4);
    const system = new ConvergenceSystem();
    const player = createPlayer(world);
    system.resetPlayer(world, player);

    const first = system.step(
      world,
      player,
      createEmptyCombatResult(),
      createContext(1)
    );
    const second = system.step(
      world,
      player,
      createEmptyCombatResult(),
      createContext(2)
    );

    expect(first).toBe(second);
  });

  it.each([
    ['negative killCount', { killCount: -1 }],
    ['fractional killCount', { killCount: 1.5 }],
    ['killCount above capacity', { killCount: COMBAT_KILL_BUFFER_CAPACITY + 1 }],
  ])('rejects a malformed combat result: %s', (_name, overrides) => {
    const world = new World(4);
    const system = new ConvergenceSystem();
    const player = createPlayer(world);
    system.resetPlayer(world, player);

    const malformed = { ...createEmptyCombatResult(), ...overrides };

    expect(() => system.step(world, player, malformed, createContext(1))).toThrow(
      RangeError
    );
  });

  it('rejects non-finite kill XP', () => {
    const world = new World(4);
    const system = new ConvergenceSystem();
    const player = createPlayer(world);
    system.resetPlayer(world, player);

    expect(() =>
      system.step(
        world,
        player,
        createCombatResultWithKills([Number.NaN]),
        createContext(1)
      )
    ).toThrow(RangeError);
  });

  it('rejects a context whose tick is not a safe non-negative integer', () => {
    const world = new World(4);
    const system = new ConvergenceSystem();
    const player = createPlayer(world);
    system.resetPlayer(world, player);

    expect(() =>
      system.step(world, player, createEmptyCombatResult(), createContext(-1))
    ).toThrow(RangeError);
  });

  it('rejects a player entity missing the Player component', () => {
    const world = new World(4);
    const system = new ConvergenceSystem();
    const nonPlayer = world.createEntity(ComponentMask.Transform);

    expect(() =>
      system.step(world, nonPlayer, createEmptyCombatResult(), createContext(1))
    ).toThrow(RangeError);
  });

  describe('applyMarketBonus (V2-212)', () => {
    it('accrues exactly the given bonus amount', () => {
      const world = new World(4);
      const system = new ConvergenceSystem();
      const player = createPlayer(world);
      system.resetPlayer(world, player);
      const slot = world.slotOf(player);

      system.applyMarketBonus(world, player, 12, createContext(1));

      expect(world.convergence[slot]).toBe(12);
    });

    it('accumulates on top of prior kill-XP accrual, using the same underlying state', () => {
      const world = new World(4);
      const system = new ConvergenceSystem();
      const player = createPlayer(world);
      system.resetPlayer(world, player);
      const slot = world.slotOf(player);

      system.step(world, player, createCombatResultWithKills([5]), createContext(1));
      system.applyMarketBonus(world, player, 7, createContext(2));

      expect(world.convergence[slot]).toBe(12);
    });

    it('can flip the latch exactly like a kill would (min-floor + threshold)', () => {
      const world = new World(4);
      const system = new ConvergenceSystem();
      const player = createPlayer(world);
      system.resetPlayer(world, player);
      const slot = world.slotOf(player);
      world.convergence[slot] = CONVERGENCE_THRESHOLD - ENEMY_XP_VALUE;

      const result = system.applyMarketBonus(
        world,
        player,
        ENEMY_XP_VALUE,
        createContext(CONVERGENCE_MIN_CYCLE_TICKS)
      );

      expect(world.convergenceReached[slot]).toBe(1);
      expect(result.convergenceReachedThisTick).toBe(true);
    });

    it('can flip the latch at the maximum-cycle tick ceiling', () => {
      const world = new World(4);
      const system = new ConvergenceSystem();
      const player = createPlayer(world);
      system.resetPlayer(world, player);
      const slot = world.slotOf(player);

      const result = system.applyMarketBonus(
        world,
        player,
        1,
        createContext(CONVERGENCE_MAX_CYCLE_TICKS)
      );

      expect(world.convergenceReached[slot]).toBe(1);
      expect(result.convergenceReachedThisTick).toBe(true);
    });

    it('never flips the latch before the minimum-cycle tick floor', () => {
      const world = new World(4);
      const system = new ConvergenceSystem();
      const player = createPlayer(world);
      system.resetPlayer(world, player);
      const slot = world.slotOf(player);
      world.convergence[slot] = CONVERGENCE_THRESHOLD * 10;

      const result = system.applyMarketBonus(
        world,
        player,
        1,
        createContext(CONVERGENCE_MIN_CYCLE_TICKS - 1)
      );

      expect(world.convergenceReached[slot]).toBe(0);
      expect(result.convergenceReachedThisTick).toBe(false);
    });

    it.each([
      ['zero', 0],
      ['negative', -1],
      ['NaN', Number.NaN],
      ['Infinity', Number.POSITIVE_INFINITY],
    ])('rejects a non-positive or non-finite bonus: %s', (_name, bonusXp) => {
      const world = new World(4);
      const system = new ConvergenceSystem();
      const player = createPlayer(world);
      system.resetPlayer(world, player);

      expect(() =>
        system.applyMarketBonus(world, player, bonusXp, createContext(1))
      ).toThrow(RangeError);
    });

    it('rejects a player entity missing the Player component', () => {
      const world = new World(4);
      const system = new ConvergenceSystem();
      const nonPlayer = world.createEntity(ComponentMask.Transform);

      expect(() =>
        system.applyMarketBonus(world, nonPlayer, 5, createContext(1))
      ).toThrow(RangeError);
    });

    it('rejects a context whose tick is not a safe non-negative integer', () => {
      const world = new World(4);
      const system = new ConvergenceSystem();
      const player = createPlayer(world);
      system.resetPlayer(world, player);

      expect(() =>
        system.applyMarketBonus(world, player, 5, createContext(-1))
      ).toThrow(RangeError);
    });

    it('reuses the same scratch result object step() uses', () => {
      const world = new World(4);
      const system = new ConvergenceSystem();
      const player = createPlayer(world);
      system.resetPlayer(world, player);

      const fromStep = system.step(
        world,
        player,
        createEmptyCombatResult(),
        createContext(1)
      );
      const fromBonus = system.applyMarketBonus(world, player, 1, createContext(2));

      expect(fromStep).toBe(fromBonus);
    });
  });
});
