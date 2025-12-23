/**
 * ErrorTracker - Enhanced Client-Side Error Tracking
 *
 * Features:
 * - Global error handler (window.onerror + unhandledrejection)
 * - Network error tracking with request/response details
 * - Performance issue detection
 * - Supabase integration for centralized logging
 * - Rate limiting & error deduplication
 * - Offline queue support with localStorage persistence
 * - Privacy-safe error sanitization
 * - User action breadcrumbs (last N actions before error)
 * - Error grouping by fingerprint
 * - Game state context capture
 * - Console error interception
 * - Resource loading error tracking
 */

import { Logger } from '../Logger';
import { supabase, isSupabaseConfigured } from '../supabase';
import { UserSessionService } from '../auth/UserSessionService';

// ============================================
// Types
// ============================================

type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
type ErrorCategory = 'runtime' | 'network' | 'performance' | 'resource' | 'console' | 'game' | 'ui';

interface Breadcrumb {
  timestamp: number;
  category: string;
  message: string;
  data?: Record<string, unknown>;
}

interface GameContext {
  gameStatus?: string;
  playerLevel?: number;
  playerHP?: number;
  survivalTimeMs?: number;
  cryptoPair?: string;
  position?: string;
  fps?: number;
}

interface ErrorReport {
  // Core
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;

  // Fingerprint for grouping
  fingerprint: string;

  // Environment
  userAgent: string;
  url: string;
  viewport: { width: number; height: number };

  // User context
  playerId?: string;
  sessionId?: string;
  deviceFingerprint?: string;
  nickname?: string;

  // Error context
  context?: Record<string, unknown>;
  breadcrumbs: Breadcrumb[];
  gameContext?: GameContext;

  // Timing
  reportedAt: string;
  sessionDurationMs?: number;

  // Tags for filtering
  tags: string[];
}

interface QueuedError {
  report: ErrorReport;
  retryCount: number;
}

// ============================================
// Constants
// ============================================

const STORAGE_KEY = 'error_tracker_queue';
const MAX_BREADCRUMBS = 25;
const RATE_LIMIT_MS = 30000; // 30 seconds per unique error
const MAX_QUEUE_SIZE = 100;
const BATCH_SIZE = 10;

// ============================================
// ErrorTracker Class
// ============================================

export class ErrorTracker {
  private static instance: ErrorTracker | null = null;
  private errorQueue: QueuedError[] = [];
  private breadcrumbs: Breadcrumb[] = [];
  private recentErrors = new Map<string, number>();
  private isOnline = navigator.onLine;
  private sessionStartTime = Date.now();
  private gameContext: GameContext = {};
  private originalConsoleError: typeof console.error;
  private tags: string[] = [];

  private constructor() {
    this.originalConsoleError = console.error.bind(console);
    this.loadQueue();
    this.setupGlobalHandlers();
    this.setupNetworkMonitoring();
    this.setupResourceMonitoring();
    this.setupConsoleInterception();
    this.startQueueProcessor();
    this.addBreadcrumb('system', 'ErrorTracker initialized');
  }

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  // ============================================
  // Public API
  // ============================================

