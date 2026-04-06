import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { SupabaseService } from './services/supabaseService';
import { Logger } from './utils/logger';
import { ErrorReporter } from './utils/errorReporter';
import twitterAuthRouter from './services/twitterAuth';
import { closePool, getPool } from './db/pool';
import { runMigrations } from './db/migrate';
import { asyncHandler } from './utils/asyncHandler';
import {
  globalLimiter,
  authLimiter,
  writeLimiter,
  telemetryLimiter,
  leaderboardLimiter,
} from './middleware/rateLimit';

// API Routes
import profileRouter from './routes/profile';
import sessionsRouter from './routes/sessions';
import walletRouter from './routes/wallet';
import leaderboardRouter from './routes/leaderboard';
import telemetryRouter from './routes/telemetry';
import identitiesRouter from './routes/identities';
import metaProgressionRouter from './routes/metaProgression';
import challengesRouter from './routes/challenges';
import replaysRouter from './routes/replays';
import webhookRouter from './routes/webhooks';
import adminRouter from './routes/admin';

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

// Trust Railway's proxy so X-Forwarded-For is used for rate-limit keys
app.set('trust proxy', 1);

// Global rate limiter — 100 req/min per IP
app.use(globalLimiter);

// ---- Auth routes ----
app.use('/api/auth/twitter', authLimiter, twitterAuthRouter);

// ---- API v1 routes ----
app.use('/api/v1/profile', authLimiter, profileRouter);
app.use('/api/v1/sessions', writeLimiter, sessionsRouter);
app.use('/api/v1/wallet', writeLimiter, walletRouter);
app.use('/api/v1/leaderboard', leaderboardLimiter, leaderboardRouter);
app.use('/api/v1/telemetry', telemetryLimiter, telemetryRouter);
app.use('/api/v1/identities', writeLimiter, identitiesRouter);
app.use('/api/v1/meta', writeLimiter, metaProgressionRouter);
app.use('/api/v1/challenges', writeLimiter, challengesRouter);
app.use('/api/v1/replays', writeLimiter, replaysRouter);

// ---- Webhooks & Admin (no rate limiter — secret-protected) ----
app.use('/api/v1/webhooks', webhookRouter);
app.use('/api/v1/admin', adminRouter);

// ---- Monitoring endpoints ----

app.get(
  '/health',
  asyncHandler(async (_req: express.Request, res: express.Response) => {
    const db = await SupabaseService.getInstance().checkHealth();

    // Check Supabase JWKS reachability
    let jwksHealthy = false;
    const supabaseUrl = process.env.SUPABASE_URL;
    if (supabaseUrl) {
      try {
        const jwksRes = await fetch(`${supabaseUrl}/auth/v1/.well-known/jwks.json`, {
          signal: AbortSignal.timeout(3000),
        });
        jwksHealthy = jwksRes.ok;
      } catch {
        jwksHealthy = false;
      }
    }

    res.json({
      status: db && jwksHealthy ? 'ok' : 'degraded',
      service: 'api-server',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      dbConnected: db,
      jwksReachable: jwksHealthy,
    });
  })
);

app.get('/stats', (_req, res) => {
  res.json({
    service: 'api-server',
    uptime: Math.round(process.uptime()),
    memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  });
});

