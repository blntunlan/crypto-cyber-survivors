import { describe, expect, it } from 'vitest';

import {
  type MarketSnapshot,
  type WhaleTier,
} from '@/game-v2/contracts/MarketSnapshot';
import { VolumeWhaleEncounter } from '@/game-v2/market/VolumeWhaleEncounter';

const baseSnapshot = (whaleTier: WhaleTier): MarketSnapshot => ({
  schemaVersion: 1,
  asset: 'BTC',
  price: 65_000,
  rsi: 50,
  rsiState: 'NEUTRAL',
  atrPercent: 1,
  normalizedVolume: 1,
  volumePercentile: 0.5,
  whaleTier,
  trendStrength: 0,
  trendDirection: 'NEUTRAL',
  timestamp: 1_700_000_000_000,
  isSynthetic: false,
});

describe('VolumeWhaleEncounter', () => {
  it('produces no output for NONE or BABY_WHALE tiers', () => {
    const encounter = new VolumeWhaleEncounter();

    expect(encounter.step(baseSnapshot(0), 0)).toBeNull();
    expect(encounter.step(baseSnapshot(1), 1)).toBeNull();
  });

  it('activates instantly on a single WHALE tick, with no confirmation delay', () => {
    const encounter = new VolumeWhaleEncounter();

    const output = encounter.step(baseSnapshot(2), 0);

    expect(output).toEqual({
      kind: 'LOOT_EVENT',
      lootTierId: 'whale-loot',
      lootValue: 2,
    });
  });

  it('activates instantly on a single MEGA_WHALE tick, themed and valued for tier 3', () => {
    const encounter = new VolumeWhaleEncounter();

    const output = encounter.step(baseSnapshot(3), 0);

    expect(output).toEqual({
      kind: 'LOOT_EVENT',
      lootTierId: 'mega-whale-loot',
      lootValue: 3,
    });
  });

  it('produces no output on the tick after activation, while ACTIVE', () => {
    const encounter = new VolumeWhaleEncounter();

    encounter.step(baseSnapshot(2), 0); // activates
    const afterActivation = encounter.step(baseSnapshot(2), 1);

    expect(afterActivation).toBeNull();
  });

  it('produces no output while COOLDOWN, even if a second whale tier is met', () => {
    const encounter = new VolumeWhaleEncounter();

    encounter.step(baseSnapshot(2), 0); // activates
    const ended = encounter.step(baseSnapshot(0), 1); // exits ACTIVE into COOLDOWN
    expect(ended).toBeNull();

    // A second whale spike while still in COOLDOWN must not produce a
    // second output (design's own anti-spam property, proven at the
    // mechanism level by V2-203; re-verified here through the real
    // encounter wrapper).
    const spammed = encounter.step(baseSnapshot(3), 2);
    expect(spammed).toBeNull();
  });

  it('resets the underlying state machine', () => {
    const encounter = new VolumeWhaleEncounter();

    encounter.step(baseSnapshot(2), 0); // activates
    encounter.reset();

    // A fresh instance can activate again immediately from tick 0.
    const output = encounter.step(baseSnapshot(2), 0);
    expect(output).not.toBeNull();
  });
});
