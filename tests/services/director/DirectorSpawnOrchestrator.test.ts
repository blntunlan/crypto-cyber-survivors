import { describe, expect, it } from 'vitest';
import { MarketPosition } from '../../../types';
import {
  DirectorSpawnOrchestrator,
  type DirectorSpawnOrchestratorInput,
} from '../../../services/director/DirectorSpawnOrchestrator';
import { createGameplaySnapshotHash } from '../../../services/director/ExperienceDirector';
import { type CanonicalMarketFrame } from '../../../types/marketCanonical';

const createFrame = (sequence: number): CanonicalMarketFrame => ({
  revision: sequence,
  sequence,
  sourceSequence: sequence,
  sourceTimestamp: sequence * 1_000,
  receivedAt: sequence * 1_000,
  quality: 'LIVE',
  price: 50_000 + sequence * 10,
  pnlPercent: -0.01,
  rsi: 55,
  rsiState: 'NEUTRAL',
  atrPercent: 0.01,
  normalizedVolume: 0.85,
  whaleTier: 0,
  macd: { value: 1, signal: 0, histogram: 1 },
  priceChangePercent: 0.01,
  trendStrength: 0.8,
  trendDirection: 'UP',
  source: 'runtime',
});

const createInput = (sequence: number): DirectorSpawnOrchestratorInput => ({
  tick: sequence,
  deltaSeconds: 0.25,
  marketFrame: createFrame(sequence),
  run: {
    runId: 'spawn-replay',
    seed: 7,
    elapsedSeconds: 120,
    mode: 'TOKEN' as const,
    greedLevel: 0,
  },
  position: {
    side: MarketPosition.LONG,
    leverage: 10,
    entryPrice: 50_500,
    liquidationPrice: 45_000,
  },
  player: {
    hpRatio: 0.8,
    damageTakenPerSecond: 0,
    killsPerMinute: 20,
    combatMastery: 0.5,
    buildPower: 0.5,
    mobilityUsage: 0.3,
  },
  world: {
    width: 1280,
    height: 720,
    activeEnemies: 0,
    maxActiveEnemies: 12,
    activePrimaryEncounters: 0,
    activeSupportEncounters: 0,
  },
});

describe('DirectorSpawnOrchestrator', () => {
  it('turns a locked canonical frame into one deterministic gameplay snapshot and spawn plan', () => {
    const first = new DirectorSpawnOrchestrator().update(createInput(10));
    const second = new DirectorSpawnOrchestrator().update(createInput(10));

    expect(first.snapshot.validFromTick).toBe(10);
    expect(first.plan.seed).toBe(7);
    expect(first.plan.intents).toEqual(second.plan.intents);
  });

  it('keeps ordinary survival spawning active while market input is stale', () => {
    const orchestrator = new DirectorSpawnOrchestrator();
    const stale = createInput(11);
    stale.marketFrame.quality = 'STALE';
    stale.deltaSeconds = 10;

    const output = orchestrator.update(stale);

    expect(output.snapshot.encounter.activeEventFamily).toBeNull();
    expect(output.plan.intents.length).toBeGreaterThan(0);
  });

  it('keeps a newly detected market event in telegraph for the configured minimum', () => {
    const orchestrator = new DirectorSpawnOrchestrator();

    orchestrator.update(createInput(1));
    const output = orchestrator.update(createInput(2));

    expect(output.snapshot.encounter.activeEventFamily).not.toBeNull();
    expect(output.snapshot.encounter.phase).toBe('TELEGRAPH');
  });

  it('reserves the threat credits exposed by an emitted spawn plan exactly once', () => {
    const orchestrator = new DirectorSpawnOrchestrator();
    const input = createInput(40);
    input.deltaSeconds = 10;

    const output = orchestrator.update(input);

    expect(output.plan.spendableThreat).toBeGreaterThan(0);
    expect(output.plan.spendableThreat).toBe(
      output.plan.intents.reduce((total, intent) => total + intent.threatCost, 0)
    );
    expect(output.snapshot.threat.availableCredits).toBeLessThan(1);
  });

  it('reuses the latest result without duplicate spawn intents between Director updates', () => {
    const orchestrator = new DirectorSpawnOrchestrator();
    const initial = orchestrator.update(createInput(12));
    const repeatedInput = createInput(12);
    repeatedInput.tick = 13;
    repeatedInput.run.elapsedSeconds = 120.1;
    const repeated = orchestrator.update(repeatedInput);

    expect(repeated).toBe(initial);
    expect(repeated.plan.intents).toEqual([]);
  });

  it('replays a recorded canonical frame sequence with identical snapshot and spawn hashes', () => {
    const replay = new DirectorSpawnOrchestrator();
    const verification = new DirectorSpawnOrchestrator();
    const replayOutputs: Array<{ snapshotHash: string; intents: readonly unknown[] }> =
      [];
    const verificationOutputs: Array<{
      snapshotHash: string;
      intents: readonly unknown[];
    }> = [];

    for (let sequence = 20; sequence < 28; sequence += 1) {
      const replayOutput = replay.update(createInput(sequence));
      const verificationOutput = verification.update(createInput(sequence));
      replayOutputs.push({
        snapshotHash: createGameplaySnapshotHash(replayOutput.snapshot),
        intents: replayOutput.plan.intents,
      });
      verificationOutputs.push({
        snapshotHash: createGameplaySnapshotHash(verificationOutput.snapshot),
        intents: verificationOutput.plan.intents,
      });
    }

    expect(verificationOutputs).toEqual(replayOutputs);
  });

  it('keeps Mirror PvP decisions equal to token decisions for the same seed and frames', () => {
    const tokenInput = createInput(30);
    const mirrorInput = createInput(30);
    mirrorInput.run.mode = 'MIRROR_PVP';

    const tokenOutput = new DirectorSpawnOrchestrator().update(tokenInput);
    const mirrorOutput = new DirectorSpawnOrchestrator().update(mirrorInput);

    expect(createGameplaySnapshotHash(mirrorOutput.snapshot)).toBe(
      createGameplaySnapshotHash(tokenOutput.snapshot)
    );
    expect(mirrorOutput.plan).toEqual(tokenOutput.plan);
  });
});
