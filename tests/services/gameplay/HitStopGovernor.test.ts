import { describe, expect, it } from 'vitest';
import { GAME_ENGINE } from '../../../constants';
import { HitStopGovernor } from '../../../services/gameplay/HitStopGovernor';

describe('HitStopGovernor', () => {
  it('keeps normal and super crit base durations at low realised crit density', () => {
    const governor = new HitStopGovernor();
    const normalCrit = {
      duration: GAME_ENGINE.HIT_STOP_NORMAL,
      isCrit: true,
      isSuperCrit: false,
    };
    const superCrit = {
      duration: GAME_ENGINE.HIT_STOP_CRIT,
      isCrit: true,
      isSuperCrit: true,
    };

    expect(governor.getAdjustedDuration(normalCrit, 1000)).toBe(normalCrit.duration);
    expect(governor.getAdjustedDuration(superCrit, 2500)).toBe(superCrit.duration);
  });

  it('scales normal crits and applies the same realised-rate policy to super crits', () => {
    const normalGovernor = new HitStopGovernor();
    const mixedGovernor = new HitStopGovernor();
    const normalCrit = {
      duration: GAME_ENGINE.HIT_STOP_NORMAL,
      isCrit: true,
      isSuperCrit: false,
    };
    const superCrit = {
      duration: GAME_ENGINE.HIT_STOP_CRIT,
      isCrit: true,
      isSuperCrit: true,
    };
    const burstTimes = [1000, 1100, 1200, 1300, 1400];

    const normalResults = burstTimes.map(now =>
      normalGovernor.getAdjustedDuration(normalCrit, now)
    );
    burstTimes.forEach(now => {
      mixedGovernor.getAdjustedDuration(
        {
          duration: 4,
          isCrit: true,
          isSuperCrit: false,
        },
        now
      );
    });
    const superUnderPressure = mixedGovernor.getAdjustedDuration(superCrit, 1500);

    const normalUnderPressure = normalResults[normalResults.length - 1]!;

    expect(normalUnderPressure).toBeGreaterThan(0);
    expect(normalUnderPressure).toBeLessThan(normalCrit.duration);
    expect(superUnderPressure).toBeGreaterThan(normalUnderPressure);
    expect(superUnderPressure).toBeLessThan(superCrit.duration);
  });

  it('exhausts the rolling hit-stop budget before skipping later crit events', () => {
    const governor = new HitStopGovernor();
    const event = {
      duration: GAME_ENGINE.HIT_STOP_NORMAL,
      isCrit: true,
      isSuperCrit: false,
    };

    const durations = [1000, 1100, 1200, 1300, 1400, 1500].map(now =>
      governor.getAdjustedDuration(event, now)
    );

    const totalDuration = durations.reduce((total, duration) => total + duration, 0);

    expect(totalDuration).toBe(GAME_ENGINE.CRIT_HITSTOP_WINDOW_BUDGET_MS);
    expect(durations[durations.length - 1]).toBe(0);
  });

  it('does not release applied super crit budget when crit-rate history wraps', () => {
    const governor = new HitStopGovernor();
    const event = {
      duration: GAME_ENGINE.HIT_STOP_CRIT,
      isCrit: true,
      isSuperCrit: true,
    };
    const eventCount = GAME_ENGINE.CRIT_HITSTOP_HISTORY_CAPACITY + 2;
    let totalAppliedDuration = 0;

    for (let index = 0; index < eventCount; index += 1) {
      totalAppliedDuration += governor.getAdjustedDuration(event, 1000);
    }

    expect(totalAppliedDuration).toBeLessThanOrEqual(
      GAME_ENGINE.CRIT_HITSTOP_WINDOW_BUDGET_MS
    );
  });

  it('recovers the full duration at the exact rolling window boundary', () => {
    const governor = new HitStopGovernor();
    const event = {
      duration: GAME_ENGINE.HIT_STOP_CRIT,
      isCrit: true,
      isSuperCrit: true,
    };

    governor.getAdjustedDuration(event, 1000);

    const recoveredDuration = governor.getAdjustedDuration(
      event,
      1000 + GAME_ENGINE.CRIT_HITSTOP_WINDOW_MS
    );

    expect(recoveredDuration).toBe(event.duration);
  });

  it('clears crit density and budget history on reset', () => {
    const governor = new HitStopGovernor();
    const event = {
      duration: GAME_ENGINE.HIT_STOP_NORMAL,
      isCrit: true,
      isSuperCrit: false,
    };

    [1000, 1100, 1200, 1300, 1400, 1500].forEach(now => {
      governor.getAdjustedDuration(event, now);
    });
    governor.reset();

    expect(governor.getAdjustedDuration(event, 1500)).toBe(event.duration);
  });
});
