/**
 * Retention Cleanup Cron — owned by the API server.
 *
 * The API server owns the schema, so it also owns data retention. (Until
 * 2026-07 this cron only existed in the aggregator, meaning retention for
 * seven server-owned tables silently depended on the aggregator being up.)
 *
 * Design:
 * - pg_try_advisory_lock guards each run, so extra replicas (or a transition
 *   window where the aggregator still runs its old copy) never double-delete.
 * - Every step is independently try/caught — one failing table cannot starve
 *   the others of retention.
 * - Runs on a dedicated client with statement_timeout=60s (the pool default
 *   is tighter and would kill large batched deletes on JSONB-heavy tables).
 * - price_history retention is 72h (not the 24h the aggregator used):
 *   /sessions/verify reconciles rewards against price_history, and sessions
 *   can legitimately be verified well after creation — short retention
 *   silently disables the anti-cheat cross-check (price_check='skipped').
 */

import { type PoolClient } from 'pg';
import { getPool, POOL_STATEMENT_TIMEOUT_MS } from '../db/pool';
import { Logger } from '../utils/logger';

const CLEANUP_LOCK_KEY = 771002;
const PRICE_HISTORY_RETENTION_HOURS = 72;
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const FIRST_RUN_DELAY_MS = 60 * 1000;
const BATCH_SIZE = 5000;
const MAX_BATCH_ITERATIONS = 100;
const BATCH_PAUSE_MS = 100;

type CleanupStep = {
  /** Table label for logs/stats */
  name: string;
  /** SQL calling the cleanup function; must alias the result as n */
  call: string;
  params: () => unknown[];
  /** High-volume tables loop until a batch comes back short */
  loop?: boolean;
};

const STEPS: CleanupStep[] = [
  {
    name: 'price_history',
    call: 'SELECT cleanup_old_price_history($1::timestamptz, $2) AS n',
    params: () => [
      new Date(
        Date.now() - PRICE_HISTORY_RETENTION_HOURS * 60 * 60 * 1000
      ).toISOString(),
      BATCH_SIZE,
    ],
    loop: true,
  },
  {
    name: 'error_reports',
    call: 'SELECT cleanup_old_error_reports($1, $2) AS n',
    params: () => [30, BATCH_SIZE],
  },
  {
    name: 'performance_metrics',
    call: 'SELECT cleanup_old_performance_metrics($1, $2) AS n',
    params: () => [30, BATCH_SIZE],
  },
  {
    name: 'cheat_attempts',
    call: 'SELECT cleanup_old_cheat_attempts($1, $2) AS n',
    params: () => [60, BATCH_SIZE],
  },
  {
    name: 'market_runtime_audit',
    call: 'SELECT cleanup_old_market_runtime_audit($1, $2) AS n',
    params: () => [30, BATCH_SIZE],
    loop: true,
  },
  {
    name: 'audit_events',
    call: 'SELECT cleanup_old_audit_events($1, $2) AS n',
    params: () => [90, BATCH_SIZE],
  },
  {
    name: 'product_telemetry_events',
    call: 'SELECT cleanup_old_product_telemetry_events($1, $2) AS n',
    params: () => [365, BATCH_SIZE],
  },
  {
    name: 'audit_log',
    call: 'SELECT cleanup_old_audit_logs($1, $2) AS n',
    params: () => [90, BATCH_SIZE],
  },
];

export class CleanupCron {
  private static instance: CleanupCron | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastCleanup: Date | null = null;
  private totalDeleted = 0;

  private constructor() {}

  static getInstance(): CleanupCron {
    return (CleanupCron.instance ??= new CleanupCron());
  }

