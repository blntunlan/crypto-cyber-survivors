/**
 * MarketApiClient — HTTP client for the dedicated market aggregator service.
 */

export type MarketPair = 'BTC' | 'ETH' | 'SOL';

export type MarketHistoryRow = {
  price: number;
  volume: number;
  timestamp: number;
};

type RawMarketHistoryRow = {
  price: number | string;
  volume?: number | string | null;
  timestamp: number | string | Date;
};

const ALLOWED_PAIRS = new Set<MarketPair>(['BTC', 'ETH', 'SOL']);
const DEFAULT_HISTORY_LIMIT = 300;
const MAX_HISTORY_LIMIT = 10000;
// Mirrors the aggregator cap, which tracks the 72h price_history retention.
const MAX_HISTORY_WINDOW_HOURS = 72;
const REQUEST_TIMEOUT_MS = 10_000;

function getMarketBaseUrl(): string {
  if (
    import.meta.env.MODE === 'development' ||
    (import.meta.env.MODE !== 'test' &&
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'))
  ) {
    return '';
  }

  const aggregatorUrl = (
    import.meta.env.VITE_MARKET_AGGREGATOR_URL as string | undefined
  )?.trim();
  const apiUrl = (import.meta.env.VITE_RAILWAY_API_URL as string | undefined)?.trim();
  const baseUrl =
    aggregatorUrl && aggregatorUrl.length > 0
      ? aggregatorUrl
      : apiUrl && apiUrl.length > 0
        ? apiUrl
        : undefined;

  if (!baseUrl) {
    throw new Error(
      'VITE_MARKET_AGGREGATOR_URL / VITE_RAILWAY_API_URL is not configured'
    );
  }

  return baseUrl.replace(/\/+$/, '');
}

function normalizePair(pair: string): MarketPair {
  const normalized = pair.trim().toUpperCase();
  if (ALLOWED_PAIRS.has(normalized as MarketPair)) {
    return normalized as MarketPair;
  }

  throw new Error(`Unsupported market pair: ${pair}`);
}

function normalizeLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return DEFAULT_HISTORY_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), MAX_HISTORY_LIMIT);
}

function normalizeWindowHours(windowHours: number | undefined): number | undefined {
  if (windowHours === undefined || !Number.isFinite(windowHours) || windowHours <= 0) {
    return undefined;
  }

  return Math.min(windowHours, MAX_HISTORY_WINDOW_HOURS);
}

function normalizeTimestamp(timestamp: RawMarketHistoryRow['timestamp']): number {
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }

  if (typeof timestamp === 'number') {
    return timestamp;
  }

  const parsed = new Date(timestamp).getTime();
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function normalizeHistoryRows(rows: RawMarketHistoryRow[]): MarketHistoryRow[] {
  return rows
    .map(row => ({
      price: Number(row.price),
      volume: Number(row.volume ?? 0),
      timestamp: normalizeTimestamp(row.timestamp),
    }))
    .filter(
      row =>
        Number.isFinite(row.price) &&
        Number.isFinite(row.volume) &&
        Number.isFinite(row.timestamp)
    );
}

/**
 * @param windowHours When set, the server buckets the rows so `limit` points
 *   span the whole window. Without it the response is simply the `limit` most
 *   recent rows, whose span depends on the logger cadence.
 */
async function getHistory(
  pair: string,
  limit: number = DEFAULT_HISTORY_LIMIT,
  windowHours?: number
): Promise<MarketHistoryRow[]> {
  const marketPair = normalizePair(pair);
  const safeLimit = normalizeLimit(limit);
  const safeWindowHours = normalizeWindowHours(windowHours);
  const windowParam =
    safeWindowHours === undefined ? '' : `&windowHours=${safeWindowHours}`;
  const url = `${getMarketBaseUrl()}/api/v1/market/history?pair=${marketPair}&limit=${safeLimit}${windowParam}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Market history request failed: HTTP ${response.status}`);
  }

  const rows = (await response.json()) as RawMarketHistoryRow[];
  return normalizeHistoryRows(rows);
}

export const marketApiClient = {
  getHistory,
};
