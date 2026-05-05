import pg from 'pg';
import { Logger } from '../utils/logger';

const { Pool } = pg;

// Transient connection error codes that warrant a retry
const TRANSIENT_ERROR_CODES = new Set([
  'ECONNREFUSED',  // TCP connection refused
  'ECONNRESET',    // Connection reset by peer
  'ETIMEDOUT',     // Connection timed out
  '08006',         // connection_failure
  '08001',         // sqlclient_unable_to_establish_sqlconnection
  '08004',         // sqlserver_rejected_establishment_of_sqlconnection
  '57P01',         // admin_shutdown
  '57P02',         // crash_shutdown
  '57P03',         // cannot_connect_now (connection terminated unexpectedly)
]);

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    // Railway internal networking uses private network — rejectUnauthorized:false
    // is acceptable for internal connections. For external PG, use proper CA certs.
    ssl: connectionString.includes('railway.app')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  pool.on('error', (err: NodeJS.ErrnoException) => {
    const code = (err as { code?: string }).code;
    if (code && TRANSIENT_ERROR_CODES.has(code)) {
      // Log transient errors at warn level — the pool will recover automatically
      Logger.warn('[DB] Transient pool error (will recover):', { code, message: err.message });
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

    if (usage > 0.8) {
      Logger.warn(`[Pool] High usage: ${active}/${total} active, ${waiting} waiting (${Math.round(usage * 100)}%)`);
    }
    if (waiting > 0) {
      Logger.warn(`[Pool] ${waiting} queries waiting for connection`);
    }
  }, POOL_CHECK_INTERVAL).unref(); // .unref() so it doesn't prevent process exit

  Logger.info('✅ PostgreSQL connection pool created');
  return pool;
}

/**
 * Validate that the pool can reach the database with a lightweight ping.
 * Returns true if healthy, false otherwise.
 */
export async function checkPoolHealth(): Promise<boolean> {
  try {
    const p = getPool();
    await p.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper for parameterized queries with exponential-backoff retry on transient errors.
 */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const p = getPool();
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 200;

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await p.query<T>(text, params);
    } catch (error) {
      lastError = error;
      const code = (error as { code?: string }).code ?? '';
      const isTransient = TRANSIENT_ERROR_CODES.has(code);

      if (!isTransient || attempt === MAX_RETRIES) {
        if (!isTransient) {
          Logger.error('[DB] Query error:', { text: text.slice(0, 120), error });
        } else {
          Logger.error('[DB] Query failed after retries:', { text: text.slice(0, 120), attempts: attempt + 1, error });
        }
        throw error;
      }

      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      Logger.warn('[DB] Transient connection error, retrying...', { code, attempt: attempt + 1, delayMs: delay });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
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