const ADMIN_API_SECRET = process.env.ADMIN_API_SECRET;
function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: () => void
): void {
  if (!ADMIN_API_SECRET) {
    next();
    return;
  }
  const auth = req.headers['authorization'];
  if (auth !== `Bearer ${ADMIN_API_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

/**
 * GET /debug — Full system diagnostics for production monitoring.
 * Returns DB table counts, pool stats, and activity metrics.
 */
app.get(
  '/debug',
  requireAdmin,
  asyncHandler(async (_req: express.Request, res: express.Response) => {
    const pool = getPool();
    const dbHealthy = await SupabaseService.getInstance().checkHealth();

    // DB table row counts
    let tableCounts: Record<string, number> = {};
    try {
      const tables = [
        'profiles',
        'sessions',
        'virtual_accounts',
        'ledger',
        'market_state',
        'price_history',
        'error_reports',
        'cheat_attempts',
        'device_profiles',
        'performance_metrics',
        'identities',
        'meta_progression',
        'daily_challenges',
        'challenge_completions',
        'challenge_seed_log',
        'game_replays',
      ];
      for (const t of tables) {
        try {
          const { rows: r } = await pool.query<{ count: string }>(
            `SELECT COUNT(*)::TEXT AS count FROM ${t}`
          );
          tableCounts[t] = Number(r[0]?.count ?? 0);
        } catch {
          tableCounts[t] = -1;
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

    // Recent errors
    let recentErrors = 0;
    type ErrorRow = {
      error_type: string;
      message: string;
      severity: string;
      category: string;
      created_at: string;
    };
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
    } catch {
      /* ignore */
    }

    // Recent cheat attempts
    let recentCheats = 0;
    try {
      const { rows } = await pool.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM cheat_attempts WHERE created_at > now() - INTERVAL '24 hours'`
      );
      recentCheats = Number(rows[0]?.count ?? 0);
    } catch {
      /* ignore */
    }

    // Session stats
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
    } catch {
      /* ignore */
    }

    // Auth metrics
    type AuthMetric = { count: string };
    type ProviderStat = { provider: string; count: string };
    type AuditStat = { action: string; count: string };
    let authMetrics: Record<string, unknown> = {};
    try {
      const { rows: activeRows } = await pool.query<AuthMetric>(
        `SELECT COUNT(*) AS count FROM profiles WHERE last_seen_at > now() - INTERVAL '24 hours'`
      );
      const { rows: newRows } = await pool.query<AuthMetric>(
        `SELECT COUNT(*) AS count FROM profiles WHERE created_at::date = CURRENT_DATE`
      );
      const { rows: providerRows } = await pool.query<ProviderStat>(
        `SELECT provider, COUNT(*)::TEXT AS count FROM identities GROUP BY provider ORDER BY count DESC`
      );

      // Only query audit_log if table exists
      let auditSummary: AuditStat[] = [];
      try {
        const { rows: auditRows } = await pool.query<AuditStat>(
          `SELECT action, COUNT(*)::TEXT AS count FROM audit_log WHERE created_at > now() - INTERVAL '24 hours' GROUP BY action ORDER BY count DESC`
        );
        auditSummary = auditRows;
      } catch {
        /* audit_log table may not exist yet */
      }

      authMetrics = {
        activeUsers24h: Number(activeRows[0]?.count ?? 0),
        newProfilesToday: Number(newRows[0]?.count ?? 0),
        identitiesByProvider: Object.fromEntries(
          providerRows.map(r => [r.provider, Number(r.count)])
        ),
        auditLast24h: Object.fromEntries(
          auditSummary.map(r => [r.action, Number(r.count)])
        ),
      };
    } catch {
      /* ignore */
    }

    res.json({
      timestamp: new Date().toISOString(),
      service: 'api-server',
      server: {
        uptime: Math.round(process.uptime()),
        memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        nodeVersion: process.version,
      },
      database: {
        connected: dbHealthy,
        pool: poolStats,
        tableCounts,
      },
      activity: {
        sessionStats,
        recentErrors_1h: recentErrors,
        recentErrorDetails,
        recentCheats_24h: recentCheats,
      },
      auth: authMetrics,
    });
  })
);

app.get('/', (_req, res) => {
  res.json({
    name: 'Railway API Server',
    version: '3.0.0',
    description: 'Game API server (stateless REST)',
    note: 'Market data (SSE/WebSocket) moved to market-aggregator service',
    endpoints: {
      health: '/health',
      stats: '/stats',
      debug: '/debug',
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

async function startServer(): Promise<void> {
  ErrorReporter.initGlobalHandlers();

  try {
    Logger.info('🚀 Starting Railway API Server v3.0...');

    // Initialize database service (validates DATABASE_URL)
    SupabaseService.getInstance();

    // Run pending database migrations
    await runMigrations();

    // Start HTTP server
    const server = app.listen(PORT, () => {
      Logger.info(`🚀 API Server ready at http://localhost:${PORT}`);
    });

    // Graceful shutdown — drain in-flight requests before closing
    const SHUTDOWN_TIMEOUT_MS = 10_000;
    const shutdown = (signal: string) => {
      Logger.info(`${signal} received, shutting down gracefully...`);
      server.close(() => {
        Logger.info('HTTP server closed, draining DB pool...');
        void closePool().finally(() => process.exit(0));
      });
      // Force exit if graceful shutdown takes too long
      setTimeout(() => {
        Logger.warn('Graceful shutdown timed out, forcing exit');
        process.exit(1);
      }, SHUTDOWN_TIMEOUT_MS).unref();
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
