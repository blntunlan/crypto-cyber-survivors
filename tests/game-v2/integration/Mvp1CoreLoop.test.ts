import { describe, expect, it } from 'vitest';

import { MVP1_ABILITY_REGISTRY } from '@/game-v2/config/AbilityRegistry';
import {
  MVP1_MAX_PLAYER_LEVEL,
  MVP1_TOTAL_BUILD_PICKS,
} from '@/game-v2/config/LevelCurve';
import { SIMULATION_STEP_MS } from '@/game-v2/config/Mvp0Config';
import { MVP1_PASSIVE_REGISTRY } from '@/game-v2/config/PassiveRegistry';
import { ABILITY_MAX_TIER, ABILITY_SLOT_COUNT } from '@/game-v2/contracts/AbilitySlot';
import { PASSIVE_MAX_LEVEL, PASSIVE_SLOT_COUNT } from '@/game-v2/contracts/PassiveSlot';
import { createRunIdentity } from '@/game-v2/contracts/RunIdentity';
import { type WorldSnapshot } from '@/game-v2/contracts/WorldSnapshot';
import { ReplayRunner } from '@/game-v2/replay/ReplayRunner';
import { createMvp0Runtime } from '@/game-v2/runtime/createMvp0Runtime';
import { ComponentMask } from '@/game-v2/world/ComponentMask';

import {
  createManualIntentSource,
  resolveAnyOfferChoiceIndex,
  steerToward,
} from '../support/scriptedRun';

/**
 * `V2-110` acceptance evidence: MVP-1's stated goal is "constrained builds
 * create meaningful play". Before this task that claim was proven only
 * through hand-assembled systems (`FullBuild.test.ts`, `ConcurrentWeapons.test.ts`),
 * never through the real `GameV2Runtime` production tick order. This file
 * drives the real runtime until the build is capped, then re-proves replay
 * and reset at that state.
 */

const PROJECTILE_MASK =
  ComponentMask.Transform |
  ComponentMask.Velocity |
  ComponentMask.Body |
  ComponentMask.Projectile;

const liveProjectileDamages = (world: WorldSnapshot): number[] => {
  const damages: number[] = [];

  for (let slot = 0; slot < world.masks.length; slot += 1) {
    if (((world.masks[slot] ?? 0) & PROJECTILE_MASK) === PROJECTILE_MASK) {
      damages.push(world.projectileDamage[slot] ?? 0);
    }
  }

  return damages;
};

/**
 * Empirically-tuned survival/collection policy, in the same spirit as
 * `ConvergenceEnvelope.test.ts`'s drift-and-dash policy: not a claim about
 * optimal play, only one that reliably reaches a fully capped build. It
 * actively seeks the nearest dropped XP pickup (needed because pickups have
 * a lifetime and no magnet), and otherwise slow-drifts with a defensive dash
 * so nothing spawned behind ever catches up.
 */
/**
 * Empirically observed: this scenario reaches a fully capped build at tick
 * 29,815. The cap here is a generous ~1.5x safety net against a genuine
 * stall, not a derived value.
 */
const FRAME_SAFETY_CAP = 45_000;
const DASH_RADIUS = 1.3;
const DAMAGE_SAMPLE_INTERVAL_TICKS = 20;

type FullBuildRun = {
  runtime: ReturnType<typeof createMvp0Runtime>;
  reachedCap: boolean;
  observedDistinctDamageSignatures: Set<number>;
};

const driveToFullBuild = (seed: number): FullBuildRun => {
  const { source, intent } = createManualIntentSource();
  const runtime = createMvp0Runtime({
    runIdentity: createRunIdentity(`full-build-${seed}`, seed),
    intentSource: source,
  });

  runtime.start();

  let readout = runtime.readout();
  let driftAngle = 0;
  let reachedCap = false;
  const observedDistinctDamageSignatures = new Set<number>();

  for (let frame = 0; frame < FRAME_SAFETY_CAP; frame += 1) {
    readout = runtime.readout();

    // Resolve any pending offer before checking the cap: the level counter
    // advances the instant the XP threshold is crossed, at the same tick the
    // run pauses for that level's card, so a level-cap check ahead of the
    // offer-resolution check would exit one command short of
    // `MVP1_TOTAL_BUILD_PICKS` and leave the final ability/passive slot
    // unresolved.
    if (readout.phase === 'level-up') {
      const choiceIndex = resolveAnyOfferChoiceIndex(runtime, 'ability');
      runtime.chooseUpgrade(choiceIndex);
      continue;
    }

    if (readout.playerLevel >= MVP1_MAX_PLAYER_LEVEL) {
      reachedCap = true;
      break;
    }

    if (readout.phase === 'game-over') {
      break;
    }

    // Once at least two ability slots are occupied, sample which distinct
    // damage signatures are live — direct evidence of concurrent autonomous
    // firing through the real production path (V2-111's own mechanism,
    // re-observed here rather than re-derived). Sampled periodically, not
    // every tick: `checkpoint()` copies the whole world and this loop runs
    // tens of thousands of ticks.
    const occupiedAbilitySlots = readout.abilitySlots.filter(
      slot => slot !== null
    ).length;
    if (occupiedAbilitySlots >= 2 && frame % DAMAGE_SAMPLE_INTERVAL_TICKS === 0) {
      for (const damage of liveProjectileDamages(runtime.checkpoint().world)) {
        observedDistinctDamageSignatures.add(damage);
      }
    }

    intent.dashPressed = false;

    if (readout.nearestXpPickupX !== null && readout.nearestXpPickupY !== null) {
      steerToward(
        intent,
        readout.playerX,
        readout.playerY,
        readout.nearestXpPickupX,
        readout.nearestXpPickupY
      );
    } else {
      driftAngle += 0.0025;
      intent.moveX = Math.cos(driftAngle) * 0.999;
      intent.moveY = Math.sin(driftAngle) * 0.999;
    }

    let nearestDistance = Number.POSITIVE_INFINITY;
    if (readout.nearestEnemyX !== null && readout.nearestEnemyY !== null) {
      nearestDistance = Math.hypot(
        readout.nearestEnemyX - readout.playerX,
        readout.nearestEnemyY - readout.playerY
      );
    }

    if (
      nearestDistance <= DASH_RADIUS &&
      readout.dashCooldownTicks === 0 &&
      readout.nearestEnemyX !== null &&
      readout.nearestEnemyY !== null
    ) {
      steerToward(
        intent,
        readout.nearestEnemyX,
        readout.nearestEnemyY,
        readout.playerX,
        readout.playerY
      );
      intent.dashPressed = true;
    }

    runtime.advanceFrame(SIMULATION_STEP_MS);
  }

  return { runtime, reachedCap, observedDistinctDamageSignatures };
};

