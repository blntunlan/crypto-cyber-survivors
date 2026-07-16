/**
 * CanonicalMarketPayload — single source of truth for market data
 * consumed by the difficulty system and other game services.
 *
 * Produced by MarketEventConsolidator from the best available source:
 *   runtime snapshot > client indicators > gameMarketUpdate (fallback)
 */
export interface CanonicalMarketPayload {
  price: number;
  pnlPercent: number;
  rsi: number;
  rsiState: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';
  atrPercent: number;
  normalizedVolume: number;
  whaleTier: 0 | 1 | 2 | 3;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  priceChangePercent: number;
  trendStrength: number;
  trendDirection: 'UP' | 'DOWN' | 'SIDEWAYS';
  /** Which source produced this payload */
  source: 'runtime' | 'client' | 'fallback';
}

export type MarketFrameQuality = 'LIVE' | 'DELAYED' | 'STALE';

/**
 * Ordered, replayable market input accepted by the Director pipeline.
 * `quality` is assigned and maintained by MarketInbox, not by gameplay consumers.
 */
export type CanonicalMarketFrame = CanonicalMarketPayload & {
  revision: number;
  sequence: number;
  sourceSequence: number;
  sourceTimestamp: number;
  receivedAt: number;
  quality: MarketFrameQuality;
};
