import { describe, expect, it, vi } from 'vitest';

import { createBtcMarketFeedSource } from '@/game-v2/market/BtcMarketFeedSource';
import { type SSEMarketUpdate } from '@/services/market/SSEMarketService';

/**
 * Thin wrapper test: proves `createBtcMarketFeedSource` delegates correctly
 * to `SSEMarketService`, not `SSEMarketService`'s own already-covered
 * reconnect/fallback/data-gap behavior
 * (`tests/services/market/SSEMarketService.test.ts` owns that).
 */

const connect = vi.fn();
const disconnect = vi.fn();
let capturedOnData: ((update: SSEMarketUpdate) => void) | null = null;
let capturedPair: string | null = null;

vi.mock('@/services/market/SSEMarketService', () => ({
  SSEMarketService: vi.fn().mockImplementation(function (
    this: {
      connect: typeof connect;
      disconnect: typeof disconnect;
    },
    config: { pair: string; onData: (update: SSEMarketUpdate) => void }
  ) {
    capturedPair = config.pair;
    capturedOnData = config.onData;
    this.connect = connect;
    this.disconnect = disconnect;
  }),
}));

const RAW_UPDATE: SSEMarketUpdate = {
  pair: 'BTC',
  price: 65_000,
  volume: 10,
  high: 66_000,
  low: 64_000,
  rsi: 55,
  rsiState: 'NEUTRAL',
  atrPercent: 1.5,
  normalizedVolume: 2.3,
  volumePercentile: 0.7,
  whaleTier: 2,
  spawnRateMultiplier: 1.5,
  enemyAggroMultiplierLong: 1.1,
  enemyAggroMultiplierShort: 0.9,
  trendStrength: 0.4,
  trendDirection: 'UP',
  timestamp: 1_700_000_000_000,
  isSynthetic: false,
};

describe('createBtcMarketFeedSource', () => {
  it('constructs SSEMarketService for the BTC pair and connects', () => {
    const source = createBtcMarketFeedSource();
    source.connect(() => {});

    expect(capturedPair).toBe('BTC');
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('translates SSEMarketUpdate into the MarketFeedUpdate port shape', () => {
    const source = createBtcMarketFeedSource();
    const received: unknown[] = [];
    source.connect(update => received.push(update));

    capturedOnData?.(RAW_UPDATE);

    expect(received).toEqual([
      {
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
      },
    ]);
  });

  it('delegates disconnect() to the underlying service', () => {
    const source = createBtcMarketFeedSource();
    source.connect(() => {});
    source.disconnect();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
