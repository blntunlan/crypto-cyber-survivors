/**
 * Cleanup Cron Job
 *
 * Eski price_history kayıtlarını siler (24 saatten eski)
 * Periyodik olarak küçük batch'lerle çalışır
 */

import { sql } from 'drizzle-orm';
import { getDb } from '../db';
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

      const db = getDb();

      // 1. Price history (24h retention)
      let deletedInBatch = 0;
      let iterations = 0;
      const maxIterations = 100;

      do {
        const result = await db.execute(
          sql`SELECT cleanup_old_price_history(${cutoffISO}::timestamptz, ${BATCH_SIZE})`
        );

        const row = result.rows[0] as { cleanup_old_price_history?: string } | undefined;
        const deletedCount = Number(row?.cleanup_old_price_history ?? 0);
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
        const errResult = await db.execute(
          sql`SELECT cleanup_old_error_reports(30, ${BATCH_SIZE})`
        );
        const errRow = errResult.rows[0] as { cleanup_old_error_reports?: string } | undefined;
        const errDeleted = Number(errRow?.cleanup_old_error_reports ?? 0);
        if (errDeleted > 0) {
          totalDeleted += errDeleted;
          Logger.info(`[Cleanup] Deleted ${errDeleted} old error_reports`);
        }
      } catch {
        Logger.debug('[Cleanup] cleanup_old_error_reports function not yet available');
      }

      // 3. Performance metrics (30-day retention)
      try {
        const perfResult = await db.execute(
          sql`SELECT cleanup_old_performance_metrics(30, ${BATCH_SIZE})`
        );
        const perfRow = perfResult.rows[0] as { cleanup_old_performance_metrics?: string } | undefined;
        const perfDeleted = Number(perfRow?.cleanup_old_performance_metrics ?? 0);
        if (perfDeleted > 0) {
          totalDeleted += perfDeleted;
          Logger.info(`[Cleanup] Deleted ${perfDeleted} old performance_metrics`);
        }
      } catch {
        Logger.debug('[Cleanup] cleanup_old_performance_metrics function not yet available');
      }

      // 4. Cheat attempts (60-day retention)
      try {
        const cheatResult = await db.execute(
          sql`SELECT cleanup_old_cheat_attempts(60, ${BATCH_SIZE})`
        );
        const cheatRow = cheatResult.rows[0] as { cleanup_old_cheat_attempts?: string } | undefined;
        const cheatDeleted = Number(cheatRow?.cleanup_old_cheat_attempts ?? 0);
        if (cheatDeleted > 0) {
          totalDeleted += cheatDeleted;
          Logger.info(`[Cleanup] Deleted ${cheatDeleted} old cheat_attempts`);
        }
      } catch {
        Logger.debug('[Cleanup] cleanup_old_cheat_attempts function not yet available');
      }

      // 5. Market runtime audit (30-day retention, high volume → loop in batches)
      try {
        let mraDeleted = 0;
        let mraDeletedInBatch = 0;
        let mraIterations = 0;
        do {
          const mraResult = await db.execute(
            sql`SELECT cleanup_old_market_runtime_audit(30, ${BATCH_SIZE})`
          );
          const mraRow = mraResult.rows[0] as { cleanup_old_market_runtime_audit?: string } | undefined;
          const mraCount = Number(mraRow?.cleanup_old_market_runtime_audit ?? 0);
          mraDeletedInBatch = Number.isFinite(mraCount) && mraCount >= 0 ? mraCount : 0;
          if (mraDeletedInBatch === 0) break;
          mraDeleted += mraDeletedInBatch;
          mraIterations++;
          await new Promise(resolve => setTimeout(resolve, 100));
        } while (mraDeletedInBatch === BATCH_SIZE && mraIterations < maxIterations);
        if (mraDeleted > 0) {
          totalDeleted += mraDeleted;
          Logger.info(`[Cleanup] Deleted ${mraDeleted} old market_runtime_audit records`);
        }
      } catch {
        Logger.debug('[Cleanup] cleanup_old_market_runtime_audit function not yet available');
      }

      // 6. Audit events (90-day retention)
      try {
        const auditEvResult = await db.execute(
          sql`SELECT cleanup_old_audit_events(90, ${BATCH_SIZE})`
        );
        const auditEvRow = auditEvResult.rows[0] as { cleanup_old_audit_events?: string } | undefined;
        const auditEvDeleted = Number(auditEvRow?.cleanup_old_audit_events ?? 0);
        if (auditEvDeleted > 0) {
          totalDeleted += auditEvDeleted;
          Logger.info(`[Cleanup] Deleted ${auditEvDeleted} old audit_events`);
        }
      } catch {
        Logger.debug('[Cleanup] cleanup_old_audit_events function not yet available');
      }

      // 7. Product telemetry events (365-day retention)
      try {
        const telemetryResult = await db.execute(
          sql`SELECT cleanup_old_product_telemetry_events(365, ${BATCH_SIZE})`
        );
        const telemetryRow = telemetryResult.rows[0] as { cleanup_old_product_telemetry_events?: string } | undefined;
        const telemetryDeleted = Number(telemetryRow?.cleanup_old_product_telemetry_events ?? 0);
        if (telemetryDeleted > 0) {
          totalDeleted += telemetryDeleted;
          Logger.info(`[Cleanup] Deleted ${telemetryDeleted} old product_telemetry_events`);
        }
      } catch {
        Logger.debug('[Cleanup] cleanup_old_product_telemetry_events function not yet available');
      }

      // 8. Audit logs (90-day retention)
      try {
        const auditResult = await db.execute(
          sql`SELECT cleanup_old_audit_logs(90, ${BATCH_SIZE})`
        );
        const auditRow = auditResult.rows[0] as { cleanup_old_audit_logs?: string } | undefined;
        const auditDeleted = Number(auditRow?.cleanup_old_audit_logs ?? 0);
        if (auditDeleted > 0) {
          totalDeleted += auditDeleted;
          Logger.info(`[Cleanup] Deleted ${auditDeleted} old audit_log records`);
        }
      } catch {
        Logger.debug('[Cleanup] cleanup_old_audit_logs function not yet available');
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
