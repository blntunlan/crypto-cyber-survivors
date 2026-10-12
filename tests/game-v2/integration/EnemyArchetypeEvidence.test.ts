import { describe, expect, it } from 'vitest';

import {
  BLOATER_ENEMY,
  CHARGER_ENEMY,
  SNIPER_ENEMY,
} from '@/game-v2/config/EnemyRegistry';
import {
  MVP0_PLAYER_SPAWN_X,
  MVP0_PLAYER_SPAWN_Y,
  MVP0_WORLD_CAPACITY,
  SIMULATION_STEP_MS,
} from '@/game-v2/config/Mvp0Config';
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
import { EnemyAttackSystem } from '@/game-v2/systems/EnemyAttackSystem';
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

/**
 * `V2-300` acceptance evidence: proves the three new telegraphed
 * archetypes actually fire through the real `GameV2Runtime` tick order,
 * not just in `EnemyAttackSystem`/`EnemySystem`'s own isolated unit
 * tests. Mirrors `GameV2RuntimeMarketWiring.test.ts`'s own direct
 * construction + live `World` reference technique (`V2-213`'s own
 * lesson: a real run's downstream state alone does not prove the
 * mechanism actually engaged — these tests inspect the live telegraph
 * phase directly, not just infer it from health deltas).
 */
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
    runIdentity: createRunIdentity('archetype-evidence', 1),
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
    enemyAttackSystem: new EnemyAttackSystem(),
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
    marketEncounterRuntime: new MarketEncounterRuntime(),
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

describe('telegraphed enemy archetypes fire through the real GameV2Runtime tick order (V2-300)', () => {
  it('a charger telegraphs, then reaches ACTIVE (its dash window) through real ticks', () => {
    const world = new World(MVP0_WORLD_CAPACITY);
    const runtime = composeRuntime(world);
    runtime.start();

    const enemySystem = new EnemySystem();
    const enemy = enemySystem.spawnEnemy(
      world,
      new DeterministicRng(2),
      { type: 'point', x: MVP0_PLAYER_SPAWN_X + 3, y: MVP0_PLAYER_SPAWN_Y },
      CHARGER_ENEMY
    );
    const slot = world.slotOf(enemy);

    let sawTelegraphing = false;
    let sawActive = false;

    for (let frame = 0; frame < 240; frame += 1) {
      const phase = world.enemyTelegraphPhase[slot] ?? 0;
      if (phase === 1) {
        sawTelegraphing = true;
      }
      if (phase === 2) {
        sawActive = true;
      }
      runtime.advanceFrame(SIMULATION_STEP_MS);
    }

    expect(sawTelegraphing).toBe(true);
    expect(sawActive).toBe(true);
  });

  it('a bloater arms, bursts, and destroys itself through real ticks', () => {
    const world = new World(MVP0_WORLD_CAPACITY);
    const runtime = composeRuntime(world);
    runtime.start();

    const enemySystem = new EnemySystem();
    const enemy = enemySystem.spawnEnemy(
      world,
      new DeterministicRng(3),
      { type: 'point', x: MVP0_PLAYER_SPAWN_X + 0.4, y: MVP0_PLAYER_SPAWN_Y },
      BLOATER_ENEMY
    );
    const slot = world.slotOf(enemy);

    // The primary, unconfounded proof: the phase transition itself is
    // attributable only to `EnemyAttackSystem` — unlike `isAlive`/health,
    // which the player's own pre-existing weapon autofire and ordinary
    // contact damage could also produce on their own (a real gap found
    // while writing this test: an earlier draft asserted only `isAlive`/
    // health and passed even with `EnemyAttackSystem` disabled).
    let sawTelegraphing = false;
    for (let frame = 0; frame < 120; frame += 1) {
      if (world.isAlive(enemy) && (world.enemyTelegraphPhase[slot] ?? 0) === 1) {
        sawTelegraphing = true;
      }
      runtime.advanceFrame(SIMULATION_STEP_MS);
    }

    expect(sawTelegraphing).toBe(true);
    expect(world.isAlive(enemy)).toBe(false);
  });

  it('a sniper holds range, telegraphs, and resolves a line-check hit through real ticks', () => {
    const world = new World(MVP0_WORLD_CAPACITY);
    const runtime = composeRuntime(world);
    runtime.start();
    const playerSlot = findPlayerSlot(world);
    const startingHealth = world.health[playerSlot] ?? 0;

    const enemySystem = new EnemySystem();
    const enemy = enemySystem.spawnEnemy(
      world,
      new DeterministicRng(4),
      { type: 'point', x: MVP0_PLAYER_SPAWN_X + 4, y: MVP0_PLAYER_SPAWN_Y },
      SNIPER_ENEMY
    );
    const slot = world.slotOf(enemy);

    let sawTelegraphing = false;
    for (let frame = 0; frame < 300; frame += 1) {
      if ((world.enemyTelegraphPhase[slot] ?? 0) === 1) {
        sawTelegraphing = true;
      }
      runtime.advanceFrame(SIMULATION_STEP_MS);
    }

    expect(sawTelegraphing).toBe(true);
    expect(world.health[playerSlot] ?? 0).toBeLessThan(startingHealth);
  });
});
