import { describe, expect, expectTypeOf, it } from 'vitest';
import { DIFFICULTY_RUNTIME_CONFIG } from '../../../../config/difficulty/DifficultyRuntimeConfig';
import {
  assertRuntimeDifficultySnapshot,
  createNeutralRuntimeDifficultySnapshot,
  type RuntimeDifficultySnapshot,
} from '../../../../types/runtimeDifficulty';
import {
  type DifficultyRunInitializedEvent,
  type DifficultySnapshotCommittedEvent,
  type EventDataMap,
} from '../../../../types/events';

const deepFreeze = <TValue>(value: TValue): TValue => {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }

  return value;
};

const cloneSnapshot = (
  snapshot: RuntimeDifficultySnapshot
): RuntimeDifficultySnapshot => structuredClone(snapshot);

describe('runtime difficulty public contract', () => {
  it('creates a recursively read-only neutral snapshot with registered metadata', () => {
    const snapshot = createNeutralRuntimeDifficultySnapshot({
      tick: 12,
      inputRevision: 4,
    });

    expect(snapshot.meta).toMatchObject({
      revision: 0,
      validFromTick: 12,
      inputRevision: 4,
      quality: 'NEUTRAL',
    });
    expect(snapshot.enemy.healthMultiplier).toBe(1);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.signals.market.reasonCodes)).toBe(true);
    expect(Object.isFrozen(snapshot.trace)).toBe(true);
    expect(DIFFICULTY_RUNTIME_CONFIG.reasonCodes).toContain('NEUTRAL_INPUT');
    expect(DIFFICULTY_RUNTIME_CONFIG.clampCodes).toContain('PRESSURE_MAXIMUM');
    expect(() => assertRuntimeDifficultySnapshot(snapshot)).not.toThrow();
    expectTypeOf<
      EventDataMap['difficultyRunInitialized']
    >().toEqualTypeOf<DifficultyRunInitializedEvent>();
    expectTypeOf<
      EventDataMap['difficultySnapshotCommitted']
    >().toEqualTypeOf<DifficultySnapshotCommittedEvent>();
  });

  it('rejects mutable public objects', () => {
    const snapshot = cloneSnapshot(
      createNeutralRuntimeDifficultySnapshot({ tick: 1, inputRevision: 1 })
    );

    expect(() => assertRuntimeDifficultySnapshot(snapshot)).toThrow(/frozen/i);
  });

  it('rejects non-finite and out-of-range numeric fields', () => {
    const nonFinite = cloneSnapshot(
      createNeutralRuntimeDifficultySnapshot({ tick: 1, inputRevision: 1 })
    ) as { enemy: { healthMultiplier: number } };
    nonFinite.enemy.healthMultiplier = Number.NaN;
    deepFreeze(nonFinite);

    const outOfRange = cloneSnapshot(
      createNeutralRuntimeDifficultySnapshot({ tick: 1, inputRevision: 1 })
    ) as { pressure: { total: number } };
    outOfRange.pressure.total = 2;
    deepFreeze(outOfRange);

    expect(() =>
      assertRuntimeDifficultySnapshot(nonFinite as RuntimeDifficultySnapshot)
    ).toThrow(/finite/i);
    expect(() =>
      assertRuntimeDifficultySnapshot(outOfRange as RuntimeDifficultySnapshot)
    ).toThrow(/range/i);
  });

  it('rejects unregistered reason and clamp codes', () => {
    const invalidReason = cloneSnapshot(
      createNeutralRuntimeDifficultySnapshot({ tick: 1, inputRevision: 1 })
    ) as unknown as { signals: { market: { reasonCodes: string[] } } };
    invalidReason.signals.market.reasonCodes.push('NOT_REGISTERED');
    deepFreeze(invalidReason);

    const invalidClamp = cloneSnapshot(
      createNeutralRuntimeDifficultySnapshot({ tick: 1, inputRevision: 1 })
    ) as unknown as { trace: { clampCodes: string[] } };
    invalidClamp.trace.clampCodes.push('NOT_REGISTERED');
    deepFreeze(invalidClamp);

    expect(() =>
      assertRuntimeDifficultySnapshot(
        invalidReason as unknown as RuntimeDifficultySnapshot
      )
    ).toThrow(/reason code/i);
    expect(() =>
      assertRuntimeDifficultySnapshot(
        invalidClamp as unknown as RuntimeDifficultySnapshot
      )
    ).toThrow(/clamp code/i);
  });

  it('rejects non-monotonic commit metadata', () => {
    const snapshot = createNeutralRuntimeDifficultySnapshot({
      tick: 3,
      inputRevision: 2,
    });

    expect(() => assertRuntimeDifficultySnapshot(snapshot, snapshot)).toThrow(
      /monotonic/i
    );
  });
});
