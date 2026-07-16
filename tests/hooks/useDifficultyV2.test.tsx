import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDifficultyV2 } from '../../hooks/useDifficultyV2';
import { EventBus } from '../../services/core/EventBus';
import { createNeutralRuntimeDifficultySnapshot } from '../../types/runtimeDifficulty';

describe('useDifficultyV2', () => {
  it('returns neutral presentation data without a legacy difficulty subscription', () => {
    const { result } = renderHook(() => useDifficultyV2());

    expect(result.current.fovReduction).toBe(0);
    expect(result.current.shockActive).toBe(false);
    expect(result.current.total).toBe(1);
  });

  it('updates from a committed runtime snapshot', () => {
    const { result } = renderHook(() => useDifficultyV2());
    const snapshot = structuredClone(
      createNeutralRuntimeDifficultySnapshot({ tick: 5, inputRevision: 2 })
    ) as any;
    snapshot.meta.revision = 2;
    snapshot.pressure.total = 0.7;
    snapshot.enemy.healthMultiplier = 1.4;

    act(() => {
      EventBus.emit('difficultySnapshotCommitted', { snapshot });
    });

    expect(result.current.total).toBe(0.7);
    expect(result.current.output.enemyHP).toBe(1.4);
  });
});
