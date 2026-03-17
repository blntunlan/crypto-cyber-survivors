import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { BinanceService } from './services/binanceService';
import { SupabaseService } from './services/supabaseService';
import { PriceLogger } from './services/priceLogger';
import { CleanupCron } from './cron/cleanup';
import { Logger } from './utils/logger';
import { ErrorReporter } from './utils/errorReporter';
import twitterAuthRouter from './services/twitterAuth';
import { closePool, getPool } from './db/pool';
import { startHeartbeat, getSSEClientCount } from './routes/marketStream';
import { asyncHandler } from './utils/asyncHandler';

// API Routes
import profileRouter from './routes/profile';
import sessionsRouter from './routes/sessions';
import walletRouter from './routes/wallet';
import leaderboardRouter from './routes/leaderboard';
import telemetryRouter from './routes/telemetry';
import identitiesRouter from './routes/identities';
import marketStreamRouter from './routes/marketStream';
import metaProgressionRouter from './routes/metaProgression';
import challengesRouter from './routes/challenges';
import replaysRouter from './routes/replays';

const app = express();
const PORT = process.env.PORT ?? 3001;

// Allowed origins for CORS
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
      // Allow requests with no origin (server-to-server, curl, etc.)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

// ---- Auth routes ----
app.use('/api/auth/twitter', twitterAuthRouter);

// ---- API v1 routes ----
app.use('/api/v1/profile', profileRouter);
app.use('/api/v1/sessions', sessionsRouter);
app.use('/api/v1/wallet', walletRouter);
app.use('/api/v1/leaderboard', leaderboardRouter);
app.use('/api/v1/telemetry', telemetryRouter);
app.use('/api/v1/identities', identitiesRouter);
app.use('/api/v1/market', marketStreamRouter);
app.use('/api/v1/meta', metaProgressionRouter);
app.use('/api/v1/challenges', challengesRouter);
app.use('/api/v1/replays', replaysRouter);

// ---- Monitoring endpoints ----

app.get('/health', asyncHandler(async (_req: express.Request, res: express.Response) => {
  const binance = BinanceService.getInstance();
  const db = await SupabaseService.getInstance().checkHealth();
  res.json({
    status: binance.isConnected() && db ? 'ok' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    binanceConnected: binance.isConnected(),
    dbConnected: db,
    sseClients: getSSEClientCount(),
  });
}));

app.get('/stats', (_req, res) => {
  const priceStats = PriceLogger.getInstance().getStats();
  const cleanupStats = CleanupCron.getInstance().getStats();
  res.json({
    price: priceStats,
    cleanup: cleanupStats,
    sseClients: getSSEClientCount(),
  });
});

/**
 * GET /debug — Full system diagnostics for production monitoring.
 * Returns DB table counts, pool stats, pipeline health, and sync status.
 */
app.get('/debug', asyncHandler(async (_req: express.Request, res: express.Response) => {
  const binance = BinanceService.getInstance();
  const pool = getPool();
  const dbHealthy = await SupabaseService.getInstance().checkHealth();

  // DB table row counts (exact counts, individually to handle missing tables)
  let tableCounts: Record<string, number> = {};
  try {
    const tables = [
      'profiles', 'sessions', 'virtual_accounts', 'ledger',
      'market_state', 'price_history', 'error_reports',
      'cheat_attempts', 'device_profiles', 'performance_metrics',
      'identities', 'meta_progression', 'daily_challenges',
      'challenge_completions', 'challenge_seed_log', 'game_replays',
    ];
    // Count each table individually to avoid one missing table breaking all counts
    for (const t of tables) {
      try {
        const { rows: r } = await pool.query<{ count: string }>(`SELECT COUNT(*)::TEXT AS count FROM ${t}`);
        tableCounts[t] = Number(r[0]?.count ?? 0);
      } catch {
        tableCounts[t] = -1; // table doesn't exist
      }
    }
  } catch {
    tableCounts = { error: -1 };
  }

  // Connection pool stats
  const poolStats = {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };

  // Recent errors: count + last 10 details
  let recentErrors = 0;
  type ErrorRow = { error_type: string; message: string; severity: string; category: string; created_at: string };
  let recentErrorDetails: ErrorRow[] = [];
  try {
    const { rows: countRows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM error_reports WHERE created_at > now() - INTERVAL '1 hour'`
    );
    recentErrors = Number(countRows[0]?.count ?? 0);

    const { rows: detailRows } = await pool.query<ErrorRow>(
      `SELECT error_type, message, severity, category, created_at::TEXT
       FROM error_reports
       ORDER BY created_at DESC
       LIMIT 10`
    );
    recentErrorDetails = detailRows;
  } catch { /* ignore */ }

  // Check for recent cheat attempts (last 24h)
  let recentCheats = 0;
  try {
    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM cheat_attempts WHERE created_at > now() - INTERVAL '24 hours'`
    );
    recentCheats = Number(rows[0]?.count ?? 0);
  } catch { /* ignore */ }

  // Verified vs unverified sessions (last 24h)
  type SessionStat = { is_verified: boolean; count: string };
  let sessionStats: Record<string, number> = {};
  try {
    const { rows } = await pool.query<SessionStat>(
      `SELECT is_verified, COUNT(*) AS count FROM sessions
       WHERE created_at > now() - INTERVAL '24 hours'
       GROUP BY is_verified`
    );
    sessionStats = {
      verified_24h: Number(rows.find(r => r.is_verified)?.count ?? 0),
      unverified_24h: Number(rows.find(r => !r.is_verified)?.count ?? 0),
    };
  } catch { /* ignore */ }

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
      staleSeconds: Math.round((Date.now() - new Date(r.updated_at).getTime()) / 1000),
    }));
  } catch { /* ignore */ }

  const priceStats = PriceLogger.getInstance().getStats();
  const cleanupStats = CleanupCron.getInstance().getStats();

  res.json({
    timestamp: new Date().toISOString(),
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
    },
    database: {
      pool: poolStats,
      tableCounts,
      marketFreshness,
    },
    activity: {
      sessionStats,
      recentErrors_1h: recentErrors,
      recentErrorDetails,
      recentCheats_24h: recentCheats,
    },
    cleanup: cleanupStats,
  });
}));

app.get('/', (_req, res) => {
  res.json({
    name: 'Railway Market Server',
    version: '2.0.0',
    description: 'Real-time crypto market data + game API server',
    endpoints: {
      health: '/health',
      stats: '/stats',
      debug: '/debug',
      marketStream: '/api/v1/market/stream?pair=BTC',
      profile: '/api/v1/profile',
      sessions: '/api/v1/sessions',
      wallet: '/api/v1/wallet',
      leaderboard: '/api/v1/leaderboard',
      meta: '/api/v1/meta',
      challenges: '/api/v1/challenges',
      replays: '/api/v1/replays',
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
    Logger.info('🚀 Starting Railway Market Server v2.0...');

    // Initialize database service (validates DATABASE_URL)
    SupabaseService.getInstance();
    BinanceService.getInstance();

    // Start price logging
    const priceLogger = PriceLogger.getInstance();
    await priceLogger.start();

    // Start cleanup cron
    const cleanupCron = CleanupCron.getInstance();
    cleanupCron.start();

    // Start SSE heartbeat (every 5 seconds)
    const heartbeatTimer = startHeartbeat(5000);

    // Start HTTP server
    app.listen(PORT, () => {
      Logger.info(`🚀 Server ready at http://localhost:${PORT}`);
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
    Logger.error('Failed to start server:', error);
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
  Logger.error('Unhandled error during server startup:', error);
  process.exit(1);
});
