import pg from 'pg';
import { Logger } from '../utils/logger';

const { Pool } = pg;

let pool: pg.Pool | null = null;

const DEFAULT_POOL_MAX = 5;
const POOL_CHECK_INTERVAL_MS = 30_000;
const POOL_WARNING_COOLDOWN_MS = 60_000;
const POOL_USAGE_WARN_THRESHOLD = 0.8;
const DB_ERROR_LOG_COOLDOWN_MS = 10_000;

let lastPoolWarningAt = 0;
let lastQueryErrorLogAt = 0;

export function getPoolMax(): number {
  const configured = Number(process.env.PG_POOL_MAX);
  if (Number.isInteger(configured) && configured > 0) {
    return configured;
  }
  return DEFAULT_POOL_MAX;
}

export function getPool(): pg.Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const poolMax = getPoolMax();

  pool = new Pool({
    connectionString,
    max: poolMax,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 5000, // Query timeout of 5s max
    // Railway internal networking uses private network — rejectUnauthorized:false
    // is acceptable for internal connections. For external PG, use proper CA certs.
    ssl: connectionString.includes('railway.app')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  pool.on('error', err => {
    Logger.error('[DB] Unexpected pool error:', err);
  });

  pool.on('connect', () => {
    Logger.debug('[Pool] New client connected');
  });

  pool.on('remove', () => {
    Logger.debug('[Pool] Client removed from pool');
  });

  // Pool health monitoring — log warnings when pool usage is high
  const monitoredPool = pool;
  setInterval(() => {
    const now = Date.now();
    const total = monitoredPool.totalCount;
    const idle = monitoredPool.idleCount;
    const waiting = monitoredPool.waitingCount;
    const active = total - idle;
    const usage = total > 0 ? active / total : 0;

    if (
      usage > POOL_USAGE_WARN_THRESHOLD &&
      now - lastPoolWarningAt > POOL_WARNING_COOLDOWN_MS
    ) {
      Logger.warn(
        `[Pool] High usage: ${active}/${total} active, ${waiting} waiting (${Math.round(usage * 100)}%)`
      );
      lastPoolWarningAt = now;
    }
    if (waiting > 0 && now - lastPoolWarningAt > POOL_WARNING_COOLDOWN_MS) {
      Logger.warn(`[Pool] ${waiting} queries waiting for connection`);
      lastPoolWarningAt = now;
    }
  }, POOL_CHECK_INTERVAL_MS).unref();

  Logger.info(`✅ PostgreSQL connection pool created (max: ${poolMax})`);
  return pool;
}

/**
 * Helper for parameterized queries with logging on error.
 */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const p = getPool();
  try {
    return await p.query<T>(text, params);
  } catch (error) {
    const now = Date.now();
    if (now - lastQueryErrorLogAt > DB_ERROR_LOG_COOLDOWN_MS) {
      Logger.error('[DB] Query error:', { text: text.slice(0, 120), error });
      lastQueryErrorLogAt = now;
    } else {
      Logger.debug('[DB] Query error suppressed by cooldown', {
        text: text.slice(0, 120),
      });
    }
    throw error;
  }
}

/**
 * Shut down the pool gracefully.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    Logger.info('[DB] Pool closed');
  }
}
