import { beforeEach, describe, expect, it } from 'vitest';
import { FlowStateManager } from '../../../services/difficulty/FlowStateManager';
import { TimeService } from '../../../services/core/TimeService';

describe('FlowStateManager hot path', () => {
  beforeEach(() => {
    TimeService.reset();
    FlowStateManager.reset();
  });

  it('reuses the analysis and correction objects between updates', () => {
    const first = FlowStateManager.update(50, 16);
    const firstCorrections = first.suggestedCorrections;
    const second = FlowStateManager.update(49, 32);

    expect(second).toBe(first);
    expect(second.suggestedCorrections).toBe(firstCorrections);
  });

  it('compacts and sums rolling events without changing their results', () => {
    FlowStateManager.recordKill(1_000);
    FlowStateManager.recordKill(70_000);
    FlowStateManager.recordDash(65_000);
    FlowStateManager.recordDamageTaken(7, 65_000);
    FlowStateManager.recordDamageDealt(11, 65_000);

    FlowStateManager.update(50, 70_001);
    const metrics = FlowStateManager.getMetrics();

    expect(metrics.killsLast60s).toBe(1);
    expect(metrics.dashesLast10s).toBe(1);
    expect(metrics.damageTakenLast10s).toBe(7);
    expect(metrics.damageDealtLast10s).toBe(11);
  });
});
