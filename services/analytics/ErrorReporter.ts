import { Logger } from '../system/Logger';
import { DeviceProfiler } from './DeviceProfiler';
import { UserSessionService } from '../auth/UserSessionService';
import { type Database, type Json } from '../../types/supabase';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorReport {
  message: string;
  stack?: string;
  type: string;
  severity: ErrorSeverity;
  category: string;
  context?: Record<string, unknown>;
  timestamp: number;
  profileId: string;
  fingerprint: string;
}

export class ErrorReporter {
  private static errorCounts = new Map<string, number>();
  private static lastReportTime = new Map<string, number>();

  /**
   * Report an error to Supabase.
   */
  static async report(
    error: Error | string,
    type: string = 'runtime',
    context: Record<string, unknown> = {}
  ): Promise<void> {
    const message = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;
    const profileId = UserSessionService.getProfileId();
    const fingerprint = DeviceProfiler.getFingerprint();

    const hash = `${type}:${message}`.substring(0, 100);

    // Deduplication logic
    if (!this.shouldReport(hash)) {
      return;
    }

    const profile = DeviceProfiler.getProfile();
    const report: ErrorReport = {
      message,
      stack,
      type,
      severity: this.inferSeverity(type, message),
      category: type, // Using type as category for now
      context: {
        ...context,
        url: window.location.href,
        gameState:
          (window as unknown as { GAME_STATE?: string }).GAME_STATE ?? 'UNKNOWN',
        browser: profile.userAgent,
        screen: `${profile.screenWidth}x${profile.screenHeight}`,
        gpu: profile.gpu,
      },
      timestamp: Date.now(),
      profileId,
      fingerprint,
    };

    Logger.error(`[ErrorReporter] Reporting ${type}: ${message}`, report);

    // Sync to Supabase
    const { supabase, isSupabaseConfigured } = await import('../core/Supabase');
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('error_reports').insert({
          profile_id: profileId.startsWith('anon_') ? null : profileId,
          error_type: type,
          message: message,
          stack_trace: stack,
          severity: report.severity,
          device_info: {
            fingerprint,
            userAgent: profile.userAgent,
            resolution: `${profile.screenWidth}x${profile.screenHeight}`,
            gpu: profile.gpu,
            language: navigator.language,
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            platform: navigator.platform,
          },
          context_data: {
            ...context,
            url: window.location.href,
            gameState:
              (window as unknown as { GAME_STATE?: string }).GAME_STATE ?? 'UNKNOWN',
          } as unknown as Json,
          created_at: new Date(report.timestamp).toISOString(),
          status: 'new',
        } as Database['public']['Tables']['error_reports']['Insert']);
      } catch (err) {
        // Fail silently to avoid infinite error loops
        console.error('[ErrorReporter] Failed to sync error to Supabase', err);
      }
    }
  }

  private static shouldReport(hash: string): boolean {
    const count = (this.errorCounts.get(hash) ?? 0) + 1;
    this.errorCounts.set(hash, count);

    const lastReport = this.lastReportTime.get(hash) ?? 0;
    const now = Date.now();

    // Report 1st, 10th, 100th... or if 1 minute has passed
    if (count === 1 || count === 10 || count === 100 || now - lastReport > 60000) {
      this.lastReportTime.set(hash, now);
      return true;
    }

    return false;
  }

  private static inferSeverity(type: string, message: string): ErrorSeverity {
    if (type === 'crash' || message.includes('fatal')) return ErrorSeverity.CRITICAL;
    if (type === 'network') return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  /**
   * Setup global error handlers.
   */
  static init(): void {
    window.addEventListener('error', event => {
      void this.report(event.error ?? event.message, 'unhandled_error');
    });

    window.addEventListener('unhandledrejection', event => {
      void this.report(event.reason, 'unhandled_promise');
    });

    Logger.info('[ErrorReporter] Initialized global handlers');
  }

  /**
   * Reset for testing purposes.
   */
  static resetForTesting(): void {
    this.errorCounts.clear();
    this.lastReportTime.clear();
  }
}
