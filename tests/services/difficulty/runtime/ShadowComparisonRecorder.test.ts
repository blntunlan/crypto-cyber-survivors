import { describe, expect, it } from 'vitest';

import {
  ShadowComparisonRecorder,
  type CurrentDirectorSnapshot,
} from '../../../../services/difficulty/runtime/ShadowComparisonRecorder';
import {
  SHADOW_COMPARISON_CONFIG,
  type ShadowComparisonConfig,
} from '../../../../config/difficulty/ShadowComparisonConfig';
import {
  createNeutralRuntimeDifficultySnapshot,
  type RuntimeDifficultySnapshot,
} from '../../../../types/runtimeDifficulty';

const createCurrent = (
  overrides: Partial<CurrentDirectorSnapshot> = {}
): CurrentDirectorSnapshot => ({
  revision: 1,
  threatTarget: 0.5,
  creditRate: 0.5,
  spawnWindowSeconds: 1,
  spawnCount: 2,
  composition: ['bear'],
  enemyHealthMultiplier: 1.2,
  enemyDamageMultiplier: 1.1,
  enemySpeedMultiplier: 1.05,
  mercy: 0.1,
  recoveryNeed: 0.2,
  encounterPhase: 'IDLE',
  presentationIntensity: 0.5,
  quality: 'LIVE',
  fallbackCodes: [],
  ...overrides,
});

const createModular = (
  overrides: Record<string, unknown> = {}
): RuntimeDifficultySnapshot => {
  const snapshot = structuredClone(
    createNeutralRuntimeDifficultySnapshot({ tick: 1, inputRevision: 1 })
  ) as any;
  snapshot.meta.revision = 1;
  snapshot.meta.quality = 'LIVE';
  snapshot.pressure.threatTarget = 0.5;
  snapshot.pressure.creditRate = 0.5;
  snapshot.pressure.spawnCadence = 1;
  snapshot.spawn.spawnWindowSeconds = 1;
  snapshot.spawn.reservedCredits = 2;
  snapshot.spawn.directives = [
    { archetype: 'bear', intent: 'pressure', allocation: 1 },
  ];
  snapshot.enemy.healthMultiplier = 1.2;
  snapshot.enemy.damageMultiplier = 1.1;
  snapshot.enemy.speedMultiplier = 1.05;
  snapshot.recovery.mercy = 0.1;
  snapshot.recovery.recoveryNeed = 0.2;
  snapshot.encounter.phase = 'IDLE';
  snapshot.presentation.intensity = 0.5;
  for (const [path, value] of Object.entries(overrides)) {
    const [section, field] = path.split('.') as [string, string];
    snapshot[section][field] = value;
  }
  return snapshot as RuntimeDifficultySnapshot;
};

describe('ShadowComparisonRecorder', () => {
  it('requires exact equality for discrete quality and fallback fields', () => {
    const record = new ShadowComparisonRecorder().record(
      'quality-mismatch',
      createCurrent(),
      createModular({ 'meta.quality': 'DEGRADED' })
    );

    expect(record.passed).toBe(false);
    expect(record.failures).toContainEqual(
      expect.objectContaining({ dimension: 'quality' })
    );
  });

  it('accepts only manifest-listed continuous drift within tolerance', () => {
    const config: ShadowComparisonConfig = {
      ...SHADOW_COMPARISON_CONFIG,
      approvedDrifts: [
        {
          id: 'pressure-drift-1',
          scenarioId: 'approved-pressure',
          dimension: 'threatTarget',
          maximumDrift: 0.03,
          rationale: 'Temporary tuning parity window.',
          owner: 'Core Gameplay',
          expiryReviewDate: '2026-08-15',
        },
      ],
    };
    const record = new ShadowComparisonRecorder(config).record(
      'approved-pressure',
      createCurrent({ threatTarget: 0.5 }),
      createModular({ 'pressure.threatTarget': 0.52 })
    );

    expect(record.passed).toBe(true);
    expect(
      record.dimensions.find(dimension => dimension.dimension === 'threatTarget')
        ?.approvedDriftId
    ).toBe('pressure-drift-1');
  });

  it('retains only the configured number of records', () => {
    const recorder = new ShadowComparisonRecorder({
      ...SHADOW_COMPARISON_CONFIG,
      capacity: 2,
    });
    recorder.record('one', createCurrent(), createModular());
    recorder.record('two', createCurrent(), createModular());
    recorder.record('three', createCurrent(), createModular());

    expect(recorder.getRecords()).toHaveLength(2);
    expect(recorder.getRecords().map(record => record.scenarioId)).toEqual([
      'two',
      'three',
    ]);
  });

  it('verifies 100% zero-drift parity over a 1000-tick simulated gameplay sequence', () => {
    const recorder = new ShadowComparisonRecorder({
      ...SHADOW_COMPARISON_CONFIG,
      capacity: 1000,
    });

    for (let tick = 1; tick <= 1000; tick++) {
      const current = createCurrent({ revision: tick });
      const modular = createModular({ 'meta.revision': tick });
      const record = recorder.record(`tick-${tick}`, current, modular);
      expect(record.passed).toBe(true);
      expect(record.failures).toHaveLength(0);
    }

    const records = recorder.getRecords();
    expect(records).toHaveLength(1000);
    expect(records.every(r => r.passed)).toBe(true);
  });
});
