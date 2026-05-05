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

  // Pool sizing: 20 connections handles ~5-10x more concurrent requests than
  // the default of 10 while staying well within Railway's PG connection limits.
  // Idle connections are released after 30 s to avoid holding slots unnecessarily.
  // connectionTimeoutMillis: fail fast (2 s) rather than queuing indefinitely —
  // callers receive a 503 instead of a silent hang under pool exhaustion.
  pool = new Pool({
    connectionString,
    max: 20,
    min: 2,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 2_000,
    // Railway internal networking uses private network — rejectUnauthorized:false
    // is acceptable for internal connections. For external PG, use proper CA certs.
    ssl: connectionString.includes('railway.app')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  pool.on('error', (err) => {
    const code = (err as { code?: string }).code;
    // Log pool exhaustion separately so it's easy to alert on
    if (code === '57P03' || err.message?.includes('timeout')) {
      Logger.error('[DB] Pool exhaustion / connection timeout:', err);
    } else {
      Logger.error('[DB] Unexpected pool error:', err);
    }
  });

  pool.on('connect', () => {
    Logger.info('[Pool] New client connected');
  });

  pool.on('remove', () => {
    Logger.info('[Pool] Client removed from pool');
  });

  // Pool health monitoring — log warnings when pool usage is high
  const POOL_CHECK_INTERVAL = 30_000; // 30 seconds
  const monitoredPool = pool;
  setInterval(() => {
    const total = monitoredPool.totalCount;
    const idle = monitoredPool.idleCount;
    const waiting = monitoredPool.waitingCount;
    const active = total - idle;
    const usage = total > 0 ? active / total : 0;

    // Always emit structured metrics so they can be scraped
    Logger.debug('[Pool] metrics', { total, idle, active, waiting, usagePct: Math.round(usage * 100) });

    if (usage > 0.8) {
      Logger.warn(`[Pool] High usage: ${active}/${total} active, ${waiting} waiting (${Math.round(usage * 100)}%)`);
    }
    if (waiting > 5) {
      Logger.warn(`[Pool] ${waiting} queries waiting for connection — consider increasing pool size`);
    } else if (waiting > 0) {
      Logger.warn(`[Pool] ${waiting} queries waiting for connection`);
    }
  }, POOL_CHECK_INTERVAL).unref(); // .unref() so it doesn't prevent process exit

  Logger.info('✅ PostgreSQL connection pool created');
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
    const code = (error as { code?: string }).code;
    const message = (error as Error).message ?? '';

    // Pool exhaustion: connection timeout waiting for a free slot.
    // Tag the error so callers can return 503 instead of 500.
    if (message.includes('timeout') && message.includes('pool')) {
      Logger.error('[DB] Pool exhausted — no connection available within timeout', {
        text: text.slice(0, 120),
        total: p.totalCount,
        waiting: p.waitingCount,
      });
      const exhausted = new Error('Database pool exhausted') as Error & { isPoolExhausted: boolean };
      exhausted.isPoolExhausted = true;
      throw exhausted;
    }

    // Retry once on transient connection errors (not pool exhaustion)
    if (code === 'ECONNREFUSED' || code === '57P01' || code === '08006') {
      Logger.warn('[DB] Connection error, retrying once...', { code });
      try {
        return await p.query<T>(text, params);
      } catch (retryError) {
        Logger.error('[DB] Retry also failed:', { text: text.slice(0, 120), error: retryError });
        throw retryError;
      }
    }

    Logger.error('[DB] Query error:', { text: text.slice(0, 120), error });
    throw error;
  }
}

/**
 * Execute multiple queries in a single transaction.
 * Automatically rolls back on error.
 */
export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    Logger.error('[DB] Transaction rolled back:', error);
    throw error;
  } finally {
    client.release();
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
