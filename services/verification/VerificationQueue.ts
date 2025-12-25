/**
 * VerificationQueue - Retry Logic for Game Verification
 *
 * Handles offline queueing and retry with exponential backoff
 * for game session verification requests.
 */

import { Logger } from '../Logger';
import { EventBus, type GameEvent } from '../EventBus';

const STORAGE_KEY = 'verification_queue';
const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;
const BACKOFF_MULTIPLIER = 2;

export interface VerificationRequest {
  id: string;
  timestamp: number;
  retryCount: number;
  lastAttempt?: number;
  data: VerificationData;
}

export interface VerificationData {
  userId: string;
  startTime: number;
  endTime: number;
  pair: string;
  position: string;
  leverage: number;
  claimedEntryPrice: number;
  claimedExitPrice: number;
  claimedPnL: number;
  kills: number;
  level: number;
  goldCollected: number;
  sessionId?: string;
}

export interface VerificationResult {
  verified: boolean;
  reward?: number;
  verifiedPnL?: number;
  method?: string;
  error?: string;
}

type QueueEventType =
  | 'verification:queued'
  | 'verification:processing'
  | 'verification:success'
  | 'verification:failed'
  | 'verification:retrying';

class VerificationQueueService {
  private static instance: VerificationQueueService | null = null;
  private queue: VerificationRequest[] = [];
  private isProcessing = false;
  private processTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor() {
    this.loadFromStorage();
    this.startProcessing();

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.onOnline());
      window.addEventListener('offline', () => this.onOffline());
    }
  }

  static getInstance(): VerificationQueueService {
    return (VerificationQueueService.instance ??= new VerificationQueueService());
  }

  /**
   * Add a verification request to the queue
   */
  async enqueue(data: VerificationData): Promise<VerificationResult> {
    const request: VerificationRequest = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
      data,
    };

    // Try immediate verification first
    try {
      const result = await this.verify(request);
      this.emit('verification:success', { request, result });
      return result;
    } catch (error) {
      // Queue for retry if immediate fails
      Logger.warn('[VerificationQueue] Immediate verification failed, queuing for retry', {
        error,
      });
      this.queue.push(request);
      this.saveToStorage();
      this.emit('verification:queued', { request });
      this.scheduleProcessing();

      // Return optimistic result
      return {
        verified: false,
        error: 'Queued for retry',
      };
    }
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    if (!navigator.onLine) {
      Logger.debug('[VerificationQueue] Offline, skipping queue processing');
      return;
    }

    this.isProcessing = true;

    const request = this.queue[0];
    if (!request) {
      this.isProcessing = false;
      return;
    }

    const delay = this.calculateDelay(request.retryCount);
    const timeSinceLastAttempt = Date.now() - (request.lastAttempt ?? 0);

    if (timeSinceLastAttempt < delay) {
      // Not ready for retry yet
      this.isProcessing = false;
      this.scheduleProcessing(delay - timeSinceLastAttempt);
      return;
    }

    this.emit('verification:processing', { request });
    Logger.info(
      `[VerificationQueue] Processing request ${request.id}, attempt ${request.retryCount + 1}`
    );

    try {
      const result = await this.verify(request);

      // Success - remove from queue
      this.queue.shift();
      this.saveToStorage();
      this.emit('verification:success', { request, result });
      Logger.info(`[VerificationQueue] Request ${request.id} verified successfully`);
    } catch (error) {
      request.retryCount++;
      request.lastAttempt = Date.now();

      if (request.retryCount >= MAX_RETRIES) {
        // Max retries reached - remove from queue
        this.queue.shift();
        this.saveToStorage();
        this.emit('verification:failed', { request, error });
        Logger.error(
          `[VerificationQueue] Request ${request.id} failed after ${MAX_RETRIES} attempts`
        );
      } else {
        // Schedule retry
        this.saveToStorage();
        this.emit('verification:retrying', { request, retryCount: request.retryCount });
        Logger.warn(
          `[VerificationQueue] Request ${request.id} failed, retry ${request.retryCount}/${MAX_RETRIES}`
        );
      }
    }

    this.isProcessing = false;

    // Continue processing queue
    if (this.queue.length > 0) {
      this.scheduleProcessing();
    }
  }

  /**
   * Verify a request against the edge function
   */
  private async verify(request: VerificationRequest): Promise<VerificationResult> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase not configured');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/verify-game`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(request.data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error ?? `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Calculate delay for exponential backoff
   */
  private calculateDelay(retryCount: number): number {
    const delay = INITIAL_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, retryCount);
    return Math.min(delay, MAX_DELAY_MS);
  }

  /**
   * Schedule queue processing
   */
  private scheduleProcessing(delay?: number): void {
    if (this.processTimer) {
      clearTimeout(this.processTimer);
    }

    const actualDelay = delay ?? 1000;
    this.processTimer = setTimeout(() => {
      void this.processQueue();
    }, actualDelay);
  }

  /**
   * Start queue processing
   */
  private startProcessing(): void {
    if (this.queue.length > 0) {
      this.scheduleProcessing();
    }
  }

  /**
   * Handle coming online
   */
  private onOnline(): void {
    Logger.info('[VerificationQueue] Back online, processing queue');
    this.scheduleProcessing();
  }

  /**
   * Handle going offline
   */
  private onOffline(): void {
    Logger.info('[VerificationQueue] Offline, pausing queue processing');
    if (this.processTimer) {
      clearTimeout(this.processTimer);
      this.processTimer = null;
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      Logger.warn('[VerificationQueue] Failed to save to storage', { error });
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        Logger.info(
          `[VerificationQueue] Loaded ${this.queue.length} pending requests from storage`
        );
      }
    } catch (error) {
      Logger.warn('[VerificationQueue] Failed to load from storage', { error });
      this.queue = [];
    }
  }

  /**
   * Emit queue event
   */
  private emit(event: QueueEventType, data: Record<string, unknown>): void {
    EventBus.emit(event as GameEvent, data);
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    return {
      pendingCount: this.queue.length,
      isProcessing: this.isProcessing,
      isOnline: navigator.onLine,
      oldestRequest: this.queue[0]?.timestamp ?? null,
    };
  }

  /**
   * Clear queue (for testing/debugging)
   */
  clearQueue(): void {
    this.queue = [];
    this.saveToStorage();
    Logger.info('[VerificationQueue] Queue cleared');
  }
}

export interface QueueStats {
  pendingCount: number;
  isProcessing: boolean;
  isOnline: boolean;
  oldestRequest: number | null;
}

export const VerificationQueue = VerificationQueueService.getInstance();
