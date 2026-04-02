import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { BinanceService } from './services/binanceService';
import { DatabaseService } from './services/databaseService';
import { PriceLogger } from './services/priceLogger';
import { CleanupCron } from './cron/cleanup';
import { Logger } from './utils/logger';
import { ErrorReporter } from './utils/errorReporter';
import { closePool, getPool } from './db/pool';
import { startHeartbeat, getSSEClientCount } from './routes/marketStream';
import { asyncHandler } from './utils/asyncHandler';

// SSE Market Stream route
import marketStreamRouter from './routes/marketStream';

const app = express();
const PORT = process.env.PORT ?? 3002;

// Allowed origins for CORS (same as API server)
const ALLOWED_ORIGINS = [
  'https://crypto-survivors.com',
  'https://crypto-survivors.up.railway.app',
  'https://crypto-cyber-survivors-production.up.railway.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://192.168.1.8:3000',
  'http://192.168.1.7:3000',
  'http://192.168.1.7:5173',
  'https://crypto-cyber-survivors.vercel.app',
];

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '256kb' }));

// ---- Market Stream route ----
app.use('/api/v1/market', marketStreamRouter);

// ---- Monitoring endpoints ----

app.get(
  '/health',
  asyncHandler(async (_req: express.Request, res: express.Response) => {
    const binance = BinanceService.getInstance();
    const db = await DatabaseService.getInstance().checkHealth();
    res.json({
      status: binance.isConnected() && db ? 'ok' : 'degraded',
      service: 'market-aggregator',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      binanceConnected: binance.isConnected(),
      dbConnected: db,
      sseClients: getSSEClientCount(),
    });
  })
);

app.get('/stats', (_req, res) => {
  const priceStats = PriceLogger.getInstance().getStats();
  const cleanupStats = CleanupCron.getInstance().getStats();
  res.json({
    service: 'market-aggregator',
    price: priceStats,
    cleanup: cleanupStats,
    sseClients: getSSEClientCount(),
  });
});

app.get(
  '/debug',
  asyncHandler(async (_req: express.Request, res: express.Response) => {
    const binance = BinanceService.getInstance();
    const pool = getPool();
    const dbHealthy = await DatabaseService.getInstance().checkHealth();

    // Market data freshness
    type MarketRow = { pair: string; price: number; updated_at: string };
    let marketFreshness: Record<string, unknown>[] = [];
    try {
      const { rows } = await pool.query<MarketRow>(
        `SELECT pair, price, updated_at FROM market_state ORDER BY pair`
      );
      marketFreshness = rows.map(r => ({
        pair: r.pair,
        price: r.price,
        updatedAt: r.updated_at,
        staleSeconds: Math.round(
          (Date.now() - new Date(r.updated_at).getTime()) / 1000
        ),
      }));
    } catch {
      /* ignore */
    }

    // Price history count
    let priceHistoryCount = 0;
    try {
      const { rows } = await pool.query<{ count: string }>(
        `SELECT COUNT(*)::TEXT AS count FROM price_history`
      );
      priceHistoryCount = Number(rows[0]?.count ?? 0);
    } catch {
      /* ignore */
    }

    const priceStats = PriceLogger.getInstance().getStats();
    const cleanupStats = CleanupCron.getInstance().getStats();

    res.json({
      timestamp: new Date().toISOString(),
      service: 'market-aggregator',
      server: {
        uptime: Math.round(process.uptime()),
        memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        nodeVersion: process.version,
      },
      pipeline: {
        binanceConnected: binance.isConnected(),
        dbConnected: dbHealthy,
        sseClients: getSSEClientCount(),
        priceStats,
        priceHistoryCount,
      },
      database: {
        pool: {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount,
        },
        marketFreshness,
      },
      cleanup: cleanupStats,
    });
  })
);

app.get('/', (_req, res) => {
  res.json({
    name: 'Railway Market Aggregator',
    version: '1.0.0',
    description:
      'Real-time crypto market data aggregator (WebSocket + SSE + Indicators)',
    endpoints: {
      health: '/health',
      stats: '/stats',
      debug: '/debug',
      marketStream: '/api/v1/market/stream?pair=BTC',
      marketHistory: '/api/v1/market/history?pair=BTC&limit=300',
    },
  });
});

app.post('/cleanup', (_req, res) => {
  void CleanupCron.getInstance()
    .runCleanup()
    .then(result => res.json(result))
    .catch(error => res.status(500).json({ error: (error as Error).message }));
});

async function startServer(): Promise<void> {
  ErrorReporter.initGlobalHandlers();

  try {
    Logger.info('🚀 Starting Railway Market Aggregator v1.0...');

    // Initialize database service
    DatabaseService.getInstance();

    // Initialize Binance service
    BinanceService.getInstance();

    // Start price logging (connects WS + starts watchdog)
    const priceLogger = PriceLogger.getInstance();
    await priceLogger.start();

    // Start cleanup cron
    const cleanupCron = CleanupCron.getInstance();
    cleanupCron.start();

    // Start SSE heartbeat
    const heartbeatTimer = startHeartbeat(5000);

    // Start HTTP server
    app.listen(PORT, () => {
      Logger.info(`🚀 Market Aggregator ready at http://localhost:${PORT}`);
    });

    // Graceful shutdown
    const shutdown = (signal: string) => {
      Logger.info(`${signal} received, shutting down gracefully...`);
      clearInterval(heartbeatTimer);
      cleanupCron.stop();
      void priceLogger
        .stop()
        .then(() => closePool())
        .finally(() => process.exit(0));
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    Logger.error('Failed to start aggregator:', error);
    await ErrorReporter.report({
      type: 'StartupError',
      message: (error as Error).message,
      stack: (error as Error).stack,
      severity: 'critical',
    });
    process.exit(1);
  }
}

startServer().catch(error => {
  Logger.error('Unhandled error during aggregator startup:', error);
  process.exit(1);
});
