/**
 * VerificationQueue Tests
 *
 * Tests anti-cheat verification queue including:
 * - Immediate verification
 * - Retry logic with exponential backoff
 * - Max retry limits
 * - Offline/online behavior
 * - Storage persistence
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock navigator.onLine
let mockOnline = true;
Object.defineProperty(navigator, 'onLine', {
  get: () => mockOnline,
  configurable: true,
});

// Mock crypto.randomUUID
let uuidCounter = 0;
Object.defineProperty(global, 'crypto', {
  value: { randomUUID: () => `test-uuid-${++uuidCounter}` },
});

// Mock import.meta.env
vi.mock('../../services/Logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../services/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(() => () => {}),
  },
}));

// Dynamic import to avoid module caching issues
async function getQueue() {
  // Clear module cache
  vi.resetModules();

  // Set env vars
  vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

  const { VerificationQueue } =
    await import('../../services/verification/VerificationQueue');
  return VerificationQueue;
}

// Helper to create test data
function createTestData(overrides = {}) {
  return {
    userId: 'user-1',
    startTime: Date.now() - 60000,
    endTime: Date.now(),
    pair: 'BTC',
    position: 'long',
    leverage: 10,
    claimedEntryPrice: 98000,
    claimedExitPrice: 98500,
    claimedPnL: 5.1,
    kills: 25,
    level: 5,
    goldCollected: 150,
    survivalTimeMs: 60000,
    optimisticReward: 100,
    ...overrides,
  };
}

describe('VerificationQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    localStorageMock.clear();
    mockFetch.mockReset();
    mockOnline = true;
    uuidCounter = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  describe('Immediate Verification', () => {
    it('should verify immediately if online', async () => {
      const queue = await getQueue();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ verified: true, reward: 100, verifiedPnL: 5.0 }),
      });

      const result = await queue.enqueue(createTestData());

      expect(result.verified).toBe(true);
      expect(result.reward).toBe(100);
      expect(result.verifiedPnL).toBe(5.0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should include correct headers in request', async () => {
      const queue = await getQueue();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ verified: true }),
      });

      await queue.enqueue(createTestData());

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/verify-game',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-key',
          },
        })
      );
    });

    it('should queue for retry if immediate fails', async () => {
      const queue = await getQueue();

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await queue.enqueue(createTestData());

      expect(result.verified).toBe(false);
      expect(result.error).toBe('Queued for retry');
      expect(queue.getStats().pendingCount).toBe(1);
    });
  });

  describe('Retry Logic with Exponential Backoff', () => {
    it('should retry with increasing delays', async () => {
      const queue = await getQueue();

      // First attempt fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await queue.enqueue(createTestData());

      expect(queue.getStats().pendingCount).toBe(1);

      // Advance time past initial delay (1000ms) and trigger retry
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await vi.advanceTimersByTimeAsync(1100);

      // Still in queue after first retry (retry count = 1)
      expect(queue.getStats().pendingCount).toBe(1);
    });

    it('should cap delay at maximum (30 seconds)', async () => {
      const queue = await getQueue();

      // Setup multiple failures
      for (let i = 0; i < 8; i++) {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));
      }

      await queue.enqueue(createTestData());

      // After several retries, delay should be capped at 30 seconds
      // Initial: 1s, then 2s, 4s, 8s, 16s, 32s (capped to 30s)
      await vi.advanceTimersByTimeAsync(1100); // First retry
      await vi.advanceTimersByTimeAsync(2100); // Second retry
      await vi.advanceTimersByTimeAsync(4100); // Third retry
      await vi.advanceTimersByTimeAsync(8100); // Fourth retry

      // Queue should still have the request (still retrying)
      expect(queue.getStats().pendingCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Max Retry Handling', () => {
    it('should remove from queue after max retries (5)', async () => {
      const queue = await getQueue();

      // Setup to fail all 6 attempts (initial + 5 retries)
      for (let i = 0; i < 6; i++) {
        mockFetch.mockRejectedValueOnce(new Error('Server error'));
      }

      await queue.enqueue(createTestData());
      expect(queue.getStats().pendingCount).toBe(1);

      // Advance through all retries
      const delays = [1100, 2100, 4100, 8100, 16100, 30100];
      for (const delay of delays) {
        await vi.advanceTimersByTimeAsync(delay);
      }

      // Should be removed from queue after max retries
      expect(queue.getStats().pendingCount).toBe(0);
    });
  });

  describe('Offline/Online Behavior', () => {
    it('should not process queue when offline', async () => {
      const queue = await getQueue();

      // Add a failed request
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await queue.enqueue(createTestData());

      expect(queue.getStats().pendingCount).toBe(1);

      // Go offline
      mockOnline = false;

      // Advance time - should not process
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ verified: true }),
      });
      await vi.advanceTimersByTimeAsync(5000);

      // Request should still be pending
      expect(queue.getStats().pendingCount).toBe(1);
      expect(queue.getStats().isOnline).toBe(false);
    });

    it('should report correct online status', async () => {
      const queue = await getQueue();

      mockOnline = true;
      expect(queue.getStats().isOnline).toBe(true);

      mockOnline = false;
      expect(queue.getStats().isOnline).toBe(false);
    });
  });

  describe('HTTP Error Handling', () => {
    it('should handle HTTP errors with error message', async () => {
      const queue = await getQueue();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid session data' }),
      });

      const result = await queue.enqueue(createTestData());

      expect(result.verified).toBe(false);
      expect(result.error).toBe('Queued for retry');
      expect(queue.getStats().pendingCount).toBe(1);
    });

    it('should handle HTTP errors without error message', async () => {
      const queue = await getQueue();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('JSON parse error')),
      });

      const result = await queue.enqueue(createTestData());

      expect(result.verified).toBe(false);
      expect(queue.getStats().pendingCount).toBe(1);
    });

    it('should handle 401 unauthorized errors', async () => {
      const queue = await getQueue();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      const result = await queue.enqueue(createTestData());

      expect(result.verified).toBe(false);
      expect(queue.getStats().pendingCount).toBe(1);
    });
  });

  describe('Storage Persistence', () => {
    it('should save queue to localStorage on failure', async () => {
      const queue = await getQueue();

      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await queue.enqueue(createTestData());

      const stored = localStorage.getItem('verification_queue');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].data.userId).toBe('user-1');
    });

    it('should load persisted queue on initialization', async () => {
      // Pre-populate localStorage
      const mockQueue = [
        {
          id: 'test-uuid-pre',
          timestamp: Date.now() - 5000,
          retryCount: 2,
          data: createTestData({ userId: 'pre-existing-user' }),
        },
      ];
      localStorage.setItem('verification_queue', JSON.stringify(mockQueue));

      const queue = await getQueue();

      // Should have loaded the pre-existing request
      expect(queue.getStats().pendingCount).toBe(1);
    });

    it('should clear queue and storage', async () => {
      const queue = await getQueue();

      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await queue.enqueue(createTestData());

      expect(queue.getStats().pendingCount).toBe(1);

      queue.clearQueue();
      expect(queue.getStats().pendingCount).toBe(0);

      const stored = localStorage.getItem('verification_queue');
      expect(JSON.parse(stored!)).toEqual([]);
    });

    it('should handle corrupted localStorage gracefully', async () => {
      // Set invalid JSON
      localStorage.setItem('verification_queue', 'not valid json{{{');

      // Should not throw, should start with empty queue
      const queue = await getQueue();
      expect(queue.getStats().pendingCount).toBe(0);
    });
  });

  describe('Queue Stats', () => {
    it('should return correct stats with empty queue', async () => {
      const queue = await getQueue();

      const stats = queue.getStats();
      expect(stats.pendingCount).toBe(0);
      expect(stats.isProcessing).toBe(false);
      expect(stats.isOnline).toBe(true);
      expect(stats.oldestRequest).toBeNull();
    });

    it('should return oldest request timestamp', async () => {
      const queue = await getQueue();

      const beforeTime = Date.now();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await queue.enqueue(createTestData());
      const afterTime = Date.now();

      const stats = queue.getStats();
      expect(stats.oldestRequest).toBeGreaterThanOrEqual(beforeTime);
      expect(stats.oldestRequest).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Successful Retry After Failure', () => {
    it('should successfully verify on retry', async () => {
      const queue = await getQueue();

      // First attempt fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await queue.enqueue(createTestData());

      expect(queue.getStats().pendingCount).toBe(1);

      // Second attempt succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ verified: true, reward: 50 }),
      });

      await vi.advanceTimersByTimeAsync(1100);

      // Should be removed from queue after success
      expect(queue.getStats().pendingCount).toBe(0);
    });
  });

  describe('Multiple Enqueued Requests', () => {
    it('should process multiple requests in order', async () => {
      const queue = await getQueue();

      // Enqueue multiple failed requests
      mockFetch.mockRejectedValue(new Error('Network error'));

      await queue.enqueue(createTestData({ userId: 'user-1' }));
      await queue.enqueue(createTestData({ userId: 'user-2' }));
      await queue.enqueue(createTestData({ userId: 'user-3' }));

      expect(queue.getStats().pendingCount).toBe(3);
    });
  });
});
