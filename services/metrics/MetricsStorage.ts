/**
 * MetricsStorage - Handles localStorage persistence for metrics
 *
 * Features:
 * - Load/save sessions to localStorage
 * - Quota exceeded handling with graceful degradation
 * - Session limiting
 */

import { Logger } from '../Logger';
import { SessionMetrics } from '../../types/metrics';

const METRICS_VERSION = '1.0.0';
const STORAGE_KEY = 'crypto_survivors_metrics';

export class MetricsStorage {
  private sessions: SessionMetrics[] = [];
  private maxSessions: number;

  constructor(maxSessions: number = 100) {
    this.maxSessions = maxSessions;
    this.load();
  }

  /**
   * Load sessions from localStorage
   */
  load(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.sessions = data.sessions ?? [];
        Logger.debug(`[MetricsStorage] Loaded ${this.sessions.length} sessions`);
      }
    } catch (error) {
      Logger.warn('[MetricsStorage] Failed to load from storage', error);
      this.sessions = [];
    }
  }

  /**
   * Save sessions to localStorage
   */
  private save(): void {
    try {
      const data = {
        version: METRICS_VERSION,
        sessions: this.sessions,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      if (this.isQuotaExceededError(error)) {
        Logger.warn('[MetricsStorage] Quota exceeded, cleaning up...');
        this.handleQuotaExceeded();
      } else {
        Logger.error('[MetricsStorage] Failed to save', error);
      }
    }
  }

  /**
   * Add a session and persist
   */
  addSession(session: SessionMetrics): void {
    this.sessions.push(session);

    // Enforce max limit
    while (this.sessions.length > this.maxSessions) {
      this.sessions.shift();
    }

    this.save();
  }

  /**
   * Get all stored sessions
   */
  getSessions(): SessionMetrics[] {
    return [...this.sessions];
  }

  /**
   * Get session count
   */
  getCount(): number {
    return this.sessions.length;
  }

  /**
   * Clear all sessions
   */
  clear(): void {
    this.sessions = [];
    try {
      localStorage.removeItem(STORAGE_KEY);
      Logger.info('[MetricsStorage] All sessions cleared');
    } catch {
      // Ignore
    }
  }

  /**
   * Check if error is a QuotaExceededError
   */
  private isQuotaExceededError(error: unknown): boolean {
    if (error instanceof DOMException) {
      return (
        error.code === 22 ||
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      );
    }
    return false;
  }

  /**
   * Handle quota exceeded by removing old sessions
   */
  private handleQuotaExceeded(): void {
    const originalCount = this.sessions.length;

    // Keep only half
    const keepCount = Math.max(10, Math.floor(this.sessions.length / 2));
    this.sessions = this.sessions.slice(-keepCount);

    Logger.info(`[MetricsStorage] Removed ${originalCount - keepCount} old sessions`);

    // Retry save
    try {
      const data = {
        version: METRICS_VERSION,
        sessions: this.sessions,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      Logger.info('[MetricsStorage] Saved after cleanup');
    } catch (retryError) {
      if (this.isQuotaExceededError(retryError)) {
        // Keep only last 5
        Logger.warn('[MetricsStorage] Still exceeded, keeping only 5 sessions');
        this.sessions = this.sessions.slice(-5);

        try {
          const data = {
            version: METRICS_VERSION,
            sessions: this.sessions,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {
          Logger.error('[MetricsStorage] Cannot save, clearing all');
          this.sessions = [];
          localStorage.removeItem(STORAGE_KEY);
        }
      } else {
        Logger.error('[MetricsStorage] Unexpected retry error', retryError);
      }
    }
  }
}
