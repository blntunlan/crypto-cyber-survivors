/// <reference types="vite/client" />
/* eslint-disable no-console */
/**
 * Logger - Centralized Logging Service
 *
 * Provides structured logging with different levels.
 * Debug logs only show in development mode.
 *
 * Implements observer pattern for error reporting to avoid circular dependencies.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

export type ErrorListener = (
  message: string,
  error?: unknown,
  data?: Record<string, unknown>
) => void;

class LoggerClass {
  private static instance: LoggerClass | null = null;
  private isDev: boolean;
  private logs: LogEntry[] = [];
  private maxLogs = 100;
  private errorListeners: Set<ErrorListener> = new Set();

  private constructor() {
    this.isDev =
      typeof process !== 'undefined' && process.env.NODE_ENV === 'test'
        ? true
        : import.meta.env.DEV;
  }

  static getInstance(): LoggerClass {
    return (LoggerClass.instance ??= new LoggerClass());
  }

  /**
   * Register a listener for error events.
   * Usage: ErrorTracker subscribes here to capture logs without Logger importing it.
   */
  onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  private createEntry(level: LogLevel, message: string, data?: unknown): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };
  }

  private store(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  private formatMessage(entry: LogEntry): string {
    return `[${entry.timestamp.split('T')[1]?.split('.')[0] ?? ''}] [${entry.level.toUpperCase()}] ${entry.message}`;
  }

  /**
   * Debug - Only shows in development
   */
  debug(message: string, data?: unknown): void {
    if (!this.isDev) return;

    const entry = this.createEntry('debug', message, data);
    this.store(entry);

    if (data !== undefined) {
      console.log(`🔍 ${this.formatMessage(entry)}`, data);
    } else {
      console.log(`🔍 ${this.formatMessage(entry)}`);
    }
  }

  /**
   * Info - General information
   */
  info(message: string, data?: unknown): void {
    const entry = this.createEntry('info', message, data);
    this.store(entry);

    if (this.isDev) {
      if (data !== undefined) {
        console.log(`ℹ️ ${this.formatMessage(entry)}`, data);
      } else {
        console.log(`ℹ️ ${this.formatMessage(entry)}`);
      }
    }
  }

  /**
   * Warn - Warning messages
   */
  warn(message: string, data?: unknown): void {
    const entry = this.createEntry('warn', message, data);
    this.store(entry);

    if (data !== undefined) {
      console.warn(`⚠️ ${this.formatMessage(entry)}`, data);
    } else {
      console.warn(`⚠️ ${this.formatMessage(entry)}`);
    }
  }

  /**
   * Security - Anti-cheat and audit messages
   */
  security(message: string, data?: unknown): void {
    const entry = this.createEntry('warn', `[SECURITY] ${message}`, data);
    this.store(entry);
    console.warn(`🛡️ ${this.formatMessage(entry)}`, data);
  }

  /**
   * Error - Error messages
   */
  error(message: string, error?: unknown, data?: Record<string, unknown>): void {
    const entry = this.createEntry('error', message, error);
    this.store(entry);

    if (error !== undefined) {
      console.error(`❌ ${this.formatMessage(entry)}`, error);
    } else {
      console.error(`❌ ${this.formatMessage(entry)}`);
    }

    // Notify listeners (e.g. ErrorTracker)
    // Wrap in try-catch to prevent listener errors from breaking logging
    this.errorListeners.forEach(listener => {
      try {
        listener(message, error, data);
      } catch (err) {
        console.error('Failed to notify error listener:', err);
      }
    });
  }

  /**
   * Game event logging
   */
  gameEvent(event: string, data?: Record<string, unknown>): void {
    this.debug(`[GAME] ${event}`, data);
  }

  /**
   * Performance logging
   */
  perf(label: string, durationMs: number): void {
    if (durationMs > 16.67) {
      // Frame drop threshold
      this.warn(`[PERF] ${label}: ${durationMs.toFixed(2)}ms (frame drop)`);
    } else if (this.isDev) {
      this.debug(`[PERF] ${label}: ${durationMs.toFixed(2)}ms`);
    }
  }

  /**
   * Get recent logs (for debugging UI)
   */
  getRecentLogs(count = 20): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }
}

// Export singleton
export const Logger = LoggerClass.getInstance();