  /**
   * Capture an error manually
   */
  captureError(options: {
    errorType: string;
    errorMessage: string;
    stackTrace?: string;
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    context?: Record<string, unknown>;
    tags?: string[];
  }): void {
    const {
      errorType,
      errorMessage,
      stackTrace,
      category = 'runtime',
      severity = 'medium',
      context,
      tags = [],
    } = options;

    // Create fingerprint for grouping
    const fingerprint = this.createFingerprint(errorType, errorMessage, stackTrace);

    // Rate limiting
    const lastReport = this.recentErrors.get(fingerprint);
    const now = Date.now();
    if (lastReport && now - lastReport < RATE_LIMIT_MS) {
      Logger.debug(`[ErrorTracker] Rate limited: ${errorType}`);
      return;
    }
    this.recentErrors.set(fingerprint, now);

    // Build report
    const report: ErrorReport = {
      errorType,
      errorMessage: this.sanitizeMessage(errorMessage),
      stackTrace: this.sanitizeStackTrace(stackTrace),
      category,
      severity,
      fingerprint,
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      playerId: UserSessionService.getPlayerId(),
      sessionId: this.getSessionId(),
      deviceFingerprint: this.getDeviceFingerprint(),
      nickname: UserSessionService.getNickname() ?? undefined,
      context: this.sanitizeContext(context),
      breadcrumbs: [...this.breadcrumbs],
      gameContext: { ...this.gameContext },
      reportedAt: new Date().toISOString(),
      sessionDurationMs: Date.now() - this.sessionStartTime,
      tags: [...this.tags, ...tags],
    };

    Logger.warn(`[ErrorTracker] Captured ${severity} ${category} error: ${errorType}`, {
      message: errorMessage.substring(0, 100),
    });

    // Add to breadcrumbs
    this.addBreadcrumb('error', `${errorType}: ${errorMessage.substring(0, 50)}`);

    // Queue or send
    if (this.isOnline && isSupabaseConfigured()) {
      void this.sendError(report);
    } else {
      this.queueError(report);
    }
  }

  /**
   * Capture network error with details
   */
  captureNetworkError(
    url: string,
    method: string,
    status: number,
    statusText: string,
    duration?: number
  ): void {
    this.captureError({
      errorType: 'NetworkError',
      errorMessage: `${method} ${url} failed: ${status} ${statusText}`,
      category: 'network',
      severity: status >= 500 ? 'high' : 'medium',
      context: {
        url: this.sanitizeUrl(url),
        method,
        status,
        statusText,
        durationMs: duration,
      },
      tags: ['network', `status-${status}`],
    });
  }

  /**
   * Capture performance issue
   */
  capturePerformanceIssue(
    metric: string,
    value: number,
    threshold: number,
    unit: string = ''
  ): void {
    this.captureError({
      errorType: 'PerformanceIssue',
      errorMessage: `${metric} (${value}${unit}) exceeded threshold (${threshold}${unit})`,
      category: 'performance',
      severity: value > threshold * 2 ? 'high' : 'low',
      context: {
        metric,
        value,
        threshold,
        exceeded: value - threshold,
        exceedPercent: Math.round(((value - threshold) / threshold) * 100),
      },
      tags: ['performance', metric.toLowerCase().replace(/\s/g, '-')],
    });
  }

  /**
   * Capture game-specific error
   */
  captureGameError(errorType: string, message: string, gameData?: Record<string, unknown>): void {
    this.captureError({
      errorType,
      errorMessage: message,
      category: 'game',
      severity: 'medium',
      context: gameData,
      tags: ['game'],
    });
  }

