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
  private static inFlightReports = 0;
  private static readonly maxInFlightReports = 2;
  private static readonly failureCooldownMs = 30_000;
  private static readonly failureLogCooldownMs = 60_000;
  private static failureCooldownUntil = 0;
  private static lastFailureLogAt = 0;

  static setQueryFn(fn: QueryFn): void {
    this.queryFn = fn;
  }

  static async report(options: ErrorReportOptions): Promise<void> {
    const { type, message, stack, severity = 'high', context = {} } = options;
    const now = Date.now();

    try {
      if (!this.queryFn) {
        Logger.warn('[ErrorReporter] No query function set, logging only:', message);
        return;
      }

      if (now < this.failureCooldownUntil) {
        Logger.debug('[ErrorReporter] Report suppressed during DB failure cooldown', {
          type,
          severity,
        });
        return;
      }

      if (this.inFlightReports >= this.maxInFlightReports) {
        Logger.debug(
          '[ErrorReporter] Report suppressed because reporter is saturated',
          {
            type,
            severity,
            inFlightReports: this.inFlightReports,
          }
        );
        return;
      }

      this.inFlightReports++;
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
      this.failureCooldownUntil = Date.now() + this.failureCooldownMs;
      if (Date.now() - this.lastFailureLogAt > this.failureLogCooldownMs) {
        Logger.error(
          '[ErrorReporter] DB write failed; suppressing reports briefly:',
          err
        );
        this.lastFailureLogAt = Date.now();
      } else {
        Logger.debug('[ErrorReporter] DB write failure suppressed by cooldown');
      }
    } finally {
      if (this.inFlightReports > 0) {
        this.inFlightReports--;
      }
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
