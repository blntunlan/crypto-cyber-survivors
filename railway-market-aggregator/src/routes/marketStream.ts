import { Router, type Request, type Response } from 'express';
import { sql } from 'drizzle-orm';
import { Logger } from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { getDb } from '../db';

/**
 * SSE Market Data Stream
 *
 * Pushes real-time market indicators to connected clients.
 * This is the aggregator's primary output to game clients.
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
  ip: string;
}

const MAX_SSE_PER_IP = 3;
const MAX_SSE_TOTAL = 150;
const ALLOWED_PAIRS = ['BTC', 'ETH', 'SOL'] as const;

type MarketPair = (typeof ALLOWED_PAIRS)[number];

let nextClientId = 0;
const clients: Map<number, SSEClient> = new Map();
const sseConnectionsPerIp: Map<string, number> = new Map();

const router = Router();

function normalizeMarketPair(input: unknown): MarketPair | null {
  const raw = typeof input === 'string' && input.trim() ? input : 'BTC';
  const pair = raw.trim().toUpperCase();
  return (ALLOWED_PAIRS as readonly string[]).includes(pair)
    ? (pair as MarketPair)
    : null;
}

function decrementIpConnection(clientIp: string): void {
  const count = sseConnectionsPerIp.get(clientIp) ?? 1;
  if (count <= 1) {
    sseConnectionsPerIp.delete(clientIp);
  } else {
    sseConnectionsPerIp.set(clientIp, count - 1);
  }
}

function removeClient(clientId: number): boolean {
  const client = clients.get(clientId);
  if (!client) {
    return false;
  }

  clients.delete(clientId);
  decrementIpConnection(client.ip);
  return true;
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

  // --- DoS protection: per-IP and global connection limits ---
  const forwarded = req.headers['x-forwarded-for'];
  const forwardedStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const clientIp = forwardedStr?.split(',')[0]?.trim() ?? req.ip ?? 'unknown';

  if (clients.size >= MAX_SSE_TOTAL) {
    Logger.warn(
      `[SSE] Global connection limit reached (${MAX_SSE_TOTAL}), rejecting ${clientIp}`
    );
    res.status(429).json({ error: 'Too many SSE connections' });
    return;
  }

  const currentIpCount = sseConnectionsPerIp.get(clientIp) ?? 0;
  if (currentIpCount >= MAX_SSE_PER_IP) {
    Logger.warn(`[SSE] Per-IP limit reached for ${clientIp} (${MAX_SSE_PER_IP})`);
    res.status(429).json({ error: 'Too many SSE connections from this IP' });
    return;
  }

  sseConnectionsPerIp.set(clientIp, currentIpCount + 1);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(`data: ${JSON.stringify({ type: 'connected', pair })}\n\n`);

  const clientId = nextClientId++;
  const client: SSEClient = { id: clientId, res, pair, ip: clientIp };
  clients.set(clientId, client);

  Logger.info(
    `[SSE] Client ${clientId} connected for ${pair} from ${clientIp} (total: ${clients.size})`
  );

  req.on('close', () => {
    if (removeClient(clientId)) {
      Logger.info(`[SSE] Client ${clientId} disconnected (total: ${clients.size})`);
    }
  });
});

/**
 * Broadcast market data to all connected SSE clients filtered by pair.
 */
export function broadcastMarketData(data: SSEMarketPayload): void {
  const payload = `data: ${JSON.stringify(data)}\n\n`;

  for (const client of clients.values()) {
    if (client.pair === data.pair) {
      try {
        client.res.write(payload);
      } catch {
        removeClient(client.id);
        try {
          client.res.end();
        } catch {
          /* already closed */
        }
      }
    }
  }
}

/**
 * Send heartbeat to all connected clients.
 */
export function startHeartbeat(intervalMs: number = 5000): NodeJS.Timeout {
  return setInterval(() => {
    const heartbeat = `: heartbeat\n\n`;
    for (const client of clients.values()) {
      try {
        client.res.write(heartbeat);
      } catch {
        removeClient(client.id);
        try {
          client.res.end();
        } catch {
          /* already closed */
        }
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
 * GET /api/v1/market/history?pair=BTC&limit=300
 * Returns recent price history for indicator warmup.
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

router.get(
  '/history',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const pair = normalizeMarketPair(req.query.pair);
      if (!pair) {
        res.status(400).json({ error: 'Unsupported market pair' });
        return;
      }

      const limit = Math.min(Number(req.query.limit) || 300, 1000);

      const cacheKey = `${pair}_${limit}`;
      const cached = historyCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        res.json(cached.data);
        return;
      }

      const db = getDb();
      const result = await db.execute(
        sql`SELECT price, volume, timestamp
          FROM price_history
          WHERE pair = ${pair}
          ORDER BY timestamp DESC
          LIMIT ${limit}`
      );

      const responseData = result.rows.reverse();
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
