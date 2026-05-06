import pg from 'pg';
import { Logger } from '../utils/logger';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  pool = new Pool({
    connectionString,
    max: 30, // Increased for connection pooling
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
    Logger.info('[Pool] New client connected');
  });

  pool.on('remove', () => {
    Logger.info('[Pool] Client removed from pool');
  });

  // Pool health monitoring — log warnings when pool usage is high
  const POOL_CHECK_INTERVAL = 30_000;
  const monitoredPool = pool;
  setInterval(() => {
    const total = monitoredPool.totalCount;
    const idle = monitoredPool.idleCount;
    const waiting = monitoredPool.waitingCount;
    const active = total - idle;
    const usage = total > 0 ? active / total : 0;

    if (usage > 0.8) {
      Logger.warn(
        `[Pool] High usage: ${active}/${total} active, ${waiting} waiting (${Math.round(usage * 100)}%)`
      );
    }
    if (waiting > 0) {
      Logger.warn(`[Pool] ${waiting} queries waiting for connection`);
    }
  }, POOL_CHECK_INTERVAL).unref();

  Logger.info('✅ PostgreSQL connection pool created (max: 30)');
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
    Logger.error('[DB] Query error:', { text: text.slice(0, 120), error });
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
