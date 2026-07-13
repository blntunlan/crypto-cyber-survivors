import { describe, expect, it } from 'vitest';
import { SurvivalCurve } from '../../../services/director/SurvivalCurve';
import { GreedStateMachine } from '../../../services/director/GreedStateMachine';
import { PacingStateMachine } from '../../../services/director/PacingStateMachine';

describe('Director timing models', () => {
  it('interpolates survival pressure and adds Doom stacks every five minutes after 25 minutes', () => {
    const curve = new SurvivalCurve();

    expect(curve.getPressure(0)).toBe(0.2);
    expect(curve.getPressure(180)).toBe(0.3);
    expect(curve.getPressure(390)).toBeCloseTo(0.475, 6);
    expect(curve.getDoomStacks(1_500)).toBe(0);
    expect(curve.getDoomStacks(1_800)).toBe(1);
    expect(curve.getRecoveryDuration(40, 5)).toBe(30);
    expect(curve.getRecoveryDuration(10, 99)).toBe(8);
  });

  it('keeps greed monotonic across rejection and expiry transitions', () => {
    const greed = new GreedStateMachine();

    expect(greed.rejectOffer().level).toBe(1);
    expect(greed.expireOffer().level).toBe(2);
    expect(greed.getSnapshot().pressure).toBe(0.2);
    expect(greed.getSnapshot().rewardFactor).toBeGreaterThan(1);
  });

  it('gates market surge for 90 seconds and keeps only one queued event', () => {
    const pacing = new PacingStateMachine();

    expect(pacing.requestMarketSurge('VOLUME_SURGE', 89)).toBe(false);
    expect(pacing.requestMarketSurge('VOLUME_SURGE', 90)).toBe(true);
    expect(pacing.requestMarketSurge('WHALE_EVENT', 90)).toBe(false);
    expect(pacing.getSnapshot().queuedEventFamily).toBe('VOLUME_SURGE');
  });
});
