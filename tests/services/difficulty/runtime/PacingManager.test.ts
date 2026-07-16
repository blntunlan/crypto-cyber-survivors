import { describe, expect, it } from 'vitest';
import { PacingManager } from '../../../../services/difficulty/runtime/managers/PacingManager';

describe('PacingManager', () => {
  it('uses elapsed simulation seconds and returns seconds for remaining duration', () => {
    const manager = new PacingManager();
    const first = manager.update({ elapsedSeconds: 0 });
    const later = manager.update({ elapsedSeconds: 180 });

    expect(first.value.phase).toBe('BUILD_UP');
    expect(first.value.remainingSeconds).toBeGreaterThan(0);
    expect(later.quality).toBe('LIVE');
    expect(later.value.baselinePressure).toBeGreaterThan(first.value.baselinePressure);
  });

  it('returns neutral pacing for non-finite simulation time', () => {
    const decision = new PacingManager().update({ elapsedSeconds: Number.NaN });

    expect(decision.quality).toBe('NEUTRAL');
    expect(decision.value.maximumPressure).toBe(0);
  });
});
