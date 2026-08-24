import { describe, expect, it } from 'vitest';

import { type MarketSnapshot } from '@/game-v2/contracts/MarketSnapshot';
import { isMarketSnapshotStale } from '@/game-v2/market/MarketFreshness';

const snapshotAt = (timestamp: number): MarketSnapshot => ({
  schemaVersion: 1,
  asset: 'BTC',
  price: 65_000,
  rsi: 50,
  rsiState: 'NEUTRAL',
  atrPercent: 0.001,
  normalizedVolume: 1,
  volumePercentile: 0.5,
  whaleTier: 0,
  trendStrength: 0,
  trendDirection: 'NEUTRAL',
  timestamp,
  isSynthetic: false,
});

describe('isMarketSnapshotStale', () => {
  it('is not stale exactly at the threshold', () => {
    const snapshot = snapshotAt(0);

    expect(isMarketSnapshotStale(snapshot, 30_000, 30_000)).toBe(false);
  });

  it('is stale one unit past the threshold', () => {
    const snapshot = snapshotAt(0);

    expect(isMarketSnapshotStale(snapshot, 30_001, 30_000)).toBe(true);
  });

  it('is not stale for a snapshot that appears to be from the future', () => {
    const snapshot = snapshotAt(100_000);

    expect(isMarketSnapshotStale(snapshot, 50_000, 30_000)).toBe(false);
  });

  it('honours a custom staleThresholdMs over the default', () => {
    const snapshot = snapshotAt(0);

    expect(isMarketSnapshotStale(snapshot, 500, 1_000)).toBe(false);
    expect(isMarketSnapshotStale(snapshot, 1_500, 1_000)).toBe(true);
  });

  it('uses the real default threshold when none is supplied', () => {
    const snapshot = snapshotAt(0);

    expect(isMarketSnapshotStale(snapshot, 30_000)).toBe(false);
    expect(isMarketSnapshotStale(snapshot, 30_001)).toBe(true);
  });

  it('rejects an invalid nowMs', () => {
    const snapshot = snapshotAt(0);

    for (const nowMs of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => isMarketSnapshotStale(snapshot, nowMs)).toThrow(
        'nowMs must be a finite non-negative number'
      );
    }
  });

  it('rejects an invalid staleThresholdMs', () => {
    const snapshot = snapshotAt(0);

    for (const staleThresholdMs of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => isMarketSnapshotStale(snapshot, 0, staleThresholdMs)).toThrow(
        'staleThresholdMs must be a finite positive number'
      );
    }
  });
});
