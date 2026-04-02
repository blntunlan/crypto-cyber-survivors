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
    max: 5, // Aggregator needs fewer connections than the API server
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: connectionString.includes('railway.app')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  pool.on('error', err => {
    Logger.error('[DB] Unexpected pool error:', err);
  });

  Logger.info('✅ PostgreSQL connection pool created (max: 5)');
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
