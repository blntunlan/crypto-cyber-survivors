import { describe, expect, it } from 'vitest';
import { RunPerformanceTracker } from '../../../services/director/RunPerformanceTracker';

describe('§14 direction is scored over the run, not at the exit', () => {
  it('weights alignment by elapsed time rather than by commit count', () => {
    const tracker = new RunPerformanceTracker();

    // Ten cheap commits deep in the red, then one long stretch in the green.
    for (let index = 0; index < 10; index += 1) {
      tracker.record(-1, 0, 0.1);
    }
    tracker.record(1, 0, 9);

    const snapshot = tracker.getSnapshot();

    // 1 second at -1 and 9 seconds at +1 → +0.8, not the +0.09 a per-commit
    // average would give.
    expect(snapshot.timeWeightedAlignment).toBeCloseTo(0.8, 6);
    expect(snapshot.trackedSeconds).toBeCloseTo(10, 6);
  });

  it('reports the exit alignment separately from the run average', () => {
    const tracker = new RunPerformanceTracker();

    tracker.record(1, 0, 10);
    tracker.record(-1, 0, 0);

    const snapshot = tracker.getSnapshot();

    expect(snapshot.timeWeightedAlignment).toBeCloseTo(1, 6);
    expect(snapshot.exitAlignment).toBe(-1);
  });

  it('clamps alignment into the signed unit range', () => {
    const tracker = new RunPerformanceTracker();

    tracker.record(42, 0, 1);
    expect(tracker.getSnapshot().timeWeightedAlignment).toBeCloseTo(1, 6);

    tracker.reset();
    tracker.record(-42, 0, 1);
    expect(tracker.getSnapshot().timeWeightedAlignment).toBeCloseTo(-1, 6);
  });

  it('ignores non-finite input instead of poisoning the integral', () => {
    const tracker = new RunPerformanceTracker();

    tracker.record(1, 1, 5);
    tracker.record(Number.NaN, Number.NaN, Number.NaN);

    const snapshot = tracker.getSnapshot();

    expect(Number.isFinite(snapshot.timeWeightedAlignment)).toBe(true);
    expect(snapshot.timeWeightedAlignment).toBeCloseTo(1, 6);
    expect(snapshot.trackedSeconds).toBeCloseTo(5, 6);
  });
});

describe('§17 build performance summary', () => {
  it('averages combat mastery over time and keeps the peak', () => {
    const tracker = new RunPerformanceTracker();

    tracker.record(0, 0.2, 3);
    tracker.record(0, 0.8, 1);

    const snapshot = tracker.getSnapshot();

    expect(snapshot.combatMastery).toBeCloseTo((0.2 * 3 + 0.8) / 4, 6);
    expect(snapshot.peakCombatMastery).toBeCloseTo(0.8, 6);
  });

  it('starts a fresh run clean after reset', () => {
    const tracker = new RunPerformanceTracker();

    tracker.record(1, 1, 10);
    tracker.reset();
    const snapshot = tracker.getSnapshot();

    expect(snapshot.timeWeightedAlignment).toBe(0);
    expect(snapshot.combatMastery).toBe(0);
    expect(snapshot.peakCombatMastery).toBe(0);
    expect(snapshot.trackedSeconds).toBe(0);
  });
});