const SCENARIO_SEED = 1_110;

type CapturedScenario = {
  reachedCap: boolean;
  readout: ReturnType<ReturnType<typeof createMvp0Runtime>['readout']>;
  recording: ReturnType<ReturnType<typeof createMvp0Runtime>['exportRecording']>;
  liveHash: string;
  observedDistinctDamageSignatures: Set<number>;
};

let cachedScenario: CapturedScenario | undefined;

/** The scenario is deterministic and expensive (~30k ticks); build it once. */
const buildScenario = (): CapturedScenario => {
  if (cachedScenario === undefined) {
    const run = driveToFullBuild(SCENARIO_SEED);
    cachedScenario = {
      reachedCap: run.reachedCap,
      readout: run.runtime.readout(),
      recording: run.runtime.exportRecording(),
      liveHash: run.runtime.snapshotHash(),
      observedDistinctDamageSignatures: run.observedDistinctDamageSignatures,
    };
    run.runtime.dispose();
  }

  return cachedScenario;
};

describe('a full build is reachable through the real production tick order (V2-110)', () => {
  it('reaches every registry-fillable ability tier and passive level through ordinary play', () => {
    const scenario = buildScenario();

    expect(scenario.reachedCap).toBe(true);

    const { readout } = scenario;
    const filledAbilitySlots = Math.min(ABILITY_SLOT_COUNT, MVP1_ABILITY_REGISTRY.size);
    const occupied = readout.abilitySlots.filter(slot => slot !== null);
    expect(occupied).toHaveLength(filledAbilitySlots);
    for (const slot of occupied) {
      expect(slot.tier).toBe(ABILITY_MAX_TIER);
    }

    const filledPassiveSlots = Math.min(PASSIVE_SLOT_COUNT, MVP1_PASSIVE_REGISTRY.size);
    expect(filledPassiveSlots).toBeGreaterThan(0);
    expect(readout.moveSpeedLevel).toBe(PASSIVE_MAX_LEVEL);

    expect(readout.convergenceProgress).toBeGreaterThan(0);

    expect(scenario.observedDistinctDamageSignatures.size).toBeGreaterThanOrEqual(2);

    expect(scenario.recording.commands).toHaveLength(MVP1_TOTAL_BUILD_PICKS);
  });

  it('replays the full-build recording to the identical final state hash', () => {
    const scenario = buildScenario();
    expect(scenario.reachedCap).toBe(true);

    const replayRunner = new ReplayRunner();
    const replayed = replayRunner.run(scenario.recording, 60);

    expect(replayed.finalHash).toBe(scenario.liveHash);
    expect(replayed.commandsApplied).toBe(scenario.recording.commands.length);
  });

  it('leaves no residual ability, passive, offer, or Convergence state after resetting a full-build run', () => {
    const run = driveToFullBuild(1_110);
    expect(run.reachedCap).toBe(true);

    run.runtime.reset();

    const readout = run.runtime.readout();
    expect(readout.phase).toBe('idle');
    expect(readout.tick).toBe(0);
    expect(readout.playerLevel).toBe(0);
    expect(readout.abilitySlots.every(slot => slot === null)).toBe(true);
    expect(readout.moveSpeedLevel).toBe(0);
    expect(readout.convergenceProgress).toBe(0);
    expect(readout.convergenceReached).toBe(false);
    expect(readout.levelUpOffer).toBeNull();
    expect(readout.rerollCharges).toBe(0);
    expect(readout.banishCharges).toBe(0);

    run.runtime.dispose();
  });
});
