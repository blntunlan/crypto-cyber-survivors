import { describe, expect, it } from 'vitest';
import { SpawnAuthorityTelemetryRecorder } from '../../../services/director/SpawnAuthorityTelemetry';
import { type SpawnPlan } from '../../../services/director/contracts';

const plan: SpawnPlan = {
  revision: 2,
  seed: 7,
  spendableThreat: 2,
  composition: ['bear'],
  statTier: 1,
  maxActiveEnemies: 10,
  spawnWindowSeconds: 0.2,
  intents: [
    {
      tick: 5,
      sequence: 0,
      enemyType: 'bear',
      x: 10,
      y: 20,
      threatCost: 1,
      difficulty: 1,
      healthMultiplier: 1,
      damageMultiplier: 1,
      speedMultiplier: 1,
      intent: 'pressure',
      powerTier: 1,
    },
  ],
};

describe('SpawnAuthorityTelemetryRecorder', () => {
  it('records legacy and Director authority samples in one bounded schema', () => {
    const recorder = new SpawnAuthorityTelemetryRecorder(2);

    recorder.record({
      tick: 4,
      authority: 'LEGACY',
      activeEnemies: 3,
      plan: null,
      legacy: { difficulty: 1.2, spawnRateMultiplier: 1.1 },
    });
    const director = recorder.record({
      tick: 5,
      authority: 'DIRECTOR',
      activeEnemies: 4,
      plan,
      legacy: null,
    });

    expect(director.intentSignature).toBe('bear:10:20:5');
    expect(director.spendableThreat).toBe(2);
    expect(recorder.getRecords()).toHaveLength(2);
  });

  it('drops the oldest sample when the bounded buffer fills', () => {
    const recorder = new SpawnAuthorityTelemetryRecorder(1);

    recorder.record({
      tick: 1,
      authority: 'LEGACY',
      activeEnemies: 0,
      plan: null,
      legacy: null,
    });
    recorder.record({
      tick: 2,
      authority: 'DIRECTOR',
      activeEnemies: 0,
      plan,
      legacy: null,
    });

    expect(recorder.getRecords().map(record => record.tick)).toEqual([2]);
  });
});
