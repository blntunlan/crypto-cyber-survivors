import { describe, expect, it } from 'vitest';
import { HitStopGovernor } from '../../../services/gameplay/HitStopGovernor';

describe('HitStopGovernor', () => {
  it('returns unchanged duration for non-super crit events', () => {
    const governor = new HitStopGovernor();
    const result = governor.getAdjustedDuration(
      { duration: 60, isCrit: true, isSuperCrit: false },
      1000
    );

    expect(result).toBe(60);
  });

  it('suppresses standard crit hit-stop once crit request rate exceeds threshold', () => {
    const governor = new HitStopGovernor();
    const event = { duration: 15, isCrit: true, isSuperCrit: false };

    const results = [1000, 1100, 1200, 1300, 1400].map(now =>
      governor.getAdjustedDuration(event, now)
    );

    expect(results[results.length - 1]).toBe(0);
  });

  it('keeps super crit duration unchanged when rate is under threshold', () => {
    const governor = new HitStopGovernor();

    const r1 = governor.getAdjustedDuration(
      { duration: 60, isCrit: true, isSuperCrit: true },
      1000
    );
    const r2 = governor.getAdjustedDuration(
      { duration: 60, isCrit: true, isSuperCrit: true },
      1300
    );

    expect(r1).toBe(60);
    expect(r2).toBe(60);
  });

  it('reduces duration when super crit burst exceeds threshold', () => {
    const governor = new HitStopGovernor();
    const baseDuration = 60;

    // Build burst density inside rolling window.
    const t = [1000, 1100, 1200, 1300, 1400];
    const results = t.map(now =>
      governor.getAdjustedDuration(
        { duration: baseDuration, isCrit: true, isSuperCrit: true },
        now
      )
    );

    const last = results[results.length - 1];
    expect(last).toBeLessThan(baseDuration);
    expect(last).toBeGreaterThan(0);
  });

  it('skips super crit hit-stop if events are too close in burst mode', () => {
    const governor = new HitStopGovernor();
    const event = { duration: 60, isCrit: true, isSuperCrit: true };

    // Saturate the rolling window first.
    [1000, 1050, 1100, 1150, 1200, 1250].forEach(now => {
      governor.getAdjustedDuration(event, now);
    });

    // First eligible call applies reduced duration.
    const applied = governor.getAdjustedDuration(event, 1400);
    // Too soon after previous applied call -> should be skipped.
    const skipped = governor.getAdjustedDuration(event, 1430);

    expect(applied).toBeGreaterThan(0);
    expect(skipped).toBe(0);
  });
});
