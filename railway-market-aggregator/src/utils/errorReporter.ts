import { Logger } from './logger';
import type pg from 'pg';

export interface ErrorReportOptions {
  type: string;
  message: string;
  stack?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, unknown>;
}

type QueryFn = <T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
) => Promise<pg.QueryResult<T>>;

export class ErrorReporter {
  private static serviceName = 'railway-market-aggregator';
  private static queryFn: QueryFn | null = null;

  static setQueryFn(fn: QueryFn): void {
    this.queryFn = fn;
  }

  static async report(options: ErrorReportOptions): Promise<void> {
    const { type, message, stack, severity = 'high', context = {} } = options;

    try {
      if (!this.queryFn) {
        Logger.warn('[ErrorReporter] No query function set, logging only:', message);
        return;
      }

      await this.queryFn(
        `INSERT INTO error_reports (error_type, message, stack_trace, severity, category, page_url, browser_info, context_data, status)
         VALUES ($1, $2, $3, $4, 'server', $5, $6, $7, 'new')`,
        [
          type,
          message,
          stack ?? null,
          severity,
          this.serviceName,
          `Node.js ${process.version}`,
          JSON.stringify({
            ...context,
            server: this.serviceName,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
          }),
        ]
      );
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
