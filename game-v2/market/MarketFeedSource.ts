/**
 * The raw fields `normalizeMarketUpdate` reads. Deliberately a superset-free
 * subset of `SSEMarketUpdate` — no `pair`, `high`, `low`, or legacy
 * gameplay-multiplier field, since `MarketSnapshot` never carries them
 * either (V2-ADR-085). `pair` is validated by the production wrapper before
 * a payload ever reaches this shape, not re-validated here.
 */
export type MarketFeedUpdate = Readonly<{
  price: number;
  rsi: number;
  rsiState: string;
  atrPercent: number;
  normalizedVolume: number;
  volumePercentile: number;
  whaleTier: number;
  trendStrength: number;
  trendDirection: string;
  timestamp: number;
  isSynthetic?: boolean;
}>;

/**
 * Injected market feed dependency, mirroring the existing `RendererPort`/
 * `IntentSource` pattern (V2-ADR-086): `game-v2/**` code depends on this
 * port, never on `SSEMarketService` directly, so normalization is testable
 * without a browser `EventSource` and exactly one production file
 * (`BtcMarketFeedSource.ts`) needs the real exchange-client import.
 */
export type MarketFeedSource = Readonly<{
  connect: (onUpdate: (update: MarketFeedUpdate) => void) => void;
  disconnect: () => void;
}>;
