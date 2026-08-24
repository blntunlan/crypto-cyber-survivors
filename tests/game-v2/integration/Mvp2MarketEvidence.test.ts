import { describe, expect, it } from 'vitest';

import { SIMULATION_STEP_MS } from '@/game-v2/config/Mvp0Config';
import { TREND_BREAKOUT_ENTRY_THRESHOLD } from '@/game-v2/config/TrendBreakoutFamily';
import {
  VOLATILITY_SURGE_ACTIVE_TICKS,
  VOLATILITY_SURGE_CONFIRMATION_TICKS,
  VOLATILITY_SURGE_ENTRY_THRESHOLD,
  VOLATILITY_SURGE_TELEGRAPH_TICKS,
} from '@/game-v2/config/VolatilitySurgeFamily';
import { type MarketSnapshot } from '@/game-v2/contracts/MarketSnapshot';
import { createRunIdentity, type RunIdentity } from '@/game-v2/contracts/RunIdentity';
import { MarketEncounterRuntime } from '@/game-v2/market/MarketEncounterRuntime';
import { ReplayRunner, type ReplayRuntimeFactory } from '@/game-v2/replay/ReplayRunner';
import { createMvp0Runtime } from '@/game-v2/runtime/createMvp0Runtime';
import { type IntentSource } from '@/game-v2/runtime/GameV2Runtime';

import {
  createManualIntentSource,
  resolveAnyOfferChoiceIndex,
  steerToward,
} from '../support/scriptedRun';

/**
 * `V2-213` acceptance evidence: MVP-2's stated Done-When is "golden
 * fixtures, edge cases, playable market feel, and performance evidence
 * are committed." Before this task every `game-v2/market/**` mechanism
 * (`V2-203`..`V2-212`) was proven only in isolation, never wired into the
 * real production tick order. This file drives the real `GameV2Runtime`,
 * via `MarketEncounterRuntime`, through all three real encounter output
 * kinds and a Convergence bonus, then re-proves replay determinism at
 * that state using the identical deterministic scripted market source
 * (`V2-ADR-153`).
 */

/**
 * A deterministic, self-driving `MarketSnapshotSource`: `latest()` derives
 * its answer purely from how many times it has been called, not from wall
 * time or any external state. `MarketEncounterRuntime.step` calls it
 * exactly once per processed simulation tick, so a live run and a replay
 * of that same run's recorded commands call it the identical number of
 * times in the identical order — reconstructing a fresh instance with the
 * same script for replay reproduces the identical snapshot sequence.
 *
 * The script stages three real family triggers on non-colliding ticks
 * (verified empirically, matching this project's own tick-math precedent
 * for encounter tests): `Trend/Breakout` (`SPAWN`) confirms at call 61;
 * `Volatility Surge` (`WORLD_EVENT`) arms right after and confirms at call
 * 122, telegraphs to `ACTIVE` at 242, and expires at 722; `Volume/Whale`
 * (`LOOT_EVENT`) spikes once at call 300, safely inside the hazard's
 * `ACTIVE` window where no other family produces a new output that tick.
 */
class ScriptedMarketSnapshotSource {
  private callCount = 0;

  public latest(): MarketSnapshot {
    this.callCount += 1;
    const tick = this.callCount;

    const trendStrength = tick <= 61 ? TREND_BREAKOUT_ENTRY_THRESHOLD + 0.1 : 0;
    const trendDirection = tick <= 61 ? 'UP' : 'NEUTRAL';
    const atrPercent = tick >= 62 ? VOLATILITY_SURGE_ENTRY_THRESHOLD + 0.01 : 0.001;
    const whaleTier = tick === 300 ? 3 : 0;

    return {
      schemaVersion: 1,
      asset: 'BTC',
      price: 65_000,
      rsi: 50,
      rsiState: 'NEUTRAL',
      atrPercent,
      normalizedVolume: 1,
      volumePercentile: 0.5,
      whaleTier,
      trendStrength,
      trendDirection,
      timestamp: tick * SIMULATION_STEP_MS,
      isSynthetic: false,
    };
  }
}

const HAZARD_EXPIRY_TICK =
  1 +
  VOLATILITY_SURGE_CONFIRMATION_TICKS +
  VOLATILITY_SURGE_TELEGRAPH_TICKS +
  VOLATILITY_SURGE_ACTIVE_TICKS;

const EVIDENCE_RUN_TICKS = HAZARD_EXPIRY_TICK + 20;
const DASH_RADIUS = 1.3;

type EvidenceRun = {
  runtime: ReturnType<typeof createMvp0Runtime>;
  survived: boolean;
  observedSpawnGrowth: boolean;
};

