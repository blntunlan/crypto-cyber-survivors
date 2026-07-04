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

type PoolUsageInput = Pick<pg.Pool, 'totalCount' | 'idleCount' | 'waitingCount'>;

export type PoolUsageSnapshot = {
  active: number;
  total: number;
  idle: number;
  waiting: number;
  capacityUsage: number;
  shouldWarn: boolean;
};

export function getPoolMax(): number {
  const configured = Number(process.env.PG_POOL_MAX);
  if (Number.isInteger(configured) && configured > 0) {
    return configured;
  }
  return DEFAULT_POOL_MAX;
}

export function getPoolUsageSnapshot(
  monitoredPool: PoolUsageInput,
  poolMax: number
): PoolUsageSnapshot {
  const total = monitoredPool.totalCount;
  const idle = monitoredPool.idleCount;
  const waiting = monitoredPool.waitingCount;
  const active = Math.max(total - idle, 0);
  const capacityUsage = poolMax > 0 ? active / poolMax : 0;

  return {
    active,
    total,
    idle,
    waiting,
    capacityUsage,
    shouldWarn: waiting > 0 || capacityUsage >= POOL_USAGE_WARN_THRESHOLD,
  };
}

/**
 * SSL selection (kept in sync with railway-market-server/src/db/pool.ts).
 * Explicit override via DATABASE_SSL (or PGSSLMODE): disable | require |
 * verify-full. Default heuristic: Railway's private network
 * (*.railway.internal) needs no TLS; public endpoints (legacy *.railway.app,
 * *.proxy.rlwy.net) get TLS without CA verification (self-signed certs).
 */
export function resolveSsl(
  connectionString: string
): { rejectUnauthorized: boolean } | undefined {
  const mode = (process.env.DATABASE_SSL ?? process.env.PGSSLMODE ?? '').toLowerCase();
  if (mode === 'disable') return undefined;
  if (mode === 'require' || mode === 'no-verify') return { rejectUnauthorized: false };
  if (mode === 'verify-full') return { rejectUnauthorized: true };

  if (connectionString.includes('.railway.internal')) return undefined;
  if (
    connectionString.includes('railway.app') ||
    connectionString.includes('rlwy.net')
  ) {
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
    statement_timeout: 5000, // Query timeout of 5s max
    ssl: resolveSsl(connectionString),
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
    const usage = getPoolUsageSnapshot(monitoredPool, poolMax);

    if (usage.shouldWarn && now - lastPoolWarningAt > POOL_WARNING_COOLDOWN_MS) {
      Logger.warn(
        `[Pool] High usage: ${usage.active}/${poolMax} capacity, ${usage.total} created, ${usage.idle} idle, ${usage.waiting} waiting (${Math.round(usage.capacityUsage * 100)}%)`
      );
      lastPoolWarningAt = now;
    }
    if (usage.waiting > 0 && now - lastPoolWarningAt > POOL_WARNING_COOLDOWN_MS) {
      Logger.warn(`[Pool] ${usage.waiting} queries waiting for connection`);
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
