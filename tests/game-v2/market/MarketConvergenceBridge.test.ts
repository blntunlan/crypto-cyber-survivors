import { describe, expect, it } from 'vitest';

import {
  CONVERGENCE_MIN_CYCLE_TICKS,
  SIMULATION_HZ,
} from '@/game-v2/config/Mvp0Config';
import {
  MARKET_CONVERGENCE_BONUS_XP_PER_UNIT,
  WORLD_EVENT_CONVERGENCE_BONUS_UNITS,
} from '@/game-v2/config/MarketConvergenceBonus';
import { type EntityId } from '@/game-v2/contracts/EntityId';
import { type StepContext } from '@/game-v2/contracts/StepContext';
import { type HazardLifecycleStepResult } from '@/game-v2/market/HazardLifecycle';
import { MarketConvergenceBridge } from '@/game-v2/market/MarketConvergenceBridge';
import { ConvergenceSystem } from '@/game-v2/systems/ConvergenceSystem';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { World } from '@/game-v2/world/World';

const FIXED_DELTA_SECONDS = 1 / SIMULATION_HZ;

const createContext = (tick: number): StepContext => ({
  tick,
  deltaSeconds: FIXED_DELTA_SECONDS,
  intent: { moveX: 0, moveY: 0, dashPressed: false },
});

const createPlayer = (world: World): EntityId =>
  world.createEntity(ComponentMask.Player);

const hazardResult = (
  overrides: Partial<HazardLifecycleStepResult>
): HazardLifecycleStepResult => ({
  phase: 'IDLE',
  hazardId: null,
  activatedThisTick: false,
  expiredThisTick: false,
  ...overrides,
});

describe('MarketConvergenceBridge', () => {
  it('applies the flat WORLD_EVENT bonus on a real hazard expiry', () => {
    const world = new World(4);
    const convergence = new ConvergenceSystem();
    const player = createPlayer(world);
    convergence.resetPlayer(world, player);
    const slot = world.slotOf(player);
    const bridge = new MarketConvergenceBridge(convergence);

    const result = bridge.onHazardExpired(
      world,
      player,
      hazardResult({ expiredThisTick: true }),
      createContext(1)
    );

    const expectedBonus =
      WORLD_EVENT_CONVERGENCE_BONUS_UNITS * MARKET_CONVERGENCE_BONUS_XP_PER_UNIT;
    expect(world.convergence[slot]).toBe(expectedBonus);
    expect(result).not.toBeNull();
  });

  it('is a no-op when the hazard has not expired this tick', () => {
    const world = new World(4);
    const convergence = new ConvergenceSystem();
    const player = createPlayer(world);
    convergence.resetPlayer(world, player);
    const slot = world.slotOf(player);
    const bridge = new MarketConvergenceBridge(convergence);

    const result = bridge.onHazardExpired(
      world,
      player,
      hazardResult({ phase: 'ACTIVE', hazardId: 'volatility-tremor' }),
      createContext(1)
    );

    expect(world.convergence[slot]).toBe(0);
    expect(result).toBeNull();
  });

  it('scales the LOOT_EVENT bonus by the real lootValue', () => {
    const world = new World(4);
    const convergence = new ConvergenceSystem();
    const player = createPlayer(world);
    convergence.resetPlayer(world, player);
    const slot = world.slotOf(player);
    const bridge = new MarketConvergenceBridge(convergence);

    bridge.onLootOpportunity(
      world,
      player,
      { lootTierId: 'mega-whale-loot', lootValue: 3, tick: 1 },
      createContext(1)
    );

    expect(world.convergence[slot]).toBe(3 * MARKET_CONVERGENCE_BONUS_XP_PER_UNIT);
  });

  it('a flat run that never calls the bridge still reaches Convergence via kills alone', () => {
    const world = new World(4);
    const convergence = new ConvergenceSystem();
    const player = createPlayer(world);
    convergence.resetPlayer(world, player);
    const slot = world.slotOf(player);

    // No MarketConvergenceBridge call anywhere -- pure kill accrual, the
    // exact CONVERGENCE_MIN_CYCLE_TICKS/threshold edge V2-109 itself proves.
    const stepResult = convergence.step(
      world,
      player,
      {
        playerDied: false,
        killCount: 0,
        killX: new Float32Array(1),
        killY: new Float32Array(1),
        killXp: new Float32Array(1),
      },
      createContext(CONVERGENCE_MIN_CYCLE_TICKS)
    );

    expect(stepResult.convergenceReachedThisTick).toBe(false);
    expect(world.convergenceReached[slot]).toBe(0);
  });

  it('can flip the Convergence latch through a bridged bonus', () => {
    const world = new World(4);
    const convergence = new ConvergenceSystem();
    const player = createPlayer(world);
    convergence.resetPlayer(world, player);
    const slot = world.slotOf(player);
    const bridge = new MarketConvergenceBridge(convergence);
    world.convergence[slot] = 1_000_000;

    const result = bridge.onLootOpportunity(
      world,
      player,
      { lootTierId: 'whale-loot', lootValue: 2, tick: CONVERGENCE_MIN_CYCLE_TICKS },
      createContext(CONVERGENCE_MIN_CYCLE_TICKS)
    );

    expect(world.convergenceReached[slot]).toBe(1);
    expect(result.convergenceReachedThisTick).toBe(true);
  });
});
