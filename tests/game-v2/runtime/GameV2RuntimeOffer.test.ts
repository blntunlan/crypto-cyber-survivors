import { describe, expect, it } from 'vitest';

import { SIMULATION_STEP_MS } from '@/game-v2/config/Mvp0Config';
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
import { AbilityLoadoutSystem } from '@/game-v2/systems/AbilityLoadoutSystem';
import { CombatSystem } from '@/game-v2/systems/CombatSystem';
import { DashSystem } from '@/game-v2/systems/DashSystem';
import { EnemySystem } from '@/game-v2/systems/EnemySystem';
import { LevelUpOfferSystem } from '@/game-v2/systems/LevelUpOfferSystem';
import { MovementSystem } from '@/game-v2/systems/MovementSystem';
import { PassiveLoadoutSystem } from '@/game-v2/systems/PassiveLoadoutSystem';
import { ProgressionSystem } from '@/game-v2/systems/ProgressionSystem';
import { TargetingSystem } from '@/game-v2/systems/TargetingSystem';
import { WeaponSystem } from '@/game-v2/systems/WeaponSystem';
import { World } from '@/game-v2/world/World';

/** Mirrors GameV2RuntimeBounds.test.ts's composition so the world can be sized directly. */
const composeRuntime = (world: World): GameV2Runtime => {
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
    runIdentity: createRunIdentity('offer', 1),
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
  });
};

describe('GameV2Runtime reroll/banish (V2-105)', () => {
  it('reports 1/1 charges via readout before any level-up and 0/0 defaults before start', () => {
    const runtime = composeRuntime(new World(8));
    expect(runtime.readout().rerollCharges).toBe(0);
    expect(runtime.readout().banishCharges).toBe(0);

    runtime.start();
    expect(runtime.readout().rerollCharges).toBe(1);
    expect(runtime.readout().banishCharges).toBe(1);

    runtime.dispose();
  });

  it('rejects rerollOffer/banishOffer outside the level-up phase', () => {
    const runtime = composeRuntime(new World(8));
    runtime.start();

    expect(() => runtime.rerollOffer()).toThrow('no upgrade offer is open');
    expect(() => runtime.banishOffer(0)).toThrow('no upgrade offer is open');

    runtime.dispose();
  });

  it('spends each charge exactly once and rejects a second use of either', () => {
    const world = new World(16);
    const runtime = composeRuntime(world);
    runtime.start();

    // A stationary enemy spawned on top of the idle player: auto-fire kills
    // it in three hits, and its XP pickup spawns at the kill position —
    // close enough to the stationary player to be collected the same tick,
    // reaching level-up without any movement.
    new EnemySystem().spawnEnemy(world, new DeterministicRng(1), {
      type: 'point',
      x: 0.1,
      y: 0,
    });

    let framesAdvanced = 0;
    while (runtime.phase === 'playing') {
      runtime.advanceFrame(SIMULATION_STEP_MS);
      framesAdvanced += 1;
      if (framesAdvanced > 1000) {
        throw new Error('scripted enemy never triggered a level-up');
      }
    }

    expect(runtime.phase).toBe('level-up');
    expect(runtime.readout().rerollCharges).toBe(1);
    expect(runtime.readout().banishCharges).toBe(1);

    runtime.rerollOffer();
    expect(runtime.readout().rerollCharges).toBe(0);
    expect(() => runtime.rerollOffer()).toThrow('no reroll charge remains');

    const offer = runtime.readout().levelUpOffer;
    expect(offer).not.toBeNull();
    const banishIndex = offer!.candidates.findIndex(candidate => candidate !== null) as
      | 0
      | 1
      | 2;

    runtime.banishOffer(banishIndex);
    expect(runtime.readout().banishCharges).toBe(0);
    expect(() => runtime.banishOffer(banishIndex)).toThrow('no banish charge remains');

    // Neither action touched the paused lifecycle or the tick counter.
    expect(runtime.phase).toBe('level-up');

    runtime.dispose();
  });
});
