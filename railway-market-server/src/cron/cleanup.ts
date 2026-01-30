/**
 * Cleanup Cron Job
 *
 * Eski price_logs kayıtlarını siler (30 günden eski)
 * Her gün saat 02:00'de çalışır (UTC)
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

    // Sonraki çalıştırmalar - her 24 saatte bir
    this.intervalId = setInterval(() => {
      void this.runCleanup();
    }, CLEANUP_INTERVAL_MS);

    Logger.info('[Cleanup] Cron scheduled - runs every 24 hours');
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

      // Batch deletion loop
      let deletedInBatch = 0;
      let iterations = 0;
      const maxIterations = 100; // Safety limit

      do {
        // Get IDs to delete (batch) - Updated to price_history
        const { data: toDelete, error: selectError } = await supabase
          .from('price_history')
          .select('id')
          .lt('timestamp', cutoffISO)
          .limit(BATCH_SIZE);

        if (selectError) {
          throw selectError;
        }

        if (toDelete.length === 0) {
          break;
        }

        const ids = toDelete.map(row => row.id);

        // Delete batch - Updated to price_history
        const { error: deleteError } = await supabase
          .from('price_history')
          .delete()
          .in('id', ids);

        if (deleteError) {
          throw deleteError;
        }

        deletedInBatch = ids.length;
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
