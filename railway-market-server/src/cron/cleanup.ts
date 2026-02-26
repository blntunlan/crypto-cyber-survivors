/**
 * Cleanup Cron Job
 *
 * Eski price_history kayıtlarını siler (24 saatten eski)
 * Periyodik olarak küçük batch'lerle çalışır
 */

import { SupabaseService } from '../services/supabaseService';
import { Logger } from '../utils/logger';

const RETENTION_HOURS = 24;
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours (more frequent for smaller buffer)
const BATCH_SIZE = 5000; // Slightly smaller batches for performance

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

  /**
   * Cron job'ı başlat
   */
  start(): void {
    if (this.intervalId) {
      Logger.warn('[Cleanup] Already running');
      return;
    }

    Logger.info(
      `[Cleanup] Starting cleanup cron (retention: ${RETENTION_HOURS} hours)`
    );

    // İlk çalıştırma - 1 dakika sonra (startup için bekle)
    setTimeout(() => {
      void this.runCleanup();
    }, 60 * 1000);

    // Sonraki çalıştırmalar - her 6 saatte bir
    this.intervalId = setInterval(() => {
      void this.runCleanup();
    }, CLEANUP_INTERVAL_MS);

    Logger.info('[Cleanup] Cron scheduled - runs every 6 hours');
  }

  /**
   * Cron job'ı durdur
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      Logger.info('[Cleanup] Cron stopped');
    }
  }

  /**
   * Cleanup işlemini çalıştır
   */
  async runCleanup(): Promise<{ deleted: number; error?: string }> {
    if (this.isRunning) {
      Logger.warn('[Cleanup] Already running, skipping...');
      return { deleted: 0, error: 'Already running' };
    }

    this.isRunning = true;
    const startTime = Date.now();
    let totalDeleted = 0;

    try {
      const supabase = SupabaseService.getInstance().getClient();
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - RETENTION_HOURS);
      const cutoffISO = cutoffDate.toISOString();

      Logger.info(`[Cleanup] Starting cleanup for records older than ${cutoffISO}`);

      // Batch deletion loop (database-side deletion for fewer round-trips)
      let deletedInBatch = 0;
      let iterations = 0;
      const maxIterations = 100; // Safety limit

      do {
        const { data: deletedCount, error: cleanupError } = await supabase.rpc(
          'cleanup_old_price_history',
          {
            p_cutoff: cutoffISO,
            p_batch_size: BATCH_SIZE,
          }
        );

        if (cleanupError) {
          throw cleanupError;
        }

        deletedInBatch = Number(deletedCount ?? 0);
        if (!Number.isFinite(deletedInBatch) || deletedInBatch < 0) {
          throw new Error(
            `[Cleanup] Unexpected cleanup_old_price_history result: ${String(deletedCount)}`
          );
        }

        if (deletedInBatch === 0) {
          break;
        }

        totalDeleted += deletedInBatch;
        iterations++;

        Logger.debug(
          `[Cleanup] Deleted batch of ${deletedInBatch} records (total: ${totalDeleted})`
        );

        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      } while (deletedInBatch === BATCH_SIZE && iterations < maxIterations);

      const duration = Date.now() - startTime;
      this.lastCleanup = new Date();
      this.totalDeleted += totalDeleted;

      Logger.info(
        `[Cleanup] Completed: ${totalDeleted} records deleted in ${duration}ms`
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

  /**
   * Stats endpoint için bilgi
   */
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
