export const MARKET_SNAPSHOT_SCHEMA_VERSION = 1 as const;

/**
 * BTC only today (`V2-200`, V2-ADR-084). The real aggregator/SSE
 * infrastructure is single-asset; ETH/SOL wiring is deferred to an
 * unassigned follow-up task that first extends
 * `railway-market-aggregator`. A union rather than a hardcoded literal so
 * that follow-up adds a member instead of reshaping every consumer.
 */
export type MarketAsset = 'BTC';

/** Matches `railway-market-aggregator`'s `RSICalculator` state machine. */
export type RsiState = 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';

/**
 * Matches `indicatorService.ts`'s own server-side derivation
 * (`rsi > 55 ? 'UP' : rsi < 45 ? 'DOWN' : 'NEUTRAL'`). The client-side
 * synthetic-fallback's `'SIDEWAYS'` spelling is normalized to `'NEUTRAL'`
 * rather than kept as a fourth member (V2-ADR-087).
 */
export type TrendDirection = 'UP' | 'DOWN' | 'NEUTRAL';

/** Matches `VolumeAnalyzer`'s whale-tier classification. */
export type WhaleTier = 0 | 1 | 2 | 3;

/**
 * The canonical, finite, versioned market data contract (`V2-200`).
 *
 * Deliberately excludes every legacy gameplay-multiplier field
 * `SSEMarketUpdate` carries (`spawnRateMultiplier`,
 * `enemyAggroMultiplierLong`, `enemyAggroMultiplierShort`) — design §7.1
 * forbids reusing old frontend gameplay multipliers and difficulty-service
 * conclusions; only raw/normalized indicator data crosses into Game V2
 * (V2-ADR-085). Every field is validated finite or a valid enum member by
 * `normalizeMarketUpdate` before construction — this type is never partially
 * formed or `NaN`-carrying.
 */
export type MarketSnapshot = Readonly<{
  schemaVersion: typeof MARKET_SNAPSHOT_SCHEMA_VERSION;
  asset: MarketAsset;
  price: number;
  rsi: number;
  rsiState: RsiState;
  atrPercent: number;
  normalizedVolume: number;
  volumePercentile: number;
  whaleTier: WhaleTier;
  trendStrength: number;
  trendDirection: TrendDirection;
  timestamp: number;
  isSynthetic: boolean;
}>;
