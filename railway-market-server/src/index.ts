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
import { closePool } from './db/pool';
import { startHeartbeat, getSSEClientCount } from './routes/marketStream';

// API Routes
import profileRouter from './routes/profile';
import sessionsRouter from './routes/sessions';
import walletRouter from './routes/wallet';
import leaderboardRouter from './routes/leaderboard';
import telemetryRouter from './routes/telemetry';
import identitiesRouter from './routes/identities';
import marketStreamRouter from './routes/marketStream';

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

// ---- Monitoring endpoints ----

app.get('/health', async (_req, res) => {
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
});

app.get('/stats', (_req, res) => {
  const priceStats = PriceLogger.getInstance().getStats();
  const cleanupStats = CleanupCron.getInstance().getStats();
  res.json({
    price: priceStats,
    cleanup: cleanupStats,
    sseClients: getSSEClientCount(),
  });
});

app.get('/', (_req, res) => {
  res.json({
    name: 'Railway Market Server',
    version: '2.0.0',
    description: 'Real-time crypto market data + game API server',
    endpoints: {
      health: '/health',
      stats: '/stats',
      marketStream: '/api/v1/market/stream?pair=BTC',
      profile: '/api/v1/profile',
      sessions: '/api/v1/sessions',
      wallet: '/api/v1/wallet',
      leaderboard: '/api/v1/leaderboard',
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
