import pg from 'pg';
import { Logger } from '../utils/logger';

const { Pool } = pg;

let pool: pg.Pool | null = null;

const DEFAULT_POOL_MAX = 10;

/**
 * Per-connection statement timeout applied by node-pg at connect time.
 * Long-running maintenance work (migrations, MV refresh, cleanup batches)
 * raises its own SET statement_timeout on a dedicated client and must SET
 * back to this value before releasing (RESET would fall back to the server
 * default of 0 = unlimited, not this pool default).
 */
export const POOL_STATEMENT_TIMEOUT_MS = 30_000;

export function getPoolMax(): number {
  const configured = Number(process.env.PG_POOL_MAX);
  if (Number.isInteger(configured) && configured > 0) {
    return configured;
  }
  return DEFAULT_POOL_MAX;
}

/**
 * SSL selection. Explicit override via DATABASE_SSL (or PGSSLMODE):
 *   disable | require (no cert verification) | verify-full.
 * Default heuristic: Railway's private network (*.railway.internal) needs no
 * TLS; public endpoints (legacy *.railway.app, *.proxy.rlwy.net) get TLS
 * without CA verification (Railway serves self-signed certs).
 */
export function resolveSsl(
  connectionString: string
): { rejectUnauthorized: boolean } | undefined {
  const mode = (process.env.DATABASE_SSL ?? process.env.PGSSLMODE ?? '').toLowerCase();
  if (mode === 'disable') return undefined;
  if (mode === 'require' || mode === 'no-verify') return { rejectUnauthorized: false };
  if (mode === 'verify-full') return { rejectUnauthorized: true };

  if (connectionString.includes('.railway.internal')) return undefined;
  if (connectionString.includes('railway.app') || connectionString.includes('rlwy.net')) {
    return { rejectUnauthorized: false };
  }
  return undefined;
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
    // Backstop against runaway queries holding connections indefinitely.
    // Crons that legitimately run longer (MV refresh, cleanup batches) use a
    // dedicated client and SET their own timeout.
    statement_timeout: POOL_STATEMENT_TIMEOUT_MS,
    ssl: resolveSsl(connectionString),
  });

  pool.on('error', (err) => {
    Logger.error('[DB] Unexpected pool error:', err);
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

  Logger.info(`✅ PostgreSQL connection pool created (max: ${poolMax})`);
  return pool;
}

// Mutating SQL functions invoked via SELECT in this codebase — never retry these.
const MUTATING_FN_PATTERN = /\b(purchase_|transfer_|cleanup_old_|prune_|handle_new_)/i;

/**
 * Only pure reads are safe to re-execute blind: connection-error codes like
 * 57P01/08006 can arrive AFTER the server committed the statement, so a
 * retried INSERT/UPDATE (ledger entries, wallets) could apply twice.
 */
export function isRetriableStatement(text: string): boolean {
  return /^\s*select\b/i.test(text) && !MUTATING_FN_PATTERN.test(text);
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
    // Retry once on connection errors (pool exhaustion, transient disconnect),
    // but only for statements that are safe to double-execute.
    const code = (error as { code?: string }).code;
    if (
      (code === 'ECONNREFUSED' || code === '57P01' || code === '08006') &&
      isRetriableStatement(text)
    ) {
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
