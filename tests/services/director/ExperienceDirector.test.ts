import { describe, expect, it } from 'vitest';
import { DirectorInputBuilder } from '../../../services/director/DirectorInputBuilder';
import {
  ExperienceDirector,
  createGameplaySnapshotHash,
} from '../../../services/director/ExperienceDirector';
import {
  DirectorTelemetryRecorder,
  LegacyDifficultyAdapter,
} from '../../../services/director/DirectorTelemetry';
import { resolveDirectorRuntimePlan } from '../../../services/director/DirectorRuntimeMode';
import { ShadowDirectorRuntime } from '../../../services/director/ShadowDirectorRuntime';

const createInput = (overrides: Record<string, unknown> = {}) => ({
  tick: 100,
  deltaSeconds: 0.25,
  pacing: {
    state: 'PEAK' as const,
    threatMultiplier: 1.25,
    remainingSeconds: 20,
  },
  market: {
    revision: 11,
    regime: 'VOLATILE' as const,
    confidence: 0.8,
    pressure: 0.75,
    volatility: 0.9,
    volume: 0.85,
    trend: 0.2,
    rsiExtremity: 0.4,
    whalePressure: 0,
    activeEventFamily: 'VOLUME_SURGE' as const,
    eventTelegraphEndsAtTick: 102,
  },
  position: {
    sourceSequence: 11,
    alignment: -0.6,
    advantage: 0,
    headwind: 0.6,
    liquidationProximity: 0.1,
    leverageRisk: 0.8,
    isLiquidated: false,
  },
  player: {
    healthRatio: 0.8,
    combatMastery: 0.6,
    buildPower: 0.5,
    recentDamagePerSecond: 0.2,
    killsPerMinute: 20,
    mobilityUsage: 0.4,
    recentDamagePressure: 0.2,
    nearbyThreatPressure: 0.3,
    escapeResourcePressure: 0.1,
    recoveryNeed: 0.2,
  },
  world: {
    activeThreat: 0,
    activePrimaryEncounters: 0,
    activeSupportEncounters: 0,
    queuedEventFamily: null,
    doomStacks: 0,
  },
  run: {
    runId: 'director-fixture',
    seed: 17,
    mode: 'TOKEN' as const,
    elapsedSeconds: 600,
    greedLevel: 2,
    isMarketStale: false,
  },
  ...overrides,
});

describe('ExperienceDirector', () => {
  it('produces the same revisioned snapshot hash for the same fixture and seed', () => {
    const first = new ExperienceDirector();
    const second = new ExperienceDirector();
    const firstFrame = new DirectorInputBuilder().build(createInput());
    const secondFrame = new DirectorInputBuilder().build(createInput());

    const firstSnapshot = first.update(firstFrame);
    const secondSnapshot = second.update(secondFrame);

    expect(createGameplaySnapshotHash(firstSnapshot)).toBe(
      createGameplaySnapshotHash(secondSnapshot)
    );
    expect(firstSnapshot.revision).toBe(1);
    expect(firstSnapshot.encounter.phase).toBe('TELEGRAPH');
  });

  it('keeps its pre-allocated snapshot stable for the same simulation tick', () => {
    const director = new ExperienceDirector();
    const builder = new DirectorInputBuilder();
    const initial = director.update(builder.build(createInput()));
    const initialHash = createGameplaySnapshotHash(initial);
    const repeated = director.update(
      builder.build(
        createInput({
          market: {
            ...createInput().market,
            pressure: 1,
          },
        })
      )
    );

    expect(repeated).toBe(initial);
    expect(createGameplaySnapshotHash(repeated)).toBe(initialHash);
  });

  it('runs at five hertz unless a new market event requires an immediate shadow update', () => {
    const director = new ExperienceDirector();
    const builder = new DirectorInputBuilder();
    const initial = director.update(builder.build(createInput()));
    const initialRevision = initial.revision;
    const throttled = director.update(
      builder.build(
        createInput({ tick: 101, run: { ...createInput().run, elapsedSeconds: 600.1 } })
      )
    );
    const throttledRevision = throttled.revision;
    const eventTriggered = director.update(
      builder.build(
        createInput({
          tick: 102,
          run: { ...createInput().run, elapsedSeconds: 600.15 },
          market: {
            ...createInput().market,
            revision: 12,
            activeEventFamily: 'PANIC_CRASH',
            eventTelegraphEndsAtTick: 104,
          },
        })
      )
    );

    expect(throttledRevision).toBe(initialRevision);
    expect(eventTriggered.revision).toBe(initialRevision + 1);
    expect(director.getLastTrace().reasonCodes).toContain('MARKET_EVENT_TRIGGER');
  });

  it('records guardrail clamps and compares legacy output without gameplay side effects', () => {
    const director = new ExperienceDirector();
    const snapshot = director.update(
      new DirectorInputBuilder().build(
        createInput({
          run: { ...createInput().run, elapsedSeconds: 2_100, greedLevel: 99 },
          market: {
            ...createInput().market,
            activeEventFamily: null,
            eventTelegraphEndsAtTick: null,
            pressure: 1,
          },
        })
      )
    );
    const recorder = new DirectorTelemetryRecorder();
    const record = recorder.record(
      snapshot,
      director.getLastTrace(),
      LegacyDifficultyAdapter.fromOutput({
        total: 1.5,
        wavePhase: 'active',
        liquidationWarning: 'NONE',
        fovReduction: 0,
        shockActive: false,
        spawnRate: 1.2,
        enemySpeed: 1.1,
        enemyHP: 1.3,
        enemyDamage: 1.2,
        enemyVariety: 1,
        chaosLevel: 0,
        mercyFactor: 0,
        pressureIntensity: 0.4,
        whaleProbability: 0,
        xpMultiplier: 1,
        gemDropRate: 1,
      })
    );

    expect(director.getLastTrace().guardrailCodes).toContain('THREAT_TARGET_MAXIMUM');
    expect(record.legacy?.spawnRate).toBe(1.2);
    expect(record.director.threatTarget).toBe(snapshot.threat.target);
    expect(recorder.getRecords()).toHaveLength(1);
  });

  it('keeps SHADOW mode observation-only while recording one common telemetry sample', () => {
    const runtime = new ShadowDirectorRuntime();
    const plan = resolveDirectorRuntimePlan('SHADOW');
    const result = runtime.update(
      plan,
      new DirectorInputBuilder().build(createInput()),
      null
    );

    expect(plan.appliesDirectorSnapshot).toBe(false);
    expect(result?.snapshot.revision).toBe(1);
    expect(result?.telemetry?.legacy).toBeNull();
    expect(runtime.getRecords()).toHaveLength(1);
  });
});
