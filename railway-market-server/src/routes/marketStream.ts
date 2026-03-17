import { Router, type Request, type Response } from 'express';
import { query } from '../db/pool';
import { Logger } from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';

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

let nextClientId = 0;
const clients: Map<number, SSEClient> = new Map();

const router = Router();

/**
 * GET /api/v1/market/stream?pair=BTC
 * Content-Type: text/event-stream
 */
router.get('/stream', (req: Request, res: Response) => {
  const pair = (req.query.pair as string) ?? 'BTC';

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
 * GET /api/v1/market/history?pair=BTC&limit=300
 * Returns recent price history for indicator warmup.
 */
router.get('/history', asyncHandler(async (req: Request, res: Response) => {
  try {
    const pair = (req.query.pair as string) ?? 'BTC';
    const limit = Math.min(Number(req.query.limit) || 300, 1000);

    const { rows } = await query(
      `SELECT price, volume, timestamp
       FROM price_history
       WHERE pair = $1
       ORDER BY timestamp DESC
       LIMIT $2`,
      [pair, limit]
    );

    // Reverse to chronological order
    res.json(rows.reverse());
  } catch (error) {
    Logger.error('[Market] History fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch price history' });
  }
}));

export default router;
