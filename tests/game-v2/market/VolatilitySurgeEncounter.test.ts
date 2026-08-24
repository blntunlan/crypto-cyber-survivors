import { describe, expect, it } from 'vitest';

import {
  VOLATILITY_SURGE_CONFIRMATION_TICKS,
  VOLATILITY_SURGE_ENTRY_THRESHOLD,
  VOLATILITY_SURGE_TELEGRAPH_TICKS,
} from '@/game-v2/config/VolatilitySurgeFamily';
import { type MarketSnapshot } from '@/game-v2/contracts/MarketSnapshot';
import { VolatilitySurgeEncounter } from '@/game-v2/market/VolatilitySurgeEncounter';

const baseSnapshot = (atrPercent: number): MarketSnapshot => ({
  schemaVersion: 1,
  asset: 'BTC',
  price: 65_000,
  rsi: 50,
  rsiState: 'NEUTRAL',
  atrPercent,
  normalizedVolume: 1,
  volumePercentile: 0.5,
  whaleTier: 0,
  trendStrength: 0,
  trendDirection: 'NEUTRAL',
  timestamp: 1_700_000_000_000,
  isSynthetic: false,
});

/** Drives a real surge to activation, returning the output and the next free tick. */
const driveToActivation = (
  encounter: VolatilitySurgeEncounter,
  startTick: number
): { output: ReturnType<VolatilitySurgeEncounter['step']>; nextTick: number } => {
  const surgeLevel = VOLATILITY_SURGE_ENTRY_THRESHOLD + 0.01;
  let tick = startTick;
  let output: ReturnType<VolatilitySurgeEncounter['step']> = null;

  for (let index = 0; index <= VOLATILITY_SURGE_CONFIRMATION_TICKS; index += 1) {
    output = encounter.step(baseSnapshot(surgeLevel), tick);
    tick += 1;
  }

  return { output, nextTick: tick };
};

describe('VolatilitySurgeEncounter', () => {
  it('produces no output while ARMED', () => {
    const encounter = new VolatilitySurgeEncounter();
    const results: ReturnType<VolatilitySurgeEncounter['step']>[] = [];

    for (let tick = 0; tick < 10; tick += 1) {
      results.push(encounter.step(baseSnapshot(0.001), tick));
    }

    expect(results.every(result => result === null)).toBe(true);
  });

  it('produces exactly one bounded output on the activation tick', () => {
    const encounter = new VolatilitySurgeEncounter();
    const { output } = driveToActivation(encounter, 0);

    expect(output).toEqual({
      kind: 'WORLD_EVENT',
      hazardId: 'volatility-tremor',
      telegraphTicks: VOLATILITY_SURGE_TELEGRAPH_TICKS,
    });
  });

  it('produces no output on ticks before or after the exact activation tick', () => {
    const encounter = new VolatilitySurgeEncounter();
    let tick = 0;
    const surgeLevel = VOLATILITY_SURGE_ENTRY_THRESHOLD + 0.01;

    for (let index = 0; index < VOLATILITY_SURGE_CONFIRMATION_TICKS; index += 1) {
      const output = encounter.step(baseSnapshot(surgeLevel), tick);
      expect(output).toBeNull();
      tick += 1;
    }

    const activationOutput = encounter.step(baseSnapshot(surgeLevel), tick);
    expect(activationOutput).not.toBeNull();
    tick += 1;

    const afterActivation = encounter.step(baseSnapshot(surgeLevel), tick);
    expect(afterActivation).toBeNull();
  });

  it('produces no output while COOLDOWN, even if the entry condition is met again', () => {
    const encounter = new VolatilitySurgeEncounter();
    const { nextTick } = driveToActivation(encounter, 0);

    // Exit ACTIVE into COOLDOWN.
    const ended = encounter.step(baseSnapshot(0.001), nextTick);
    expect(ended).toBeNull();

    // A second surge while still in COOLDOWN must not produce a second
    // output (design's own anti-spam property, proven at the mechanism
    // level by V2-203; re-verified here through the real encounter
    // wrapper, mirroring V2-204's own test).
    const spammed = encounter.step(
      baseSnapshot(VOLATILITY_SURGE_ENTRY_THRESHOLD + 0.01),
      nextTick + 1
    );
    expect(spammed).toBeNull();
  });

  it('resets the underlying state machine', () => {
    const encounter = new VolatilitySurgeEncounter();
    const surgeLevel = VOLATILITY_SURGE_ENTRY_THRESHOLD + 0.01;

    for (let tick = 0; tick < 5; tick += 1) {
      encounter.step(baseSnapshot(0.001), tick);
    }
    encounter.step(baseSnapshot(surgeLevel), 5); // arms

    encounter.reset();

    // A fresh confirmation cycle must take the full duration again.
    let tick = 0;
    for (let index = 0; index < VOLATILITY_SURGE_CONFIRMATION_TICKS; index += 1) {
      const output = encounter.step(baseSnapshot(surgeLevel), tick);
      expect(output).toBeNull();
      tick += 1;
    }
    expect(encounter.step(baseSnapshot(surgeLevel), tick)).not.toBeNull();
  });
});
