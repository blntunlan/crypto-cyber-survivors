import { describe, expect, it, vi } from 'vitest';

import {
  MVP0_ENEMY_SPAWN_RING_RADIUS,
  MVP0_MAX_LIVE_ENEMIES,
  MVP0_PLAYER_SPAWN_X,
  MVP0_PLAYER_SPAWN_Y,
  MVP0_WORLD_CAPACITY,
} from '@/game-v2/config/Mvp0Config';
import { GRUNT_ENEMY } from '@/game-v2/config/EnemyRegistry';
import { UNSPECIFIED_POSITION_CONTEXT } from '@/game-v2/contracts/PositionContext';
import { RenderSnapshot } from '@/game-v2/contracts/RenderSnapshot';
import { createRunIdentity } from '@/game-v2/contracts/RunIdentity';
import { MarketEncounterRuntime } from '@/game-v2/market/MarketEncounterRuntime';
import { RenderSnapshotWriter } from '@/game-v2/presentation/RenderSnapshotWriter';
import { CommandRecorder } from '@/game-v2/replay/CommandRecorder';
import { InputRecorder } from '@/game-v2/replay/InputRecorder';
import { DeterministicRng } from '@/game-v2/runtime/DeterministicRng';
import { MVP0_RENDER_CAPACITIES } from '@/game-v2/runtime/createMvp0Runtime';
import { GameV2Lifecycle } from '@/game-v2/runtime/GameV2Lifecycle';
import { GameV2Runtime, type IntentSource } from '@/game-v2/runtime/GameV2Runtime';
import { SimulationClock } from '@/game-v2/runtime/SimulationClock';
import { AbilityLoadoutSystem } from '@/game-v2/systems/AbilityLoadoutSystem';
import { CombatSystem } from '@/game-v2/systems/CombatSystem';
import { ConvergenceSystem } from '@/game-v2/systems/ConvergenceSystem';
import { DashSystem } from '@/game-v2/systems/DashSystem';
import { EnemyComposer } from '@/game-v2/systems/EnemyComposer';
import { EnemySystem } from '@/game-v2/systems/EnemySystem';
import { LevelUpOfferSystem } from '@/game-v2/systems/LevelUpOfferSystem';
import { MovementSystem } from '@/game-v2/systems/MovementSystem';
import { PassiveLoadoutSystem } from '@/game-v2/systems/PassiveLoadoutSystem';
import { ProgressionSystem } from '@/game-v2/systems/ProgressionSystem';
import { TargetingSystem } from '@/game-v2/systems/TargetingSystem';
import { WeaponSystem } from '@/game-v2/systems/WeaponSystem';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { World } from '@/game-v2/world/World';

const SIMULATION_STEP_MS = 1000 / 60;

/**
 * Mirrors `GameV2RuntimeBounds.test.ts`'s `composeRuntime` precedent: a
 * direct construction with a caller-owned `world` reference, needed here
 * to force a lethal contact on an exact tick (`V2-213`'s death-dominance
 * proof for `MarketEncounterRuntime.applyPendingConvergenceBonus`) — a
 * `checkpoint()` read returns a `WorldSnapshot` copy, not the live world.
 */
const composeRuntime = (
  world: World,
  marketEncounterRuntime: MarketEncounterRuntime
): GameV2Runtime => {
  const lifecycle = new GameV2Lifecycle();
  const commandRecorder = new CommandRecorder();
  const abilityLoadoutSystem = new AbilityLoadoutSystem();
  const passiveLoadoutSystem = new PassiveLoadoutSystem();
  const offerSystem = new LevelUpOfferSystem(
    abilityLoadoutSystem,
    passiveLoadoutSystem
  );
  const weaponSystem = new WeaponSystem(new TargetingSystem(), abilityLoadoutSystem);
  const idleIntent: IntentSource = {
    sample: (_tick, out) => {
      out.moveX = 0;
      out.moveY = 0;
      out.dashPressed = false;
      return true;
    },
  };

  return new GameV2Runtime({
    world,
    rng: new DeterministicRng(1),
    clock: new SimulationClock(),
    lifecycle,
    runIdentity: createRunIdentity('market-wiring', 1),
    positionContext: UNSPECIFIED_POSITION_CONTEXT,
    intentSource: idleIntent,
    inputRecorder: new InputRecorder(),
    commandRecorder,
    renderSnapshot: new RenderSnapshot(MVP0_RENDER_CAPACITIES),
    renderSnapshotWriter: new RenderSnapshotWriter(),
    dashSystem: new DashSystem(),
    movementSystem: new MovementSystem(),
    enemySystem: new EnemySystem(),
    enemyComposer: new EnemyComposer(),
    weaponSystem,
    combatSystem: new CombatSystem(),
    convergenceSystem: new ConvergenceSystem(),
    progressionSystem: new ProgressionSystem(
      lifecycle,
      commandRecorder,
      abilityLoadoutSystem,
      passiveLoadoutSystem,
      offerSystem
    ),
    abilityLoadoutSystem,
    offerSystem,
    presentation: null,
    marketEncounterRuntime,
  });
};

