import { describe, expect, it, vi } from 'vitest';

import { DifficultyDecisionTraceRing } from '../../../../services/difficulty/runtime/DifficultyDecisionTraceRing';
import {
  DifficultySnapshotComposer,
  type DifficultySnapshotCompositionInput,
} from '../../../../services/difficulty/runtime/DifficultySnapshotComposer';

const createInput = (
  overrides: Partial<DifficultySnapshotCompositionInput> = {}
): DifficultySnapshotCompositionInput => ({
  tick: 10,
  elapsedSeconds: 100,
  inputRevision: 4,
  inputRevisions: { market: 4, player: 3, run: 1, world: 2 },
  seed: 12,
  world: { activeEnemies: 20, maximumEnemies: 60, activeEncounters: 0 },
  market: {
    revision: 1,
    validFromTick: 10,
    inputRevision: 4,
    quality: 'LIVE',
    value: {
      sourceSequence: 9,
      quality: 'LIVE',
      regime: 'VOLATILE',
      confidence: 0.8,
      pressure: 0.7,
      volatility: 0.8,
      volume: 0.6,
      trend: 0.4,
      rsiExtremity: 0.2,
      whalePressure: 0,
      activeEventFamily: null,
      reasonCodes: ['MARKET_LIVE'],
    },
    reasonCodes: ['MARKET_LIVE'],
    clampCodes: [],
  },
  player: {
    revision: 1,
    validFromTick: 10,
    inputRevision: 3,
    quality: 'LIVE',
    value: {
      flowState: 'FLOW',
      engagement: 0.7,
      frustration: 0.2,
      combatMastery: 0.6,
      buildPower: 0.5,
      recentDamagePressure: 0.2,
      killsPerMinute: 30,
      mobilityUsage: 0.4,
      screenPressure: 0.3,
      recoveryNeed: 0.2,
      challengeAdjustment: 0,
      reasonCodes: ['PLAYER_LIVE'],
    },
    reasonCodes: ['PLAYER_LIVE'],
    clampCodes: [],
  },
  position: {
    revision: 1,
    validFromTick: 10,
    inputRevision: 4,
    quality: 'LIVE',
    value: {
      alignment: -0.2,
      advantage: 0,
      headwind: 0.2,
      leverageRisk: 0.3,
      liquidationProximity: 0.1,
      isLiquidated: false,
      reasonCodes: ['POSITION_HEADWIND'],
    },
    reasonCodes: ['POSITION_HEADWIND'],
    clampCodes: [],
  },
  pacing: {
    revision: 1,
    validFromTick: 10,
    inputRevision: 4,
    quality: 'LIVE',
    value: {
      phase: 'PEAK',
      baselinePressure: 0.55,
      minimumPressure: 0.4,
      maximumPressure: 0.7,
      remainingSeconds: 20,
      reasonCodes: ['PACING_PEAK'],
    },
    reasonCodes: ['PACING_PEAK'],
    clampCodes: [],
  },
  recovery: {
    revision: 1,
    validFromTick: 10,
    inputRevision: 3,
    quality: 'LIVE',
    value: {
      mercy: 0.12,
      recoveryNeed: 0.2,
      advantageCreditRate: 0,
      availableAdvantageCredits: 0,
      activeMechanic: null,
      reasonCodes: ['RECOVERY_MERCY'],
    },
    reasonCodes: ['RECOVERY_MERCY'],
    clampCodes: [],
  },
  reservation: {
    revision: 1,
    validFromTick: 10,
    inputRevision: 4,
    requestedPressure: 0.65,
    finalPressure: 0.57,
    creditRate: 0.57,
    availableCredits: 8,
    maximumCredits: 8,
    requestedCredits: 4,
    reservedCredits: 4,
    remainingCredits: 4,
    clampCodes: ['PLAYER_SAFETY_MAXIMUM'],
  },
  encounter: {
    revision: 1,
    validFromTick: 10,
    inputRevision: 4,
    quality: 'LIVE',
    value: {
      phase: 'IDLE',
      family: null,
      primaryCardId: null,
      supportCardId: null,
      headwindChannels: [],
      statModifiers: {
        healthMultiplier: 1,
        damageMultiplier: 1,
        speedMultiplier: 1,
        spawnDensityMultiplier: 1,
      },
      reservedCredits: 4,
      reasonCodes: ['ENCOUNTER_IDLE'],
    },
    reasonCodes: ['ENCOUNTER_IDLE'],
    clampCodes: [],
  },
  fallbackCodes: [],
  ...overrides,
});

describe('DifficultySnapshotComposer', () => {
  it('commits one recursively frozen snapshot and one bounded trace record', () => {
    const onCommit = vi.fn();
    const ring = new DifficultyDecisionTraceRing(2);
    const composer = new DifficultySnapshotComposer({ traceRing: ring, onCommit });

    const snapshot = composer.compose(createInput());

    expect(snapshot.meta.revision).toBe(1);
    expect(snapshot.spawn.revision).toBe(1);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.signals.market.reasonCodes)).toBe(true);
    expect(ring.getByRevision(1)?.decisionId).toBe(snapshot.meta.decisionId);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('increments revisions and overwrites only the oldest trace slot', () => {
    const ring = new DifficultyDecisionTraceRing(2);
    const composer = new DifficultySnapshotComposer({ traceRing: ring });

    const first = composer.compose(createInput());
    const second = composer.compose(createInput({ tick: 11 }));
    const third = composer.compose(createInput({ tick: 12 }));

    expect(third.meta.revision).toBe(3);
    expect(ring.getByRevision(first.meta.revision)).toBeNull();
    expect(ring.getByDecisionId(second.meta.decisionId)?.revision).toBe(2);
    expect(ring.getByRevision(3)?.revision).toBe(3);
  });

  it('generates identical decisionId hash regardless of input property insertion order', () => {
    const composer = new DifficultySnapshotComposer();
    const input1 = createInput();
    const input2 = createInput();

    // Reorder properties in market value for input2
    const marketValue1 = input1.market.value;
    const marketValue2 = {
      reasonCodes: [...marketValue1.reasonCodes],
      activeEventFamily: marketValue1.activeEventFamily,
      whalePressure: marketValue1.whalePressure,
      rsiExtremity: marketValue1.rsiExtremity,
      trend: marketValue1.trend,
      volume: marketValue1.volume,
      volatility: marketValue1.volatility,
      pressure: marketValue1.pressure,
      confidence: marketValue1.confidence,
      regime: marketValue1.regime,
      quality: marketValue1.quality,
      sourceSequence: marketValue1.sourceSequence,
    } as any;
    input2.market = { ...input2.market, value: marketValue2 };

    const snapshot1 = composer.compose(input1);
    composer.reset();
    const snapshot2 = composer.compose(input2);

    expect(snapshot1.meta.decisionId).toBe(snapshot2.meta.decisionId);
  });
});