  /**
   * Add breadcrumb (user action tracking)
   */
  addBreadcrumb(category: string, message: string, data?: Record<string, unknown>): void {
    this.breadcrumbs.push({
      timestamp: Date.now(),
      category,
      message,
      data,
    });

    // Keep only last N
    if (this.breadcrumbs.length > MAX_BREADCRUMBS) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * Update game context (called by game systems)
   */
  setGameContext(context: Partial<GameContext>): void {
    this.gameContext = { ...this.gameContext, ...context };
  }

  /**
   * Add global tag
   */
  addTag(tag: string): void {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  /**
   * Remove global tag
   */
  removeTag(tag: string): void {
    const index = this.tags.indexOf(tag);
    if (index !== -1) {
      this.tags.splice(index, 1);
    }
  }

  /**
   * Get error statistics
   */
  getStats(): {
    queueSize: number;
    recentErrorsCount: number;
    breadcrumbsCount: number;
    sessionDurationMs: number;
  } {
    return {
      queueSize: this.errorQueue.length,
      recentErrorsCount: this.recentErrors.size,
      breadcrumbsCount: this.breadcrumbs.length,
      sessionDurationMs: Date.now() - this.sessionStartTime,
    };
  }

  // ============================================
  // Setup Methods
  // ============================================

  private setupGlobalHandlers(): void {
    // Unhandled errors
    window.addEventListener('error', event => {
      this.captureError({
        errorType: 'UnhandledError',
        errorMessage: event.message || 'Unknown error',
        stackTrace: event.error?.stack,
        category: 'runtime',
        severity: 'high',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
        tags: ['unhandled'],
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', event => {
      const message = event.reason?.message || String(event.reason);
      this.captureError({
        errorType: 'UnhandledPromiseRejection',
        errorMessage: message,
        stackTrace: event.reason?.stack,
        category: 'runtime',
        severity: 'high',
        context: {
          promiseReason: String(event.reason).substring(0, 200),
        },
        tags: ['unhandled', 'promise'],
      });
    });

    Logger.info('[ErrorTracker] Global error handlers installed');
  }

  private setupNetworkMonitoring(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.addBreadcrumb('network', 'Online');
      Logger.info('[ErrorTracker] Network online - processing queue');
      void this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.addBreadcrumb('network', 'Offline');
      Logger.warn('[ErrorTracker] Network offline - queueing errors');
    });

    // Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const startTime = Date.now();
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method || 'GET';

      try {
        const response = await originalFetch(input, init);
        const duration = Date.now() - startTime;

        // Track slow requests
        if (duration > 5000) {
          this.addBreadcrumb('network', `Slow request: ${method} ${url} (${duration}ms)`);
        }

        // Track failed requests (but not Supabase errors to prevent loops)
        if (!response.ok && !url.includes('supabase')) {
          this.captureNetworkError(url, method, response.status, response.statusText, duration);
        }

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        if (!url.includes('supabase')) {
          this.captureNetworkError(url, method, 0, (error as Error).message, duration);
        }
        throw error;
      }
    };
  }

  private setupResourceMonitoring(): void {
    // Track resource loading errors (images, scripts, etc.)
    window.addEventListener(
      'error',
      event => {
        const target = event.target;
        if (target && target instanceof Element && 'src' in target) {
          const src = (target as HTMLImageElement | HTMLScriptElement).src;
          this.captureError({
            errorType: 'ResourceLoadError',
            errorMessage: `Failed to load resource: ${src}`,
            category: 'resource',
            severity: 'low',
            context: {
              tagName: target.tagName,
              src: this.sanitizeUrl(src),
            },
            tags: ['resource', target.tagName.toLowerCase()],
          });
        }
      },
      true
    );
  }

  private setupConsoleInterception(): void {
    // Intercept console.error
    console.error = (...args: unknown[]) => {
      // Call original
      this.originalConsoleError(...args);

      // Capture as error
      const message = args
        .map(arg => (typeof arg === 'object' ? JSON.stringify(arg).substring(0, 200) : String(arg)))
        .join(' ');

      // Don't capture our own logs
      if (!message.includes('[ErrorTracker]')) {
        this.captureError({
          errorType: 'ConsoleError',
          errorMessage: message,
          category: 'console',
          severity: 'medium',
          tags: ['console'],
        });
      }
    };
  }

  private startQueueProcessor(): void {
    setInterval(() => {
      if (this.isOnline && this.errorQueue.length > 0) {
        void this.processQueue();
      }
    }, 15000); // Every 15 seconds
  }

  // ============================================
  // Queue Management
  // ============================================

  private async sendError(report: ErrorReport): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      this.queueError(report);
      return;
    }