const findPlayerSlot = (world: World): number => {
  for (let slot = 0; slot < world.masks.length; slot += 1) {
    if (((world.masks[slot] ?? 0) & ComponentMask.Player) === ComponentMask.Player) {
      return slot;
    }
  }
  throw new Error('no player entity found in world');
};

describe('GameV2Runtime market wiring (V2-213)', () => {
  it('calls MarketEncounterRuntime.step with the correct tick every processed tick', () => {
    const marketEncounterRuntime = new MarketEncounterRuntime();
    const stepSpy = vi.spyOn(marketEncounterRuntime, 'step');
    const world = new World(MVP0_WORLD_CAPACITY);
    const runtime = composeRuntime(world, marketEncounterRuntime);

    runtime.start();
    runtime.advanceFrame(SIMULATION_STEP_MS);
    runtime.advanceFrame(SIMULATION_STEP_MS);
    runtime.advanceFrame(SIMULATION_STEP_MS);

    expect(stepSpy).toHaveBeenCalledTimes(3);
    expect(stepSpy.mock.calls.map(call => call[1])).toEqual([1, 2, 3]);
  });

  it('calls applyPendingConvergenceBonus once per tick while the player is alive', () => {
    const marketEncounterRuntime = new MarketEncounterRuntime();
    const bonusSpy = vi.spyOn(marketEncounterRuntime, 'applyPendingConvergenceBonus');
    const world = new World(MVP0_WORLD_CAPACITY);
    const runtime = composeRuntime(world, marketEncounterRuntime);

    runtime.start();
    runtime.advanceFrame(SIMULATION_STEP_MS);
    runtime.advanceFrame(SIMULATION_STEP_MS);

    expect(bonusSpy).toHaveBeenCalledTimes(2);
  });

  it('does not call applyPendingConvergenceBonus on the tick the player dies (death-dominance, V2-ADR-155)', () => {
    const marketEncounterRuntime = new MarketEncounterRuntime();
    const bonusSpy = vi.spyOn(marketEncounterRuntime, 'applyPendingConvergenceBonus');
    const world = new World(MVP0_WORLD_CAPACITY);
    const runtime = composeRuntime(world, marketEncounterRuntime);

    runtime.start();

    const enemySystem = new EnemySystem();
    enemySystem.spawnEnemy(world, new DeterministicRng(2), {
      type: 'point',
      x: MVP0_PLAYER_SPAWN_X,
      y: MVP0_PLAYER_SPAWN_Y,
    });

    const playerSlot = findPlayerSlot(world);
    world.health[playerSlot] = 1;

    bonusSpy.mockClear();
    runtime.advanceFrame(SIMULATION_STEP_MS);

    expect(runtime.readout().phase).toBe('game-over');
    expect(bonusSpy).not.toHaveBeenCalled();
  });

  it('spends a market SPAWN composition through the same live-enemy cap the cadence spawner uses', () => {
    const marketEncounterRuntime = new MarketEncounterRuntime();
    // Stubs the composition step itself so this test does not depend on any
    // real family's confirmation-tick timing -- it only exercises
    // stepMarketEncounters's own cap-enforcement loop.
    vi.spyOn(marketEncounterRuntime, 'step').mockImplementation(
      (_rng, _tick, _nowMs, out) => {
        out.length = 0;
        for (let i = 0; i < MVP0_MAX_LIVE_ENEMIES; i += 1) {
          out.push(GRUNT_ENEMY);
        }
      }
    );
    const world = new World(MVP0_WORLD_CAPACITY);
    const runtime = composeRuntime(world, marketEncounterRuntime);

    runtime.start();

    // Pre-populate the world right up to the live-enemy cap, mirroring
    // `GameV2RuntimeBounds.test.ts`'s own precedent for this exact bound.
    const enemySystem = new EnemySystem();
    const rng = new DeterministicRng(3);
    for (let i = 0; i < MVP0_MAX_LIVE_ENEMIES - 1; i += 1) {
      const angle = (i / MVP0_MAX_LIVE_ENEMIES) * Math.PI * 2;
      enemySystem.spawnEnemy(world, rng, {
        type: 'point',
        x: Math.cos(angle) * MVP0_ENEMY_SPAWN_RING_RADIUS * 3,
        y: Math.sin(angle) * MVP0_ENEMY_SPAWN_RING_RADIUS * 3,
      });
    }

    expect(() => runtime.advanceFrame(SIMULATION_STEP_MS)).not.toThrow();

    let liveEnemies = 0;
    for (let slot = 0; slot < world.masks.length; slot += 1) {
      if (((world.masks[slot] ?? 0) & ComponentMask.Enemy) === ComponentMask.Enemy) {
        liveEnemies += 1;
      }
    }

    expect(liveEnemies).toBeLessThanOrEqual(MVP0_MAX_LIVE_ENEMIES);
  });
});
