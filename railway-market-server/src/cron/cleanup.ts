/**
 * Cleanup Cron Job
 *
 * Eski price_logs kayıtlarını siler (30 günden eski)
 * Her gün saat 02:00'de çalışır (UTC)
 */

import { SupabaseService } from '../services/supabaseService';
import { Logger } from '../utils/logger';

const RETENTION_DAYS = 30;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 saat
const BATCH_SIZE = 10000; // Bir seferde silinecek maksimum kayıt

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

    Logger.info(`[Cleanup] Starting cleanup cron (retention: ${RETENTION_DAYS} days)`);

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
      cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
      const cutoffISO = cutoffDate.toISOString();

      Logger.info(`[Cleanup] Starting cleanup for records older than ${cutoffISO}`);

      // Batch deletion loop
      let deletedInBatch = 0;
      let iterations = 0;
      const maxIterations = 100; // Safety limit

      do {
        // Get IDs to delete (batch)
        const { data: toDelete, error: selectError } = await supabase
          .from('price_logs')
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

        // Delete batch
        const { error: deleteError } = await supabase.from('price_logs').delete().in('id', ids);

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

      Logger.info(`[Cleanup] Completed: ${totalDeleted} records deleted in ${duration}ms`);

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
      retentionDays: RETENTION_DAYS,
      intervalHours: CLEANUP_INTERVAL_MS / (60 * 60 * 1000),
    };
  }
}

export interface CleanupStats {
  isRunning: boolean;
  lastCleanup: string | null;
  totalDeleted: number;
  retentionDays: number;
  intervalHours: number;
}
