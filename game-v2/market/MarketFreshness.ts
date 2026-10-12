import { MARKET_STALE_THRESHOLD_MS } from '@/game-v2/config/MarketFreshness';
import { type MarketSnapshot } from '@/game-v2/contracts/MarketSnapshot';

/**
 * Design §7.5: "Stale data cannot author new market events or market
 * reward premiums." Pure: `nowMs` is caller-supplied, never read from
 * `Date.now()` internally (V2-ADR-142) — staleness is inherently a
 * real-wall-clock concern (SSE network latency), unlike simulation-tick
 * gameplay timing, but the function itself stays injectable and testable
 * regardless.
 *
 * A snapshot that appears to be from the future (`nowMs < snapshot.timestamp`,
 * e.g. clock skew) is treated as fresh rather than rejected — this
 * function only ever answers "has too much time passed," not "is the
 * timestamp otherwise sane."
 */
export const isMarketSnapshotStale = (
  snapshot: MarketSnapshot,
  nowMs: number,
  staleThresholdMs: number = MARKET_STALE_THRESHOLD_MS
): boolean => {
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    throw new RangeError('nowMs must be a finite non-negative number');
  }

  if (!Number.isFinite(staleThresholdMs) || staleThresholdMs <= 0) {
    throw new RangeError('staleThresholdMs must be a finite positive number');
  }

  return nowMs - snapshot.timestamp > staleThresholdMs;
};
