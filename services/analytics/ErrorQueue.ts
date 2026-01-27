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

import { type ErrorReport, type QueuedError, ERROR_CONSTANTS } from './ErrorTypes';
import { Logger } from '../system/Logger';

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
      const items = this.queue.slice(0, ERROR_CONSTANTS.MAX_QUEUE_SIZE);
      localStorage.setItem(ERROR_CONSTANTS.STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      Logger.warn('[ErrorQueue] Storage failed:', e);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(ERROR_CONSTANTS.STORAGE_KEY);
      if (stored) {
        const items = JSON.parse(stored) as QueuedError[];
        this.queue = items.map(item => ({
          ...item,
          report: {
            ...item.report,
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            tags: [...(item.report.tags || []), 'restored'],
          },
        }));

        localStorage.removeItem(ERROR_CONSTANTS.STORAGE_KEY);
        Logger.info(`[ErrorQueue] Restored ${this.queue.length} queued errors`);
      }
    } catch {
      // Ignore
    }
  }
}
