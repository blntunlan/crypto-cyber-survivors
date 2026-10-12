import { describe, expect, it, vi } from 'vitest';

import { MARKET_SNAPSHOT_SCHEMA_VERSION } from '@/game-v2/contracts/MarketSnapshot';
import {
  type MarketFeedSource,
  type MarketFeedUpdate,
} from '@/game-v2/market/MarketFeedSource';
import {
  MarketSnapshotAdapter,
  normalizeMarketUpdate,
} from '@/game-v2/market/MarketSnapshotAdapter';

const VALID_UPDATE: MarketFeedUpdate = Object.freeze({
  price: 65_000,
  rsi: 55,
  rsiState: 'NEUTRAL',
  atrPercent: 1.5,
  normalizedVolume: 2.3,
  volumePercentile: 0.7,
  whaleTier: 2,
  trendStrength: 0.4,
  trendDirection: 'UP',
  timestamp: 1_700_000_000_000,
  isSynthetic: false,
});

describe('normalizeMarketUpdate', () => {
  it('normalizes a fully valid update', () => {
    const snapshot = normalizeMarketUpdate(VALID_UPDATE, 'BTC');

    expect(snapshot).toEqual({
      schemaVersion: MARKET_SNAPSHOT_SCHEMA_VERSION,
      asset: 'BTC',
      price: 65_000,
      rsi: 55,
      rsiState: 'NEUTRAL',
      atrPercent: 1.5,
      normalizedVolume: 2.3,
      volumePercentile: 0.7,
      whaleTier: 2,
      trendStrength: 0.4,
      trendDirection: 'UP',
      timestamp: 1_700_000_000_000,
      isSynthetic: false,
    });
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it('defaults isSynthetic to false when absent', () => {
    const { isSynthetic: _isSynthetic, ...rest } = VALID_UPDATE;
    const snapshot = normalizeMarketUpdate(rest as MarketFeedUpdate, 'BTC');

    expect(snapshot?.isSynthetic).toBe(false);
  });

  it('normalizes the legacy synthetic-fallback SIDEWAYS spelling to NEUTRAL', () => {
    const snapshot = normalizeMarketUpdate(
      { ...VALID_UPDATE, trendDirection: 'SIDEWAYS' },
      'BTC'
    );

    expect(snapshot?.trendDirection).toBe('NEUTRAL');
  });

  it.each([
    ['non-finite price', { price: Number.NaN }],
    ['zero price', { price: 0 }],
    ['negative price', { price: -1 }],
    ['non-finite rsi', { rsi: Number.NaN }],
    ['rsi below range', { rsi: -1 }],
    ['rsi above range', { rsi: 101 }],
    ['invalid rsiState', { rsiState: 'BOGUS' }],
    ['non-finite atrPercent', { atrPercent: Number.NaN }],
    ['negative atrPercent', { atrPercent: -0.1 }],
    ['non-finite normalizedVolume', { normalizedVolume: Number.NaN }],
    ['negative normalizedVolume', { normalizedVolume: -0.1 }],
    ['non-finite volumePercentile', { volumePercentile: Number.NaN }],
    ['volumePercentile below range', { volumePercentile: -0.1 }],
    ['volumePercentile above range', { volumePercentile: 1.1 }],
    ['invalid whaleTier', { whaleTier: 4 }],
    ['non-integer whaleTier', { whaleTier: 1.5 }],
    ['non-finite trendStrength', { trendStrength: Number.NaN }],
    ['negative trendStrength', { trendStrength: -0.1 }],
    ['invalid trendDirection', { trendDirection: 'BOGUS' }],
    ['non-finite timestamp', { timestamp: Number.NaN }],
    ['zero timestamp', { timestamp: 0 }],
  ] as const)('rejects %s', (_label, override) => {
    const snapshot = normalizeMarketUpdate({ ...VALID_UPDATE, ...override }, 'BTC');

    expect(snapshot).toBeNull();
  });
});

const createFakeSource = (): {
  source: MarketFeedSource;
  emit: (update: MarketFeedUpdate) => void;
  disconnect: ReturnType<typeof vi.fn>;
} => {
  let handler: ((update: MarketFeedUpdate) => void) | null = null;
  const disconnect = vi.fn();

  return {
    source: {
      connect: onUpdate => {
        handler = onUpdate;
      },
      disconnect,
    },
    emit: update => handler?.(update),
    disconnect,
  };
};

describe('MarketSnapshotAdapter', () => {
  it('normalizes and publishes valid updates through latest() and subscribe()', () => {
    const { source, emit } = createFakeSource();
    const adapter = new MarketSnapshotAdapter(source);
    const received: unknown[] = [];
    adapter.subscribe(snapshot => received.push(snapshot));

    expect(adapter.latest()).toBeNull();

    adapter.start();
    emit(VALID_UPDATE);

    expect(adapter.latest()?.price).toBe(65_000);
    expect(received).toHaveLength(1);
  });

  it('keeps the last valid snapshot and publishes nothing when an update is rejected', () => {
    const { source, emit } = createFakeSource();
    const adapter = new MarketSnapshotAdapter(source);
    const received: unknown[] = [];

    adapter.start();
    emit(VALID_UPDATE);
    adapter.subscribe(snapshot => received.push(snapshot));

    emit({ ...VALID_UPDATE, price: Number.NaN });

    expect(adapter.latest()?.price).toBe(65_000);
    expect(received).toHaveLength(0);
  });

  it('stops notifying an unsubscribed listener', () => {
    const { source, emit } = createFakeSource();
    const adapter = new MarketSnapshotAdapter(source);
    const received: unknown[] = [];
    const unsubscribe = adapter.subscribe(snapshot => received.push(snapshot));

    adapter.start();
    unsubscribe();
    emit(VALID_UPDATE);

    expect(received).toHaveLength(0);
  });

  it('delegates stop() to the source disconnect()', () => {
    const { source, disconnect } = createFakeSource();
    const adapter = new MarketSnapshotAdapter(source);

    adapter.start();
    adapter.stop();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
