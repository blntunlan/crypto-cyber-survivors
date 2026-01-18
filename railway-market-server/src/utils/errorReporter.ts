import { type SupabaseClient } from '@supabase/supabase-js';
import { Logger } from './logger';

export interface ErrorReportOptions {
  type: string;
  message: string;
  stack?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, unknown>;
}

export class ErrorReporter {
  private static serviceName = 'railway-market-server';
  private static client: SupabaseClient | null = null;

  /**
   * Set the client instance to avoid circular dependencies with SupabaseService
   */
  static setClient(client: SupabaseClient): void {
    this.client = client;
  }

  static async report(options: ErrorReportOptions): Promise<void> {
    const { type, message, stack, severity = 'high', context = {} } = options;

    try {
      if (!this.client) {
        Logger.warn('[ErrorReporter] No Supabase client set, logging only:', message);
        return;
      }

      const { error } = await this.client.from('error_reports').insert({
        error_type: type,
        error_message: message,
        stack_trace: stack,
        severity,
        category: 'server',
        url: this.serviceName,
        user_agent: `Node.js ${process.version}`,
        context: {
          ...context,
          server: this.serviceName,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
        },
        status: 'new',
        reported_at: new Date().toISOString(),
      });

      if (error) {
        // Log to console only, don't throw to avoid loops
        Logger.error(
          '[ErrorReporter] Failed to send error to Supabase:',
          error.message
        );
      }
    } catch (err) {
      Logger.error('[ErrorReporter] Critical failure in ErrorReporter:', err);
    }
  }

  static initGlobalHandlers(): void {
    process.on('uncaughtException', error => {
      Logger.error('UNCAUGHT EXCEPTION:', error);
      void this.report({
        type: 'UncaughtException',
        message: error.message,
        stack: error.stack,
        severity: 'critical',
      }).finally(() => {
        // Exit in case of critical error
        process.exit(1);
      });
    });

    process.on('unhandledRejection', reason => {
      const message = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : undefined;

      Logger.error('UNHANDLED REJECTION:', reason);
      void this.report({
        type: 'UnhandledRejection',
        message,
        stack,
        severity: 'high',
      });
    });

    Logger.info('✅ Global error handlers initialized');
  }
}
