import { Router, type Request, type Response } from 'express';
import { sql } from 'drizzle-orm';
import { Logger } from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { getDb } from '../db';

/**
 * SSE Market Data Stream
 *
 * Pushes real-time market indicators to connected clients.
 * Replaces client-side Binance/Coinbase WebSocket connections.
 */

export interface SSEMarketPayload {
  pair: string;
  price: number;
  volume: number;
  high: number;
  low: number;
  rsi: number;
  rsiState: string;
  atrPercent: number;
  normalizedVolume: number;
  volumePercentile: number;
  whaleTier: number;
  spawnRateMultiplier: number;
  enemyAggroMultiplierLong: number;
  enemyAggroMultiplierShort: number;
  trendStrength: number;
  trendDirection: string;
  timestamp: number;
}

interface SSEClient {
  id: number;
  res: Response;
  pair: string;
}

const ALLOWED_PAIRS = ['BTC', 'ETH', 'SOL'] as const;
type MarketPair = (typeof ALLOWED_PAIRS)[number];

let nextClientId = 0;
const clients: Map<number, SSEClient> = new Map();

const router = Router();

export function normalizeMarketPair(input: unknown): MarketPair | null {
  const raw = typeof input === 'string' && input.trim() ? input : 'BTC';
  const pair = raw.trim().toUpperCase();
  return (ALLOWED_PAIRS as readonly string[]).includes(pair)
    ? (pair as MarketPair)
    : null;
}

/**
 * GET /api/v1/market/stream?pair=BTC
 * Content-Type: text/event-stream
 */
router.get('/stream', (req: Request, res: Response) => {
  const pair = normalizeMarketPair(req.query.pair);
  if (!pair) {
    res.status(400).json({ error: 'Unsupported market pair' });
    return;
  }

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', pair })}\n\n`);

  const clientId = nextClientId++;
  const client: SSEClient = { id: clientId, res, pair };
  clients.set(clientId, client);

  Logger.info(`[SSE] Client ${clientId} connected for ${pair} (total: ${clients.size})`);

  // Clean up on disconnect
  req.on('close', () => {
    clients.delete(clientId);
    Logger.info(`[SSE] Client ${clientId} disconnected (total: ${clients.size})`);
  });
});

/**
 * Broadcast market data to all connected SSE clients filtered by pair.
 * Called by IndicatorService on every update.
 */
export function broadcastMarketData(data: SSEMarketPayload): void {
  const payload = `data: ${JSON.stringify(data)}\n\n`;

  for (const client of clients.values()) {
    if (client.pair === data.pair) {
      try {
        client.res.write(payload);
      } catch {
        // Client disconnected, will be cleaned up by 'close' event
        clients.delete(client.id);
      }
    }
  }
}

/**
 * Send heartbeat to all connected clients.
 * Prevents proxy/load-balancer timeouts.
 */
export function startHeartbeat(intervalMs: number = 5000): NodeJS.Timeout {
  return setInterval(() => {
    const heartbeat = `: heartbeat\n\n`;
    for (const client of clients.values()) {
      try {
        client.res.write(heartbeat);
      } catch {
        clients.delete(client.id);
      }
    }
  }, intervalMs);
}

/**
 * Get connected client count (for monitoring).
 */
export function getSSEClientCount(): number {
  return clients.size;
}

/**
 * GET /api/v1/market/history?pair=BTC&limit=300[&windowHours=24]
 * Returns recent price history for indicator warmup.
 *
 * Without `windowHours` the response is the `limit` most recent rows, so the
 * span depends on the logger cadence (10s → 300 rows ≈ 50 minutes). Callers
 * that need a fixed span (the landing 24h chart) pass `windowHours`, and the
 * rows are bucketed server-side so `limit` points cover the whole window
 * instead of the client downloading every row to throw most of them away.
 */
const historyCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 10000; // 10 seconds
const MAX_HISTORY_CACHE_KEYS = 64;

function pruneHistoryCache(now: number = Date.now()): void {
  for (const [key, cached] of historyCache.entries()) {
    if (now - cached.timestamp >= CACHE_TTL_MS) {
      historyCache.delete(key);
    }
  }

  while (historyCache.size > MAX_HISTORY_CACHE_KEYS) {
    let oldestKey: string | null = null;
    let oldestTimestamp = Number.POSITIVE_INFINITY;

    for (const [key, cached] of historyCache.entries()) {
      if (cached.timestamp < oldestTimestamp) {
        oldestTimestamp = cached.timestamp;
        oldestKey = key;
      }
    }

    if (!oldestKey) {
      break;
    }
    historyCache.delete(oldestKey);
  }
}

setInterval(() => {
  pruneHistoryCache();
}, CACHE_TTL_MS).unref();

export function getHistoryCacheSize(): number {
  pruneHistoryCache();
  return historyCache.size;
}

// price_history retention is 72h (railway-market-server cron/cleanup.ts), so a
// longer window would silently return less than it promises.
const MAX_WINDOW_HOURS = 72;

export function normalizeWindowHours(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === '') {
    return undefined;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.min(parsed, MAX_WINDOW_HOURS);
}

/**
 * One row per time bucket across the requested window, newest row within each
 * bucket. Buckets are anchored to absolute epoch seconds rather than "now", so
 * the boundaries stay stable between requests and the 10s response cache keeps
 * returning a coherent series.
 */
export function bucketedHistoryQuery(pair: string, limit: number, windowHours: number) {
  const windowSeconds = windowHours * 3600;
  const bucketSeconds = Math.max(Math.ceil(windowSeconds / limit), 1);
  const sinceIso = new Date(Date.now() - windowSeconds * 1000).toISOString();

  return sql`SELECT DISTINCT ON (bucket) price, volume, timestamp
      FROM (
        SELECT price, volume, timestamp,
               floor(extract(epoch FROM timestamp) / ${bucketSeconds})::bigint AS bucket
        FROM price_history
        WHERE pair = ${pair} AND timestamp >= ${sinceIso}::timestamptz
      ) bucketed
      ORDER BY bucket ASC, timestamp DESC`;
}

router.get(
  '/history',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const pair = normalizeMarketPair(req.query.pair);
      if (!pair) {
        res.status(400).json({ error: 'Unsupported market pair' });
        return;
      }

      const limit = Math.min(Math.max(Number(req.query.limit) || 300, 1), 10000);
      const windowHours = normalizeWindowHours(req.query.windowHours);

      const cacheKey = `${pair}_${limit}_${windowHours ?? 'recent'}`;
      const cached = historyCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        res.json(cached.data);
        return;
      }

      const db = getDb();
      const result = windowHours
        ? await db.execute(bucketedHistoryQuery(pair, limit, windowHours))
        : await db.execute(
            sql`SELECT price, volume, timestamp
          FROM price_history
          WHERE pair = ${pair}
          ORDER BY timestamp DESC
          LIMIT ${limit}`
          );

      // The bucketed query already returns oldest-first; the recent query does not.
      const responseData = windowHours ? result.rows : result.rows.reverse();
      historyCache.set(cacheKey, { data: responseData, timestamp: Date.now() });
      pruneHistoryCache();

      res.json(responseData);
    } catch (error) {
      Logger.error('[Market] History fetch failed:', error);
      res.status(500).json({ error: 'Failed to fetch price history' });
    }
  })
);

export default router;
