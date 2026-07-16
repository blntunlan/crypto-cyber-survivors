import { describe, expect, it, vi } from 'vitest';

import { EventBus } from '../../../../services/core/EventBus';
import { DifficultyV2CompatibilityAdapter } from '../../../../services/difficulty/runtime/DifficultyV2CompatibilityAdapter';
import {
  createNeutralRuntimeDifficultySnapshot,
  type RuntimeDifficultySnapshot,
} from '../../../../types/runtimeDifficulty';

const createSnapshot = (): RuntimeDifficultySnapshot => {
  const snapshot = structuredClone(
    createNeutralRuntimeDifficultySnapshot({ tick: 7, inputRevision: 2 })
  ) as any;
  snapshot.meta.revision = 7;
  snapshot.signals.position.liquidationProximity = 0.9;
  snapshot.signals.market.volatility = 0.8;
  snapshot.signals.market.trend = -0.5;
  snapshot.enemy.healthMultiplier = 1.3;
  snapshot.enemy.damageMultiplier = 1.2;
  snapshot.enemy.speedMultiplier = 1.1;
  snapshot.rewards.xpMultiplier = 1.2;
  snapshot.rewards.gemDropMultiplier = 1.1;
  snapshot.presentation.intensity = 0.8;
  snapshot.pressure.total = 0.7;
  snapshot.pressure.spawnCadence = 0.5;
  return snapshot as RuntimeDifficultySnapshot;
};

describe('DifficultyV2CompatibilityAdapter', () => {
  it('maps committed output and emits revision-tagged transitions', () => {
    const warning = vi.fn();
    const shock = vi.fn();
    const unsubscribeWarning = EventBus.on('liquidationWarning', warning);
    const unsubscribeShock = EventBus.on('shockDetected', shock);
    const adapter = new DifficultyV2CompatibilityAdapter();
    const snapshot = createSnapshot();

    expect(adapter.toOutput(snapshot)).toMatchObject({
      liquidationWarning: 'CRITICAL',
      enemyHP: 1.3,
      xpMultiplier: 1.2,
    });
    adapter.emitTransitions(null, snapshot);

    expect(warning).toHaveBeenCalledWith(
      expect.objectContaining({ sourceSnapshotRevision: 7 })
    );
    expect(shock).toHaveBeenCalledWith(
      expect.objectContaining({ sourceSnapshotRevision: 7, direction: 'down' })
    );
    unsubscribeWarning();
    unsubscribeShock();
  });
});
