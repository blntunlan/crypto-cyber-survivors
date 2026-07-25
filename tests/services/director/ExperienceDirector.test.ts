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
import { ShadowDirectorRuntime } from '../../../services/director/ShadowDirectorRuntime';
import { createNeutralRuntimeDifficultySnapshot } from '../../../types/runtimeDifficulty';

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
    eventTelegraphEndsAtElapsedSeconds: 602,
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
            eventTelegraphEndsAtElapsedSeconds: 604,
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
            eventTelegraphEndsAtElapsedSeconds: null,
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

  it('plans and activates one earned advantage mechanic in production update', () => {
    const director = new ExperienceDirector();
    const input = createInput({
      deltaSeconds: 60,
      position: {
        ...createInput().position,
        alignment: 1,
        advantage: 1,
        headwind: 0,
      },
      market: {
        ...createInput().market,
        activeEventFamily: null,
        eventTelegraphEndsAtElapsedSeconds: null,
      },
    });

    const snapshot = director.update(new DirectorInputBuilder().build(input));

    expect(snapshot.advantage.activeMechanic).not.toBeNull();
    expect(snapshot.advantage.availableCredits).toBeLessThan(
      snapshot.advantage.maximumCredits
    );
  });

  it('freezes Advantage accrual while the market is stale', () => {
    const director = new ExperienceDirector();
    const builder = new DirectorInputBuilder();
    const favorablePosition = {
      ...createInput().position,
      alignment: 1,
      advantage: 1,
      headwind: 0,
    };
    const quietMarket = {
      ...createInput().market,
      activeEventFamily: null,
      eventTelegraphEndsAtElapsedSeconds: null,
    };
    const live = director.update(
      builder.build(
        createInput({
          deltaSeconds: 1,
          position: favorablePosition,
          market: quietMarket,
        })
      )
    );
    const creditsBeforeStale = live.advantage.availableCredits;
    const stale = director.update(
      builder.build(
        createInput({
          tick: 101,
          deltaSeconds: 60,
          position: favorablePosition,
          market: { ...quietMarket, revision: 12 },
          run: {
            ...createInput().run,
            elapsedSeconds: 660,
            isMarketStale: true,
          },
        })
      )
    );

    expect(stale.advantage.availableCredits).toBe(creditsBeforeStale);
  });

  it('uses the decaying market pressure supplied by stale snapshots', () => {
    const makeStaleTarget = (pressure: number): number => {
      const director = new ExperienceDirector();
      const input = createInput({
        market: {
          ...createInput().market,
          pressure,
          activeEventFamily: null,
          eventTelegraphEndsAtElapsedSeconds: null,
        },
        position: {
          ...createInput().position,
          headwind: 0,
        },
        run: {
          ...createInput().run,
          greedLevel: 0,
          isMarketStale: true,
        },
      });
      return director.update(new DirectorInputBuilder().build(input)).threat.target;
    };

    expect(makeStaleTarget(0.5)).toBeGreaterThan(makeStaleTarget(0));
  });

  it('keeps the retired shadow runtime comparison-only', () => {
    const runtime = new ShadowDirectorRuntime();
    const modular = createNeutralRuntimeDifficultySnapshot({
      tick: 1,
      inputRevision: 1,
    });
    const result = runtime.record(
      'retired-shadow-wrapper',
      {
        revision: 1,
        threatTarget: modular.pressure.threatTarget,
        creditRate: modular.pressure.creditRate,
        spawnWindowSeconds: modular.spawn.spawnWindowSeconds,
        spawnCount: Math.floor(modular.spawn.reservedCredits),
        composition: modular.spawn.directives.map(directive => directive.archetype),
        enemyHealthMultiplier: modular.enemy.healthMultiplier,
        enemyDamageMultiplier: modular.enemy.damageMultiplier,
        enemySpeedMultiplier: modular.enemy.speedMultiplier,
        mercy: modular.recovery.mercy,
        recoveryNeed: modular.recovery.recoveryNeed,
        encounterPhase: modular.encounter.phase,
        presentationIntensity: modular.presentation.intensity,
        quality: modular.meta.quality,
        fallbackCodes: modular.trace.fallbackCodes,
      },
      modular
    );

    expect(result.passed).toBe(true);
    expect(runtime.getRecords()).toHaveLength(1);
  });
});
