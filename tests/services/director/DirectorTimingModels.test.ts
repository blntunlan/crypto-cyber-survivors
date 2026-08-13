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

  it('clears a completed or stale queued event so it cannot replay on reconnect', () => {
    const pacing = new PacingStateMachine();
    expect(pacing.requestMarketSurge('VOLUME_SURGE', 90)).toBe(true);

    expect(pacing.clearQueuedMarketSurge('VOLUME_SURGE')).toBe(true);
    expect(pacing.getSnapshot().queuedEventFamily).toBeNull();
    expect(pacing.clearQueuedMarketSurge('VOLUME_SURGE')).toBe(false);
    expect(pacing.requestMarketSurge('WHALE_EVENT', 91)).toBe(true);
  });

  it('uses seeded pacing durations inside the authored phase ranges', () => {
    const first = new PacingStateMachine();
    const second = new PacingStateMachine();

    const buildDuration = first.update({
      elapsedSeconds: 0,
      seed: 17,
      greedLevel: 0,
    }).remainingSeconds;
    expect(buildDuration).toBeGreaterThanOrEqual(45);
    expect(buildDuration).toBeLessThanOrEqual(70);
    expect(
      second.update({ elapsedSeconds: 0, seed: 17, greedLevel: 0 }).remainingSeconds
    ).toBe(buildDuration);

    const peak = first.update({
      elapsedSeconds: buildDuration,
      seed: 17,
      greedLevel: 0,
    });
    const peakDuration = peak.remainingSeconds;
    expect(peak.state).toBe('PEAK');
    expect(peakDuration).toBeGreaterThanOrEqual(20);
    expect(peakDuration).toBeLessThanOrEqual(35);

    const fade = first.update({
      elapsedSeconds: buildDuration + peakDuration,
      seed: 17,
      greedLevel: 0,
    });
    const fadeDuration = fade.remainingSeconds;
    expect(fade.state).toBe('PEAK_FADE');
    expect(fadeDuration).toBeGreaterThanOrEqual(8);
    expect(fadeDuration).toBeLessThanOrEqual(12);

    const recovery = first.update({
      elapsedSeconds: buildDuration + peakDuration + fadeDuration,
      seed: 17,
      greedLevel: 0,
    });
    expect(recovery.state).toBe('RECOVERY');
    expect(recovery.remainingSeconds).toBeGreaterThanOrEqual(25);
    expect(recovery.remainingSeconds).toBeLessThanOrEqual(40);
  });

  it('adds Doom stacks without reducing recovery below eight seconds', () => {
    const pacing = new PacingStateMachine();
    const late = pacing.update({ elapsedSeconds: 1_800, seed: 29, greedLevel: 0 });

    expect(late.doomStacks).toBe(1);
    if (late.state === 'RECOVERY') {
      expect(late.remainingSeconds).toBeGreaterThanOrEqual(8);
    }
  });
});
