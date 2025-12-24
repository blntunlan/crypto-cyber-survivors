import { Logger } from '../Logger';
import { DeviceProfiler } from './DeviceProfiler';
import { UserSessionService } from '../auth/UserSessionService';

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
  context?: Record<string, unknown>;
  timestamp: number;
  playerId: string;
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
    const playerId = UserSessionService.getPlayerId();
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
      context: {
        ...context,
        url: window.location.href,
        gameState: (window as unknown as { GAME_STATE?: string }).GAME_STATE ?? 'UNKNOWN',
        browser: profile.userAgent,
        screen: `${profile.screenWidth}x${profile.screenHeight}`,
        gpu: profile.gpu,
      },
      timestamp: Date.now(),
      playerId,
      fingerprint,
    };

    Logger.error(`[ErrorReporter] Reporting ${type}: ${message}`, report);

    // Sync to Supabase
    const { supabase, isSupabaseConfigured } = await import('../supabase');
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('error_reports').insert({
          player_id: playerId,
          error_type: type,
          error_message: message,
          error_stack: stack,
          device_fingerprint: fingerprint,
          game_state: report.context?.gameState,
          browser: profile.userAgent.substring(0, 64),
          screen_resolution: report.context?.screen,
          context: report.context,
        });
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