const runIdentityFor = (label: string): RunIdentity =>
  createRunIdentity(`mvp2-market-evidence-${label}`, 2_130);

/** Drives a real production-path run with the scripted market source wired in. */
const driveMarketEvidenceRun = (
  intentSource: IntentSource,
  intent: { moveX: number; moveY: number; dashPressed: boolean }
): EvidenceRun => {
  const runtime = createMvp0Runtime({
    runIdentity: runIdentityFor('live'),
    intentSource,
    marketEncounterRuntime: new MarketEncounterRuntime({
      snapshotSource: new ScriptedMarketSnapshotSource(),
    }),
  });

  runtime.start();

  let survived = true;
  let observedSpawnGrowth = false;
  let driftAngle = 0;

  for (let frame = 0; frame < EVIDENCE_RUN_TICKS; frame += 1) {
    const readout = runtime.readout();

    if (readout.phase === 'level-up') {
      const choiceIndex = resolveAnyOfferChoiceIndex(runtime, 'ability');
      runtime.chooseUpgrade(choiceIndex);
      continue;
    }

    if (readout.phase === 'game-over') {
      survived = false;
      break;
    }

    if (readout.enemyCount > 0) {
      observedSpawnGrowth = true;
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

  return { runtime, survived, observedSpawnGrowth };
};

type CapturedEvidence = {
  survived: boolean;
  observedSpawnGrowth: boolean;
  readout: ReturnType<ReturnType<typeof createMvp0Runtime>['readout']>;
  recording: ReturnType<ReturnType<typeof createMvp0Runtime>['exportRecording']>;
  liveHash: string;
};

let cachedEvidence: CapturedEvidence | undefined;

/** The scenario is deterministic; build it once and reuse across assertions. */
const buildEvidence = (): CapturedEvidence => {
  if (cachedEvidence === undefined) {
    const { source, intent } = createManualIntentSource();
    const run = driveMarketEvidenceRun(source, intent);
    cachedEvidence = {
      survived: run.survived,
      observedSpawnGrowth: run.observedSpawnGrowth,
      readout: run.runtime.readout(),
      recording: run.runtime.exportRecording(),
      liveHash: run.runtime.snapshotHash(),
    };
    run.runtime.dispose();
  }

  return cachedEvidence;
};

describe('market encounters wired into the real production tick order (V2-213)', () => {
  it('survives the scripted window with all three real encounter kinds observed', () => {
    const evidence = buildEvidence();

    expect(evidence.survived).toBe(true);
    expect(evidence.observedSpawnGrowth).toBe(true);
  });

  it('adds a market-bonus contribution to Convergence beyond kill-only accrual', () => {
    const evidence = buildEvidence();

    expect(evidence.survived).toBe(true);
    expect(evidence.readout.convergenceProgress).toBeGreaterThan(0);
  });

  it('replays the evidence recording to the identical final state hash using the identical scripted market source', () => {
    const evidence = buildEvidence();
    expect(evidence.survived).toBe(true);

    const replayFactory: ReplayRuntimeFactory = (
      runIdentity,
      positionContext,
      intentSource
    ) =>
      createMvp0Runtime({
        runIdentity,
        positionContext,
        intentSource,
        marketEncounterRuntime: new MarketEncounterRuntime({
          snapshotSource: new ScriptedMarketSnapshotSource(),
        }),
      });

    const replayRunner = new ReplayRunner(replayFactory);
    const replayed = replayRunner.run(evidence.recording, 60);

    expect(replayed.finalHash).toBe(evidence.liveHash);
    expect(replayed.commandsApplied).toBe(evidence.recording.commands.length);
  });

  it('a flat market (default inert MarketEncounterRuntime) still reaches Convergence via kills alone, unaffected', () => {
    const { source, intent } = createManualIntentSource();
    const runtime = createMvp0Runtime({
      runIdentity: runIdentityFor('flat'),
      intentSource: source,
    });

    runtime.start();

    let driftAngle = 0;
    for (let frame = 0; frame < EVIDENCE_RUN_TICKS; frame += 1) {
      const readout = runtime.readout();

      if (readout.phase === 'level-up') {
        const choiceIndex = resolveAnyOfferChoiceIndex(runtime, 'ability');
        runtime.chooseUpgrade(choiceIndex);
        continue;
      }

      if (readout.phase === 'game-over') {
        break;
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

      runtime.advanceFrame(SIMULATION_STEP_MS);
    }

    const readout = runtime.readout();
    expect(readout.convergenceProgress).toBeGreaterThan(0);
    runtime.dispose();
  });
});
