import {
  SSEMarketService,
  type SSEMarketUpdate,
} from '@/services/market/SSEMarketService';

import {
  type MarketFeedSource,
  type MarketFeedUpdate,
} from '@/game-v2/market/MarketFeedSource';

/**
 * The only file under `game-v2/**` that imports `SSEMarketService` or
 * `types/crypto` (V2-ADR-086, design §7.1). Translates the legacy
 * `connect`/`disconnect`/`onData` shape into the Game V2-owned
 * `MarketFeedSource` port; carries no gameplay-multiplier fields onward —
 * `MarketSnapshotAdapter` only reads the raw-indicator subset
 * `MarketFeedUpdate` declares.
 */
export const createBtcMarketFeedSource = (): MarketFeedSource => {
  let service: SSEMarketService | null = null;

  return {
    connect: onUpdate => {
      service = new SSEMarketService({
        pair: 'BTC',
        onData: (update: SSEMarketUpdate): void => {
          const feedUpdate: MarketFeedUpdate = {
            price: update.price,
            rsi: update.rsi,
            rsiState: update.rsiState,
            atrPercent: update.atrPercent,
            normalizedVolume: update.normalizedVolume,
            volumePercentile: update.volumePercentile,
            whaleTier: update.whaleTier,
            trendStrength: update.trendStrength,
            trendDirection: update.trendDirection,
            timestamp: update.timestamp,
            isSynthetic: update.isSynthetic,
          };
          onUpdate(feedUpdate);
        },
      });
      service.connect();
    },
    disconnect: () => {
      service?.disconnect();
      service = null;
    },
  };
};
