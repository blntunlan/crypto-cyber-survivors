/**
 * Leaderboard Refresh Cron
 *
 * Keeps the materialized leaderboard views (v_leaderboard, v_leaderboard_by_pair)
 * fresh so the public leaderboard read stays an indexed scan of a one-row-per-player
 * table instead of re-aggregating all verified sessions on every request.
 *
 * REFRESH ... CONCURRENTLY needs a UNIQUE index (migration 012 adds one) and must
 * run OUTSIDE a transaction — db.execute() issues each statement in autocommit, so
 * reads are never blocked during a refresh.
 *
 * Interval is configurable via LEADERBOARD_REFRESH_MS (min 30s, default 2 min).
 */
import { getPool, POOL_STATEMENT_TIMEOUT_MS } from '../db/pool';
import { Logger } from '../utils/logger';

const DEFAULT_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const MIN_INTERVAL_MS = 30_000;
const FIRST_RUN_DELAY_MS = 30_000;

// Cross-instance guard: extra replicas skip the refresh instead of queueing
// duplicate REFRESH ... CONCURRENTLY runs on the same MV lock.
const LEADERBOARD_REFRESH_LOCK_KEY = 771003;

export function getRefreshIntervalMs(): number {
  const configured = Number(process.env.LEADERBOARD_REFRESH_MS);
  if (Number.isInteger(configured) && configured >= MIN_INTERVAL_MS) {
    return configured;
  }
  return DEFAULT_INTERVAL_MS;
}

export class LeaderboardRefreshCron {
  private static instance: LeaderboardRefreshCron | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastRefresh: Date | null = null;

  private constructor() {}

  static getInstance(): LeaderboardRefreshCron {
    return (LeaderboardRefreshCron.instance ??= new LeaderboardRefreshCron());
  }

  start(): void {
    if (this.intervalId) {
      Logger.warn('[LeaderboardRefresh] Already running');
      return;
    }

    const intervalMs = getRefreshIntervalMs();

    // First refresh shortly after boot (give migrations/connections a moment),
    // then on the configured interval.
    setTimeout(() => void this.refresh(), FIRST_RUN_DELAY_MS);
    this.intervalId = setInterval(() => void this.refresh(), intervalMs);
    this.intervalId.unref(); // don't keep the process alive for this timer

    Logger.info(
      `[LeaderboardRefresh] Scheduled — every ${Math.round(intervalMs / 1000)}s`
    );
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      Logger.info('[LeaderboardRefresh] Stopped');
    }
  }

  async refresh(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    const startTime = Date.now();

    // Dedicated client: the advisory lock is session-scoped, and REFRESH ...
    // CONCURRENTLY must run outside a transaction (plain query = autocommit).
    const client = await getPool().connect();
    try {
      const lockResult = await client.query<{ locked: boolean }>(
        'SELECT pg_try_advisory_lock($1) AS locked',
        [LEADERBOARD_REFRESH_LOCK_KEY]
      );
      if (!lockResult.rows[0]?.locked) {
        Logger.debug('[LeaderboardRefresh] Skipped — another instance is refreshing');
        return;
      }

      // MV refresh can legitimately outlive the pool's general statement_timeout
      await client.query(`SET statement_timeout = '120s'`);

      // CONCURRENTLY → does not take an AccessExclusiveLock, so leaderboard reads
      // keep serving the previous snapshot while the refresh runs.
      await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY v_leaderboard');
      await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY v_leaderboard_by_pair');
      this.lastRefresh = new Date();
      Logger.debug(`[LeaderboardRefresh] Refreshed in ${Date.now() - startTime}ms`);
    } catch (error) {
      // Views may not exist yet (pre-migration) — log and try again on the
      // next tick rather than crashing the timer.
      Logger.debug('[LeaderboardRefresh] Refresh skipped/failed:', error);
    } finally {
      // Restore the pool default (RESET would fall back to server unlimited)
      await client
        .query(`SET statement_timeout = ${POOL_STATEMENT_TIMEOUT_MS}`)
        .catch(() => undefined);
      await client
        .query('SELECT pg_advisory_unlock($1)', [LEADERBOARD_REFRESH_LOCK_KEY])
        .catch(() => undefined);
      client.release();
      this.isRunning = false;
    }
  }

  getStats(): { isRunning: boolean; lastRefresh: string | null; intervalMs: number } {
    return {
      isRunning: this.isRunning,
      lastRefresh: this.lastRefresh?.toISOString() ?? null,
      intervalMs: getRefreshIntervalMs(),
    };
  }
}
