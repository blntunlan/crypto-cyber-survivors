/**
 * ErrorQueue - Queue management for offline error persistence
 *
 * Handles:
 * - Queue storage/retrieval from localStorage
 * - Queue size management
 * - Batch processing coordination
 *
 * @module Extracted from ErrorTracker.ts for better modularity
 */

import {
  type ErrorReport,
  type QueuedError,
  type ErrorSeverity,
  type ErrorCategory,
  ERROR_CONSTANTS,
} from './ErrorTypes';
import { Logger } from '../Logger';

// =============================================================================
// HELPER: Simple hash for fingerprints
// =============================================================================

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function createFingerprint(type: string, message: string): string {
  const input = `${type}|${message.substring(0, 100)}`;
  return simpleHash(input);
}

// =============================================================================
// ERROR QUEUE CLASS
// =============================================================================

export class ErrorQueue {
  private queue: QueuedError[] = [];

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Add error to queue
   */
  enqueue(report: ErrorReport): void {
    if (this.queue.length >= ERROR_CONSTANTS.MAX_QUEUE_SIZE) {
      this.queue.shift(); // Remove oldest
    }

    this.queue.push({ report, retryCount: 0 });
    this.saveToStorage();
    Logger.debug(`[ErrorQueue] Queued error (${this.queue.length} in queue)`);
  }

  /**
   * Get batch of errors for processing
   */
  getBatch(): QueuedError[] {
    return this.queue.splice(0, ERROR_CONSTANTS.BATCH_SIZE);
  }

  /**
   * Re-queue failed item with retry increment
   */
  requeue(item: QueuedError): void {
    if (item.retryCount < ERROR_CONSTANTS.MAX_RETRIES) {
      item.retryCount++;
      this.queue.push(item);
    }
  }

  /**
   * Persist queue changes
   */
  persist(): void {
    this.saveToStorage();
  }

  /**
   * Get current queue size
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   */
  get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
    try {
      localStorage.removeItem(ERROR_CONSTANTS.STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private saveToStorage(): void {
    try {
      const simplified = this.queue.map(item => ({
        r: {
          t: item.report.errorType,
          m: item.report.errorMessage.substring(0, 100),
          s: item.report.severity,
          c: item.report.category,
          ts: item.report.reportedAt,
        },
        rc: item.retryCount,
      }));
      localStorage.setItem(ERROR_CONSTANTS.STORAGE_KEY, JSON.stringify(simplified));
    } catch {
      // Ignore storage errors
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(ERROR_CONSTANTS.STORAGE_KEY);
      if (stored) {
        const items = JSON.parse(stored) as Array<{
          r: { t: string; m: string; s: ErrorSeverity; c: ErrorCategory; ts: string };
          rc: number;
        }>;

        this.queue = items.map(item => ({
          report: {
            errorType: item.r.t,
            errorMessage: item.r.m,
            category: item.r.c,
            severity: item.r.s,
            fingerprint: createFingerprint(item.r.t, item.r.m),
            userAgent: navigator.userAgent,
            url: window.location.href,
            viewport: { width: window.innerWidth, height: window.innerHeight },
            reportedAt: item.r.ts,
            breadcrumbs: [],
            tags: ['restored'],
          },
          retryCount: item.rc,
        }));

        localStorage.removeItem(ERROR_CONSTANTS.STORAGE_KEY);
        Logger.info(`[ErrorQueue] Restored ${this.queue.length} queued errors`);
      }
    } catch {
      // Ignore
    }
  }
}
