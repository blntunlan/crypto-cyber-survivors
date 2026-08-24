import {
  MARKET_SNAPSHOT_SCHEMA_VERSION,
  type MarketAsset,
  type MarketSnapshot,
} from '@/game-v2/contracts/MarketSnapshot';
import {
  type MarketFeedSource,
  type MarketFeedUpdate,
} from '@/game-v2/market/MarketFeedSource';

const RSI_STATES = new Set(['OVERSOLD', 'NEUTRAL', 'OVERBOUGHT']);
const WHALE_TIERS = new Set([0, 1, 2, 3]);

const isFiniteInRange = (value: number, min: number, max: number): boolean =>
  Number.isFinite(value) && value >= min && value <= max;

/**
 * Turns a raw `MarketFeedUpdate` into a `MarketSnapshot`, or `null` if it
 * cannot be represented validly (V2-ADR-086: a live external feed's bad tick
 * is a recoverable condition, not a defect that must throw).
 *
 * The legacy client-side synthetic-fallback's `'SIDEWAYS'` trend spelling is
 * normalized to `'NEUTRAL'` before validation (V2-ADR-087).
 */
export const normalizeMarketUpdate = (
  update: MarketFeedUpdate,
  asset: MarketAsset
): MarketSnapshot | null => {
  if (!isFiniteInRange(update.price, Number.MIN_VALUE, Number.POSITIVE_INFINITY)) {
    return null;
  }

  if (!isFiniteInRange(update.rsi, 0, 100)) {
    return null;
  }

  if (!RSI_STATES.has(update.rsiState)) {
    return null;
  }

  if (!isFiniteInRange(update.atrPercent, 0, Number.POSITIVE_INFINITY)) {
    return null;
  }

  if (!isFiniteInRange(update.normalizedVolume, 0, Number.POSITIVE_INFINITY)) {
    return null;
  }

  if (!isFiniteInRange(update.volumePercentile, 0, 1)) {
    return null;
  }

  if (!Number.isInteger(update.whaleTier) || !WHALE_TIERS.has(update.whaleTier)) {
    return null;
  }

  if (!isFiniteInRange(update.trendStrength, 0, Number.POSITIVE_INFINITY)) {
    return null;
  }

  const trendDirection =
    update.trendDirection === 'SIDEWAYS' ? 'NEUTRAL' : update.trendDirection;

  if (
    trendDirection !== 'UP' &&
    trendDirection !== 'DOWN' &&
    trendDirection !== 'NEUTRAL'
  ) {
    return null;
  }

  if (!isFiniteInRange(update.timestamp, Number.MIN_VALUE, Number.POSITIVE_INFINITY)) {
    return null;
  }

  return Object.freeze({
    schemaVersion: MARKET_SNAPSHOT_SCHEMA_VERSION,
    asset,
    price: update.price,
    rsi: update.rsi,
    rsiState: update.rsiState as MarketSnapshot['rsiState'],
    atrPercent: update.atrPercent,
    normalizedVolume: update.normalizedVolume,
    volumePercentile: update.volumePercentile,
    whaleTier: update.whaleTier as MarketSnapshot['whaleTier'],
    trendStrength: update.trendStrength,
    trendDirection,
    timestamp: update.timestamp,
    isSynthetic: update.isSynthetic === true,
  });
};

export type MarketSnapshotListener = (snapshot: MarketSnapshot) => void;

/**
 * Drives an injected `MarketFeedSource` (V2-ADR-086), normalizes every raw
 * update, and holds the last known valid snapshot. A rejected update is
 * dropped silently: `latest()` keeps its previous value and no listener is
 * notified, matching design §7.5's "existing market effects transition to
 * neutral" framing rather than crashing on one bad tick from an external
 * feed.
 */
export class MarketSnapshotAdapter {
  private readonly source: MarketFeedSource;
  private readonly asset: MarketAsset;
  private latestSnapshot: MarketSnapshot | null = null;
  private readonly listeners = new Set<MarketSnapshotListener>();

  constructor(source: MarketFeedSource, asset: MarketAsset = 'BTC') {
    this.source = source;
    this.asset = asset;
  }

  public start(): void {
    this.source.connect(update => {
      const snapshot = normalizeMarketUpdate(update, this.asset);

      if (snapshot === null) {
        return;
      }

      this.latestSnapshot = snapshot;
      for (const listener of this.listeners) {
        listener(snapshot);
      }
    });
  }

  public stop(): void {
    this.source.disconnect();
  }

  public latest(): MarketSnapshot | null {
    return this.latestSnapshot;
  }

  public subscribe(listener: MarketSnapshotListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
