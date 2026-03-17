/**
 * Cleanup Cron Job
 *
 * Eski price_history kayıtlarını siler (24 saatten eski)
 * Periyodik olarak küçük batch'lerle çalışır
 */

import { query } from '../db/pool';
import { Logger } from '../utils/logger';

const RETENTION_HOURS = 24;
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const BATCH_SIZE = 5000;

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

    Logger.info(
      `[Cleanup] Starting cleanup cron (retention: ${RETENTION_HOURS} hours)`
    );

    // İlk çalıştırma - 1 dakika sonra
    setTimeout(() => {
      void this.runCleanup();
    }, 60 * 1000);

    // Her 6 saatte bir
    this.intervalId = setInterval(() => {
      void this.runCleanup();
    }, CLEANUP_INTERVAL_MS);

    Logger.info('[Cleanup] Cron scheduled - runs every 6 hours');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      Logger.info('[Cleanup] Cron stopped');
    }
  }

  async runCleanup(): Promise<{ deleted: number; error?: string }> {
    if (this.isRunning) {
      Logger.warn('[Cleanup] Already running, skipping...');
      return { deleted: 0, error: 'Already running' };
    }

    this.isRunning = true;
    const startTime = Date.now();
    let totalDeleted = 0;

    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - RETENTION_HOURS);
      const cutoffISO = cutoffDate.toISOString();

      Logger.info(`[Cleanup] Starting cleanup for records older than ${cutoffISO}`);

      // 1. Price history (24h retention)
      let deletedInBatch = 0;
      let iterations = 0;
      const maxIterations = 100;

      do {
        const { rows } = await query<{ cleanup_old_price_history: string }>(
          `SELECT cleanup_old_price_history($1, $2)`,
          [cutoffISO, BATCH_SIZE]
        );

        const deletedCount = Number(rows[0]?.cleanup_old_price_history ?? 0);
        deletedInBatch = Number.isFinite(deletedCount) && deletedCount >= 0 ? deletedCount : 0;

        if (deletedInBatch === 0) break;

        totalDeleted += deletedInBatch;
        iterations++;

        Logger.debug(
          `[Cleanup] Deleted batch of ${deletedInBatch} price_history records (total: ${totalDeleted})`
        );

        await new Promise(resolve => setTimeout(resolve, 100));
      } while (deletedInBatch === BATCH_SIZE && iterations < maxIterations);

      // 2. Error reports (30-day retention)
      try {
        const { rows: errRows } = await query<{ cleanup_old_error_reports: string }>(
          `SELECT cleanup_old_error_reports(30, $1)`,
          [BATCH_SIZE]
        );
        const errDeleted = Number(errRows[0]?.cleanup_old_error_reports ?? 0);
        if (errDeleted > 0) {
          totalDeleted += errDeleted;
          Logger.info(`[Cleanup] Deleted ${errDeleted} old error_reports`);
        }
      } catch {
        Logger.debug('[Cleanup] cleanup_old_error_reports function not yet available');
      }

      // 3. Performance metrics (30-day retention)
      try {
        const { rows: perfRows } = await query<{ cleanup_old_performance_metrics: string }>(
          `SELECT cleanup_old_performance_metrics(30, $1)`,
          [BATCH_SIZE]
        );
        const perfDeleted = Number(perfRows[0]?.cleanup_old_performance_metrics ?? 0);
        if (perfDeleted > 0) {
          totalDeleted += perfDeleted;
          Logger.info(`[Cleanup] Deleted ${perfDeleted} old performance_metrics`);
        }
      } catch {
        Logger.debug('[Cleanup] cleanup_old_performance_metrics function not yet available');
      }

      // 4. Cheat attempts (60-day retention)
      try {
        const { rows: cheatRows } = await query<{ cleanup_old_cheat_attempts: string }>(
          `SELECT cleanup_old_cheat_attempts(60, $1)`,
          [BATCH_SIZE]
        );
        const cheatDeleted = Number(cheatRows[0]?.cleanup_old_cheat_attempts ?? 0);
        if (cheatDeleted > 0) {
          totalDeleted += cheatDeleted;
          Logger.info(`[Cleanup] Deleted ${cheatDeleted} old cheat_attempts`);
        }
      } catch {
        Logger.debug('[Cleanup] cleanup_old_cheat_attempts function not yet available');
      }

      const duration = Date.now() - startTime;
      this.lastCleanup = new Date();
      this.totalDeleted += totalDeleted;

      Logger.info(
        `[Cleanup] Completed: ${totalDeleted} total records deleted in ${duration}ms`
      );

      return { deleted: totalDeleted };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      Logger.error('[Cleanup] Failed:', error);
      return { deleted: totalDeleted, error: errorMsg };
    } finally {
      this.isRunning = false;
    }
  }

  getStats(): CleanupStats {
    return {
      isRunning: this.isRunning,
      lastCleanup: this.lastCleanup?.toISOString() ?? null,
      totalDeleted: this.totalDeleted,
      retentionHours: RETENTION_HOURS,
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