    try {
      const { error } = await supabase.from('error_reports').insert({
        player_id: report.playerId?.startsWith('anon-') ? null : report.playerId,
        error_type: report.errorType,
        error_message: report.errorMessage,
        stack_trace: report.stackTrace,
        user_agent: report.userAgent,
        url: report.url,
        device_fingerprint: report.deviceFingerprint,
        severity: report.severity,
        category: report.category,
        fingerprint: report.fingerprint,
        context: {
          ...report.context,
          viewport: report.viewport,
          nickname: report.nickname,
          gameContext: report.gameContext,
          breadcrumbs: report.breadcrumbs.slice(-10), // Last 10 only
          tags: report.tags,
          sessionDurationMs: report.sessionDurationMs,
        },
        reported_at: report.reportedAt,
        status: 'new',
      });

      if (error) throw error;
      Logger.debug('[ErrorTracker] Error sent to Supabase');
    } catch (err) {
      Logger.error('[ErrorTracker] Failed to send error', err);
      this.queueError(report);
    }
  }

  private queueError(report: ErrorReport): void {
    if (this.errorQueue.length >= MAX_QUEUE_SIZE) {
      this.errorQueue.shift();
    }

    this.errorQueue.push({ report, retryCount: 0 });
    this.saveQueue();
    Logger.debug(`[ErrorTracker] Queued error (${this.errorQueue.length} in queue)`);
  }

  private async processQueue(): Promise<void> {
    if (!isSupabaseConfigured() || this.errorQueue.length === 0) return;

    const batch = this.errorQueue.splice(0, BATCH_SIZE);

    for (const item of batch) {
      try {
        await this.sendError(item.report);
      } catch {
        if (item.retryCount < 3) {
          item.retryCount++;
          this.errorQueue.push(item);
        }
      }
    }

    this.saveQueue();
  }

  private saveQueue(): void {
    try {
      const simplified = this.errorQueue.map(item => ({
        r: {
          t: item.report.errorType,
          m: item.report.errorMessage.substring(0, 100),
          s: item.report.severity,
          c: item.report.category,
          ts: item.report.reportedAt,
        },
        rc: item.retryCount,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(simplified));
    } catch {
      // Ignore storage errors
    }
  }

  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const items = JSON.parse(stored) as Array<{
          r: { t: string; m: string; s: ErrorSeverity; c: ErrorCategory; ts: string };
          rc: number;
        }>;
        this.errorQueue = items.map(item => ({
          report: {
            errorType: item.r.t,
            errorMessage: item.r.m,
            category: item.r.c,
            severity: item.r.s,
            fingerprint: this.createFingerprint(item.r.t, item.r.m),
            userAgent: navigator.userAgent,
            url: window.location.href,
            viewport: { width: window.innerWidth, height: window.innerHeight },
            reportedAt: item.r.ts,
            breadcrumbs: [],
            tags: ['restored'],
          },
          retryCount: item.rc,
        }));
        localStorage.removeItem(STORAGE_KEY);
        Logger.info(`[ErrorTracker] Restored ${this.errorQueue.length} queued errors`);
      }
    } catch {
      // Ignore
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  private createFingerprint(type: string, message: string, stack?: string): string {
    // Extract first meaningful line from stack if available
    const stackLine = stack?.split('\n')[1]?.trim().substring(0, 100) || '';
    const input = `${type}|${message.substring(0, 100)}|${stackLine}`;
    return this.simpleHash(input);
  }

  private sanitizeMessage(message: string): string {
    if (!message) return '';
    return message
      .substring(0, 500)
      .replace(/api[_-]?key[=:]\s*[\w-]+/gi, 'api_key=***')
      .replace(/token[=:]\s*[\w-]+/gi, 'token=***')
      .replace(/password[=:]\s*[\w-]+/gi, 'password=***')
      .replace(/bearer\s+[\w.-]+/gi, 'bearer ***');
  }

  private sanitizeStackTrace(stack?: string): string | undefined {
    if (!stack) return undefined;
    return stack.substring(0, 2000);
  }

  private sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!context) return undefined;
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'string' && value.length > 200) {
        sanitized[key] = value.substring(0, 200) + '...';
      } else if (typeof value === 'object' && value !== null) {
        try {
          sanitized[key] = JSON.parse(JSON.stringify(value));
        } catch {
          sanitized[key] = '[Object]';
        }
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove sensitive query params
      ['token', 'key', 'password', 'secret', 'auth'].forEach(param => {
        if (parsed.searchParams.has(param)) {
          parsed.searchParams.set(param, '***');
        }
      });
      return parsed.toString();
    } catch {
      return url.substring(0, 200);
    }
  }

  private getSessionId(): string | undefined {
    return sessionStorage.getItem('current_session_id') ?? undefined;
  }

  private getDeviceFingerprint(): string {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
    ];
    return this.simpleHash(components.join('|'));
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

// Auto-initialize on import
const errorTracker = ErrorTracker.getInstance();
export default errorTracker;