  start(): void {
    if (this.intervalId) {
      Logger.warn('[Cleanup] Already running');
      return;
    }

    setTimeout(() => void this.runCleanup(), FIRST_RUN_DELAY_MS);
    this.intervalId = setInterval(() => void this.runCleanup(), CLEANUP_INTERVAL_MS);
    this.intervalId.unref(); // don't keep the process alive for this timer

    Logger.info(
      `[Cleanup] Scheduled — every ${CLEANUP_INTERVAL_MS / (60 * 60 * 1000)}h, price_history retention ${PRICE_HISTORY_RETENTION_HOURS}h`
    );
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      Logger.info('[Cleanup] Stopped');
    }
  }

  async runCleanup(): Promise<{ deleted: number; skipped?: string; error?: string }> {
    if (this.isRunning) {
      return { deleted: 0, skipped: 'already running in this process' };
    }
    this.isRunning = true;
    const startTime = Date.now();
    let totalDeleted = 0;

    const client = await getPool().connect();
    try {
      const lockResult = await client.query<{ locked: boolean }>(
        'SELECT pg_try_advisory_lock($1) AS locked',
        [CLEANUP_LOCK_KEY]
      );
      if (!lockResult.rows[0]?.locked) {
        Logger.info('[Cleanup] Skipped — another instance holds the cleanup lock');
        return { deleted: 0, skipped: 'lock held elsewhere' };
      }

      // Batched deletes on JSONB-heavy tables can exceed the pool default
      await client.query(`SET statement_timeout = '60s'`);

      for (const step of STEPS) {
        try {
          const deleted = await this.runStep(client, step);
          if (deleted > 0) {
            totalDeleted += deleted;
            Logger.info(`[Cleanup] Deleted ${deleted} old ${step.name} records`);
          }
        } catch (error) {
          // Keep going: one table's failure must not starve the others
          Logger.warn(`[Cleanup] Step ${step.name} failed:`, error);
        }
      }

      this.lastCleanup = new Date();
      this.totalDeleted += totalDeleted;
      Logger.info(
        `[Cleanup] Completed: ${totalDeleted} records deleted in ${Date.now() - startTime}ms`
      );
      return { deleted: totalDeleted };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      Logger.error('[Cleanup] Failed:', error);
      return { deleted: totalDeleted, error: errorMsg };
    } finally {
      // The client returns to the pool — restore the pool default (RESET
      // would fall back to the server default of unlimited)
      await client
        .query(`SET statement_timeout = ${POOL_STATEMENT_TIMEOUT_MS}`)
        .catch(() => undefined);
      await client
        .query('SELECT pg_advisory_unlock($1)', [CLEANUP_LOCK_KEY])
        .catch(() => undefined);
      client.release();
      this.isRunning = false;
    }
  }

  private async runStep(client: PoolClient, step: CleanupStep): Promise<number> {
    let total = 0;
    let iterations = 0;
    let deletedInBatch = 0;

    do {
      const result = await client.query<{ n: string | number }>(
        step.call,
        step.params()
      );
      const count = Number(result.rows[0]?.n ?? 0);
      deletedInBatch = Number.isFinite(count) && count >= 0 ? count : 0;
      total += deletedInBatch;
      iterations++;
      if (step.loop && deletedInBatch === BATCH_SIZE) {
        await new Promise(resolve => setTimeout(resolve, BATCH_PAUSE_MS));
      }
    } while (
      step.loop &&
      deletedInBatch === BATCH_SIZE &&
      iterations < MAX_BATCH_ITERATIONS
    );

    return total;
  }

  getStats(): CleanupStats {
    return {
      isRunning: this.isRunning,
      lastCleanup: this.lastCleanup?.toISOString() ?? null,
      totalDeleted: this.totalDeleted,
      retentionHours: PRICE_HISTORY_RETENTION_HOURS,
      intervalHours: CLEANUP_INTERVAL_MS / (60 * 60 * 1000),
    };
  }
}

export interface CleanupStats {
  isRunning: boolean;
  lastCleanup: string | null;
  totalDeleted: number;
  retentionHours: number;
  intervalHours: number;
}
