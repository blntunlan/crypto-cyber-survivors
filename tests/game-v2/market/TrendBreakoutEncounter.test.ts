import { describe, expect, it } from 'vitest';

import {
  TREND_BREAKOUT_CONFIRMATION_TICKS,
  TREND_BREAKOUT_ENTRY_THRESHOLD,
  TREND_BREAKOUT_SPAWN_BUDGET,
} from '@/game-v2/config/TrendBreakoutFamily';
import {
  type MarketSnapshot,
  type TrendDirection,
} from '@/game-v2/contracts/MarketSnapshot';
import { TrendBreakoutEncounter } from '@/game-v2/market/TrendBreakoutEncounter';

const baseSnapshot = (
  trendStrength: number,
  trendDirection: TrendDirection
): MarketSnapshot => ({
  schemaVersion: 1,
  asset: 'BTC',
  price: 65_000,
  rsi: 50,
  rsiState: 'NEUTRAL',
  atrPercent: 1,
  normalizedVolume: 1,
  volumePercentile: 0.5,
  whaleTier: 0,
  trendStrength,
  trendDirection,
  timestamp: 1_700_000_000_000,
  isSynthetic: false,
});

/** Drives snapshots below the entry threshold for `count` ticks, discarding output. */
const stayArmed = (
  encounter: TrendBreakoutEncounter,
  startTick: number,
  count: number
): void => {
  for (let index = 0; index < count; index += 1) {
    encounter.step(baseSnapshot(0.1, 'UP'), startTick + index);
  }
};

/** Drives a real breakout to activation, returning the output and the next free tick. */
const driveToActivation = (
  encounter: TrendBreakoutEncounter,
  startTick: number,
  direction: TrendDirection
): { output: ReturnType<TrendBreakoutEncounter['step']>; nextTick: number } => {
  const armingStrength = TREND_BREAKOUT_ENTRY_THRESHOLD + 0.1;
  let tick = startTick;
  let output: ReturnType<TrendBreakoutEncounter['step']> = null;

  for (let index = 0; index <= TREND_BREAKOUT_CONFIRMATION_TICKS; index += 1) {
    output = encounter.step(baseSnapshot(armingStrength, direction), tick);
    tick += 1;
  }

  return { output, nextTick: tick };
};

describe('TrendBreakoutEncounter', () => {
  it('produces no output while ARMED', () => {
    const encounter = new TrendBreakoutEncounter();
    const results: ReturnType<TrendBreakoutEncounter['step']>[] = [];

    for (let tick = 0; tick < 10; tick += 1) {
      results.push(encounter.step(baseSnapshot(0.1, 'UP'), tick));
    }

    expect(results.every(result => result === null)).toBe(true);
  });

  it('produces exactly one bounded, bullish-themed output on the activation tick for UP', () => {
    const encounter = new TrendBreakoutEncounter();
    const { output } = driveToActivation(encounter, 0, 'UP');

    expect(output).not.toBeNull();
    expect(output).toEqual({
      kind: 'SPAWN',
      enemyBudget: TREND_BREAKOUT_SPAWN_BUDGET,
      themeId: 'bullish-breakout',
    });
  });

  it('produces a bearish-themed output for DOWN', () => {
    const encounter = new TrendBreakoutEncounter();
    const { output } = driveToActivation(encounter, 0, 'DOWN');

    expect(output).toEqual({
      kind: 'SPAWN',
      enemyBudget: TREND_BREAKOUT_SPAWN_BUDGET,
      themeId: 'bearish-breakout',
    });
  });

  it('produces no output on ticks before or after the exact activation tick', () => {
    const encounter = new TrendBreakoutEncounter();
    let tick = 0;
    const armingStrength = TREND_BREAKOUT_ENTRY_THRESHOLD + 0.1;

    for (let index = 0; index < TREND_BREAKOUT_CONFIRMATION_TICKS; index += 1) {
      const output = encounter.step(baseSnapshot(armingStrength, 'UP'), tick);
      expect(output).toBeNull();
      tick += 1;
    }

    const activationOutput = encounter.step(baseSnapshot(armingStrength, 'UP'), tick);
    expect(activationOutput).not.toBeNull();
    tick += 1;

    // Now ACTIVE: still no further output until a future activation.
    const afterActivation = encounter.step(baseSnapshot(armingStrength, 'UP'), tick);
    expect(afterActivation).toBeNull();
  });

  it('produces no output while COOLDOWN, even if the entry condition is met again', () => {
    const encounter = new TrendBreakoutEncounter();
    const { nextTick } = driveToActivation(encounter, 0, 'UP');

    // Exit ACTIVE into COOLDOWN.
    const ended = encounter.step(baseSnapshot(0.1, 'UP'), nextTick);
    expect(ended).toBeNull();

    // A second dip past the entry threshold while still in COOLDOWN must
    // not produce a second output (design's own anti-spam property,
    // proven at the mechanism level by V2-203; re-verified here through
    // the real encounter wrapper).
    const spammed = encounter.step(
      baseSnapshot(TREND_BREAKOUT_ENTRY_THRESHOLD + 0.1, 'UP'),
      nextTick + 1
    );
    expect(spammed).toBeNull();
  });

  it('rejects an activation with a NEUTRAL trendDirection', () => {
    const encounter = new TrendBreakoutEncounter();
    let tick = 0;
    const armingStrength = TREND_BREAKOUT_ENTRY_THRESHOLD + 0.1;

    for (let index = 0; index < TREND_BREAKOUT_CONFIRMATION_TICKS; index += 1) {
      encounter.step(baseSnapshot(armingStrength, 'NEUTRAL'), tick);
      tick += 1;
    }

    expect(() => encounter.step(baseSnapshot(armingStrength, 'NEUTRAL'), tick)).toThrow(
      RangeError
    );
  });

  it('resets the underlying state machine', () => {
    const encounter = new TrendBreakoutEncounter();
    stayArmed(encounter, 0, 5);
    encounter.step(baseSnapshot(TREND_BREAKOUT_ENTRY_THRESHOLD + 0.1, 'UP'), 5); // arms

    encounter.reset();

    // A fresh confirmation cycle must take the full duration again.
    let tick = 0;
    const armingStrength = TREND_BREAKOUT_ENTRY_THRESHOLD + 0.1;
    for (let index = 0; index < TREND_BREAKOUT_CONFIRMATION_TICKS; index += 1) {
      const output = encounter.step(baseSnapshot(armingStrength, 'UP'), tick);
      expect(output).toBeNull();
      tick += 1;
    }
    expect(encounter.step(baseSnapshot(armingStrength, 'UP'), tick)).not.toBeNull();
  });
});
