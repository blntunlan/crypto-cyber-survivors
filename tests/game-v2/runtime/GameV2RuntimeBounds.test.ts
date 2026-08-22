import { describe, expect, it } from 'vitest';

import {
  MVP0_MAX_LIVE_ENEMIES,
  MVP0_WORLD_CAPACITY,
  SIMULATION_STEP_MS,
  WEAPON_RANGE,
} from '@/game-v2/config/Mvp0Config';
import { type PlayerIntent } from '@/game-v2/contracts/PlayerIntent';
import { RenderSnapshot } from '@/game-v2/contracts/RenderSnapshot';
import { createRunIdentity } from '@/game-v2/contracts/RunIdentity';
import { RenderSnapshotWriter } from '@/game-v2/presentation/RenderSnapshotWriter';
import { CommandRecorder } from '@/game-v2/replay/CommandRecorder';
import { InputRecorder } from '@/game-v2/replay/InputRecorder';
import { DeterministicRng } from '@/game-v2/runtime/DeterministicRng';
import { MVP0_RENDER_CAPACITIES } from '@/game-v2/runtime/createMvp0Runtime';
import { GameV2Runtime, type IntentSource } from '@/game-v2/runtime/GameV2Runtime';
import { GameV2Lifecycle } from '@/game-v2/runtime/GameV2Lifecycle';
import { SimulationClock } from '@/game-v2/runtime/SimulationClock';
import { CombatSystem } from '@/game-v2/systems/CombatSystem';
import { DashSystem } from '@/game-v2/systems/DashSystem';
import { EnemySystem } from '@/game-v2/systems/EnemySystem';
import { MovementSystem } from '@/game-v2/systems/MovementSystem';
import { ProgressionSystem } from '@/game-v2/systems/ProgressionSystem';
import { TargetingSystem } from '@/game-v2/systems/TargetingSystem';
import { WeaponSystem } from '@/game-v2/systems/WeaponSystem';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { World } from '@/game-v2/world/World';

/**
 * The spawner's two bounds — world capacity and the live-enemy cap — cannot be
 * driven from `createMvp0Runtime`, because MVP-0 balance kills the player long
 * before either binds. They are still load-bearing: exceeding the enemy cap
 * makes `RenderSnapshotWriter` throw mid-frame, and ignoring the capacity
 * precondition makes `EnemySystem.spawnEnemy` throw.
 *
 * These tests compose the runtime directly so `world` can be sized and
 * pre-populated. The composition mirrors `createMvp0Runtime`; only the world is
 * different.
 */
const composeRuntime = (world: World): GameV2Runtime => {
  const lifecycle = new GameV2Lifecycle();
  const commandRecorder = new CommandRecorder();
  const weaponSystem = new WeaponSystem(new TargetingSystem());
  const idleIntent: IntentSource = {
    sample: (_tick, out: PlayerIntent) => {
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
    runIdentity: createRunIdentity('bounds', 1),
    intentSource: idleIntent,
    inputRecorder: new InputRecorder(),
    commandRecorder,
    renderSnapshot: new RenderSnapshot(MVP0_RENDER_CAPACITIES),
    renderSnapshotWriter: new RenderSnapshotWriter(),
    dashSystem: new DashSystem(),
    movementSystem: new MovementSystem(),
    enemySystem: new EnemySystem(),
    weaponSystem,
    combatSystem: new CombatSystem(),
    progressionSystem: new ProgressionSystem(lifecycle, commandRecorder, weaponSystem),
    presentation: null,
  });
};

/** Far enough that no enemy is targetable or in contact during the test. */
const OUT_OF_RANGE_RADIUS = WEAPON_RANGE * 2.5;

const spawnDistantEnemies = (world: World, count: number): void => {
  const enemySystem = new EnemySystem();
  const rng = new DeterministicRng(2);

  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    enemySystem.spawnEnemy(world, rng, {
      type: 'point',
      x: Math.cos(angle) * OUT_OF_RANGE_RADIUS,
      y: Math.sin(angle) * OUT_OF_RANGE_RADIUS,
    });
  }
};

describe('GameV2Runtime spawn bounds', () => {
  it('drops a spawn rather than consuming the last free slot', () => {
    // Two slots: one for the pre-placed enemy, one for the player. The first
    // cadence tick then runs with zero free slots.
    const world = new World(2);
    spawnDistantEnemies(world, 1);

    const runtime = composeRuntime(world);
    runtime.start();

    expect(world.freeSlotCount).toBe(0);
    expect(() => {
      runtime.advanceFrame(SIMULATION_STEP_MS);
    }).not.toThrow();

    expect(runtime.tick).toBe(1);
    expect(runtime.readout().enemyCount).toBe(1);
    expect(runtime.phase).toBe('playing');

    runtime.dispose();
  });

  it('holds the live-enemy count at the render snapshot capacity', () => {
    const world = new World(MVP0_WORLD_CAPACITY);
    spawnDistantEnemies(world, MVP0_MAX_LIVE_ENEMIES);

    const runtime = composeRuntime(world);
    runtime.start();

    expect(runtime.readout().enemyCount).toBe(MVP0_MAX_LIVE_ENEMIES);
    expect(world.freeSlotCount).toBeGreaterThan(0);

    // A spawn here would make the enemy count exceed the render snapshot's
    // enemy capacity, which throws inside the frame rather than degrading.
    expect(() => {
      runtime.advanceFrame(SIMULATION_STEP_MS);
    }).not.toThrow();

    expect(runtime.readout().enemyCount).toBe(MVP0_MAX_LIVE_ENEMIES);

    runtime.dispose();
  });

  it('resumes spawning once an enemy slot frees up', () => {
    const world = new World(MVP0_WORLD_CAPACITY);
    spawnDistantEnemies(world, MVP0_MAX_LIVE_ENEMIES);

    const runtime = composeRuntime(world);
    runtime.start();
    runtime.advanceFrame(SIMULATION_STEP_MS);

    expect(runtime.readout().enemyCount).toBe(MVP0_MAX_LIVE_ENEMIES);

    // Retire one enemy by hand, then reach the next cadence tick.
    const enemySystem = new EnemySystem();
    for (let slot = 0; slot < world.masks.length; slot += 1) {
      const mask = world.masks[slot] ?? 0;

      if ((mask & ComponentMask.Enemy) !== 0) {
        enemySystem.releaseEnemy(world, world.entityIdOf(slot));
        break;
      }
    }

    expect(runtime.readout().enemyCount).toBe(MVP0_MAX_LIVE_ENEMIES - 1);

    while (runtime.tick < 61) {
      runtime.advanceFrame(SIMULATION_STEP_MS);
    }

    expect(runtime.readout().enemyCount).toBe(MVP0_MAX_LIVE_ENEMIES);

    runtime.dispose();
  });
});
