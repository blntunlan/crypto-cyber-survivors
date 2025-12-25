/**
 * VerificationQueue Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

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
Object.defineProperty(navigator, 'onLine', { value: true, writable: true });

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: { randomUUID: () => 'test-uuid-' + Date.now() },
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

  const { VerificationQueue } = await import('../../services/verification/VerificationQueue');
  return VerificationQueue;
}

describe('VerificationQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorageMock.clear();
    mockFetch.mockReset();
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
        json: () => Promise.resolve({ verified: true, reward: 100 }),
      });

      const result = await queue.enqueue({
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
      });

      expect(result.verified).toBe(true);
      expect(result.reward).toBe(100);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should queue for retry if immediate fails', async () => {
      const queue = await getQueue();

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await queue.enqueue({
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
      });

      expect(result.verified).toBe(false);
      expect(result.error).toBe('Queued for retry');
      expect(queue.getStats().pendingCount).toBe(1);
    });
  });

  describe('Queue Stats', () => {
    it('should return correct stats', async () => {
      const queue = await getQueue();

      const stats = queue.getStats();
      expect(stats).toHaveProperty('pendingCount');
      expect(stats).toHaveProperty('isProcessing');
      expect(stats).toHaveProperty('isOnline');
      expect(stats).toHaveProperty('oldestRequest');
    });
  });

  describe('Queue Management', () => {
    it('should clear queue', async () => {
      const queue = await getQueue();

      // Add an item that fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await queue.enqueue({
        userId: 'user-1',
        startTime: Date.now(),
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
      });

      expect(queue.getStats().pendingCount).toBe(1);

      queue.clearQueue();
      expect(queue.getStats().pendingCount).toBe(0);
    });
  });
});
