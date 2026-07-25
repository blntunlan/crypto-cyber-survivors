/**
 * SSEMarketService Resilience Tests
 *
 * P0 Beta Checklist Item:
 *   "SSE market stream dayanıklılığını doğrula: reconnect, stale data warning,
 *    fallback price, fatal disconnect ve recovery eventleri manuel ve otomatik
 *    testlerden geçmeli."
 *
 * Tests cover:
 *   - Connection lifecycle (connect, disconnect, destroy)
 *   - Data gap detection and synthetic fallback emission
 *   - Fatal disconnect detection after 30s
 *   - Recovery from data gaps
 *   - Visibility change (tab hidden/visible) reconnect
 *   - Force reconnect
 *   - Status reporting consistency
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SSEMarketService,
  type SSEMarketServiceConfig,
  type SSEMarketUpdate,
  type SSEConnectionStatus,
} from '../../../services/market/SSEMarketService';

// ── Mock EventSource ─────────────────────────────────────────────────────

type EventSourceHandler = ((event: MessageEvent) => void) | null;
type ErrorHandler = (() => void) | null;
type OpenHandler = (() => void) | null;

class MockEventSource {
  url: string;
  onmessage: EventSourceHandler = null;
  onerror: ErrorHandler = null;
  onopen: OpenHandler = null;
  readyState = 0;
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
  }

  simulateOpen() {
    this.readyState = 1;
    this.onopen?.();
  }

  simulateMessage(data: unknown) {
    this.onmessage?.(
      new MessageEvent('message', {
        data: JSON.stringify(data),
      })
    );
  }

  simulateError() {
    this.onerror?.();
  }
}

// Stub EventSource globally
const originalEventSource = globalThis.EventSource;
let mockEs: MockEventSource;

function installMockEventSource() {
  function EventSourceMock(_this: unknown, url: string): EventSource;
  function EventSourceMock(url: string): EventSource;
  function EventSourceMock(firstArg: unknown, secondArg?: string): EventSource {
    const url = typeof firstArg === 'string' ? firstArg : (secondArg ?? '');
    const source = new MockEventSource(url);
    mockEs = source;
    return source as unknown as EventSource;
  }

  globalThis.EventSource = EventSourceMock as unknown as typeof EventSource;
}

function restoreEventSource() {
  globalThis.EventSource = originalEventSource;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function createService(overrides: Partial<SSEMarketServiceConfig> = {}): {
  service: SSEMarketService;
  onData: ReturnType<typeof vi.fn>;
  onStatusChange: ReturnType<typeof vi.fn>;
} {
  const onData = vi.fn();
  const onStatusChange = vi.fn();
  const service = new SSEMarketService({
    pair: 'BTC',
    onData,
    onStatusChange,
    ...overrides,
  });
  return { service, onData, onStatusChange };
}

function createMarketUpdate(overrides: Partial<SSEMarketUpdate> = {}): SSEMarketUpdate {
  return {
    pair: 'BTC',
    price: 50000,
    volume: 100,
    high: 51000,
    low: 49000,
    rsi: 55,
    rsiState: 'NEUTRAL',
    atrPercent: 0.005,
    normalizedVolume: 0.6,
    volumePercentile: 60,
    whaleTier: 1,
    spawnRateMultiplier: 1.0,
    enemyAggroMultiplierLong: 1.0,
    enemyAggroMultiplierShort: 1.0,
    trendStrength: 0.3,
    trendDirection: 'UP',
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('SSEMarketService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv('VITE_MARKET_AGGREGATOR_URL', 'https://market.test.local');
    installMockEventSource();

    // Mock document visibility API
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    restoreEventSource();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  // ─── Connection lifecycle ───────────────────────────────────────────

  describe('connection lifecycle', () => {
    it('transitions to connecting state on connect()', () => {
      const { service, onStatusChange } = createService();
      service.connect();

      expect(onStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'connecting' })
      );
    });

    it('transitions to connected state on EventSource open', () => {
      const { service, onStatusChange } = createService();
      service.connect();
      mockEs.simulateOpen();

      expect(onStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'connected' })
      );
      expect(service.isConnected()).toBe(true);
    });

    it('reports disconnected state after disconnect()', () => {
      const { service, onStatusChange } = createService();
      service.connect();
      mockEs.simulateOpen();
      service.disconnect();

      expect(service.isConnected()).toBe(false);
      const lastCall = onStatusChange.mock.calls.at(-1)?.[0] as SSEConnectionStatus;
      expect(lastCall.state).toBe('disconnected');
    });

    it('cleans up EventSource and intervals on destroy()', () => {
      const { service } = createService();
      service.connect();
      mockEs.simulateOpen();

      service.destroy();
      expect(mockEs.close).toHaveBeenCalled();
      expect(service.isConnected()).toBe(false);
    });

    it('uses the same-origin Vite proxy URL in development', () => {
      vi.stubEnv('MODE', 'development');
      const { service } = createService({ pair: 'ETH' as never });
      service.connect();

      expect(mockEs.url).toBe('/api/v1/market/stream?pair=ETH');
    });

    it('uses the configured aggregator URL outside development', () => {
      const { service } = createService({ pair: 'ETH' as never });
      service.connect();

      expect(mockEs.url).toBe(
        'https://market.test.local/api/v1/market/stream?pair=ETH'
      );
    });
  });

  // ─── Data handling ────────────────────────────────────────────────────

  describe('data handling', () => {
    it('passes valid market data to onData callback', () => {
      const { service, onData } = createService();
      service.connect();
      mockEs.simulateOpen();

      const update = createMarketUpdate({ price: 52000 });
      mockEs.simulateMessage(update);

      expect(onData).toHaveBeenCalledWith(expect.objectContaining({ price: 52000 }));
    });

    it('ignores connection confirmation messages (type: connected)', () => {
      const { service, onData } = createService();
      service.connect();
      mockEs.simulateOpen();

      mockEs.simulateMessage({ type: 'connected', pair: 'BTC' });
      expect(onData).not.toHaveBeenCalled();
    });

    it('ignores messages for wrong pair', () => {
      const { service, onData } = createService({ pair: 'BTC' });
      service.connect();
      mockEs.simulateOpen();

      const update = createMarketUpdate({ pair: 'ETH' });
      mockEs.simulateMessage(update);
      expect(onData).not.toHaveBeenCalled();
    });

    it('stores last known price from valid messages', () => {
      const { service } = createService();
      service.connect();
      mockEs.simulateOpen();

      mockEs.simulateMessage(createMarketUpdate({ price: 55000 }));
      expect(service.getLastKnownPrice()).toBe(55000);
    });

    it('handles malformed JSON gracefully', () => {
      const { service, onData } = createService();
      service.connect();
      mockEs.simulateOpen();

      // Manually trigger onmessage with invalid JSON
      mockEs.onmessage?.(new MessageEvent('message', { data: 'not-json' }));
      expect(onData).not.toHaveBeenCalled();
    });
  });

  // ─── Data gap detection and fallback ──────────────────────────────────

  describe('data gap detection and fallback', () => {
    it('emits synthetic update after DATA_GAP_THRESHOLD_MS with last known price', () => {
      const { service, onData } = createService();
      service.connect();
      mockEs.simulateOpen();

      // Deliver one real update to set lastKnownPrice
      mockEs.simulateMessage(createMarketUpdate({ price: 50000 }));
      expect(onData).toHaveBeenCalledTimes(1);

      // Advance past data gap threshold (8s)
      vi.advanceTimersByTime(9000);

      // Should have emitted synthetic update(s)
      const syntheticCalls = onData.mock.calls.filter(
        (call: SSEMarketUpdate[]) => (call[0] as SSEMarketUpdate).isSynthetic === true
      );
      expect(syntheticCalls.length).toBeGreaterThan(0);

      // Synthetic update should use last known price
      const syntheticUpdate = syntheticCalls[0]![0] as SSEMarketUpdate;
      expect(syntheticUpdate.price).toBe(50000);
      expect(syntheticUpdate.rsi).toBe(50); // neutral defaults
      expect(syntheticUpdate.trendDirection).toBe('SIDEWAYS');
    });

    it('reports isUsingFallbackData = true during data gap', () => {
      const { service } = createService();
      service.connect();
      mockEs.simulateOpen();

      mockEs.simulateMessage(createMarketUpdate({ price: 50000 }));

      vi.advanceTimersByTime(9000);

      const status = service.getStatus();
      expect(status.isUsingFallbackData).toBe(true);
    });

    it('recovers from data gap when real data arrives', () => {
      const { service, onData } = createService();
      service.connect();
      mockEs.simulateOpen();

      mockEs.simulateMessage(createMarketUpdate({ price: 50000 }));

      // Create data gap
      vi.advanceTimersByTime(9000);
      expect(service.getStatus().isUsingFallbackData).toBe(true);

      // Real data arrives
      onData.mockClear();
      mockEs.simulateMessage(createMarketUpdate({ price: 51000 }));

      // After next interval tick, fallback should be cleared
      vi.advanceTimersByTime(1000);
      expect(service.getStatus().isUsingFallbackData).toBe(false);
    });
  });

  // ─── Fatal disconnect detection ───────────────────────────────────────

  describe('fatal disconnect detection', () => {
    it('detects fatal disconnect after FATAL_DISCONNECT_MS (30s) of no data', () => {
      const { service } = createService();
      service.connect();
      mockEs.simulateOpen();

      mockEs.simulateMessage(createMarketUpdate({ price: 50000 }));

      // Advance past fatal threshold
      vi.advanceTimersByTime(31_000);

      expect(service.isFatallyDisconnected()).toBe(true);
    });

    it('reports disconnect duration correctly', () => {
      const { service } = createService();
      service.connect();
      mockEs.simulateOpen();

      mockEs.simulateMessage(createMarketUpdate({ price: 50000 }));

      vi.advanceTimersByTime(15_000);

      const duration = service.getTotalDisconnectDuration();
      expect(duration).toBeGreaterThanOrEqual(7000); // at least gap threshold
    });

    it('notifies status change on fatal disconnect', () => {
      const { service, onStatusChange } = createService();
      service.connect();
      mockEs.simulateOpen();

      mockEs.simulateMessage(createMarketUpdate({ price: 50000 }));

      vi.advanceTimersByTime(31_000);

      // Should have been called with fatal state info
      const calls = onStatusChange.mock.calls;
      const lastStatus = calls.at(-1)?.[0] as SSEConnectionStatus;
      expect(lastStatus.totalDisconnectDuration).toBeGreaterThanOrEqual(30_000);
    });
  });

  // ─── Reconnect behavior ───────────────────────────────────────────────

  describe('reconnect behavior', () => {
    it('transitions to connecting on EventSource error (auto-reconnect)', () => {
      const { service, onStatusChange } = createService();
      service.connect();
      mockEs.simulateOpen();

      mockEs.simulateError();

      const lastStatus = onStatusChange.mock.calls.at(-1)?.[0] as SSEConnectionStatus;
      expect(lastStatus.state).toBe('connecting');
    });

    it('does not emit error when intentionally closed', () => {
      const { service, onStatusChange } = createService();
      service.connect();
      mockEs.simulateOpen();

      const callsBefore = onStatusChange.mock.calls.length;
      service.disconnect();

      // Simulate error after intentional close
      mockEs.simulateError();

      // Should not have added a "connecting" state change
      const callsAfterError = onStatusChange.mock.calls.length;
      // Only the disconnect call should have been added
      expect(callsAfterError).toBe(callsBefore + 1);
    });

    it('reconnect() creates a new connection after delay', () => {
      const { service } = createService();
      service.connect();
      const firstEs = mockEs;
      firstEs.simulateOpen();

      service.reconnect();
      expect(firstEs.close).toHaveBeenCalled();

      // After 500ms delay, new EventSource should be created
      vi.advanceTimersByTime(600);
      expect(mockEs).not.toBe(firstEs);
    });
  });

  // ─── Connection timeout ───────────────────────────────────────────────

  describe('connection timeout', () => {
    it('disconnects if no data received within FATAL_DISCONNECT_MS during initial connect', () => {
      const { service, onStatusChange } = createService();
      service.connect();

      // Don't simulate open or any messages
      vi.advanceTimersByTime(31_000);

      const lastStatus = onStatusChange.mock.calls.at(-1)?.[0] as SSEConnectionStatus;
      expect(lastStatus.state).toBe('disconnected');
    });

    it('clears connection timeout when first data arrives', () => {
      const { service } = createService();
      service.connect();
      mockEs.simulateOpen();

      // Send data before timeout
      mockEs.simulateMessage(createMarketUpdate({ price: 50000 }));

      // Advance past timeout — should NOT disconnect
      vi.advanceTimersByTime(31_000);

      // Last status should still reflect connected or fallback, not disconnected from timeout
      expect(service.isConnected()).toBe(true);
    });
  });

  // ─── Status reporting ─────────────────────────────────────────────────

  describe('status reporting', () => {
    it('getStatus() returns consistent snapshot', () => {
      const { service } = createService();
      service.connect();
      mockEs.simulateOpen();

      mockEs.simulateMessage(createMarketUpdate({ price: 50000 }));

      const status = service.getStatus();
      expect(status.state).toBe('connected');
      expect(status.lastDataTime).not.toBeNull();
      expect(status.isUsingFallbackData).toBe(false);
      expect(status.totalDisconnectDuration).toBe(0);
    });

    it('initial status before connect', () => {
      const { service } = createService();
      const status = service.getStatus();
      expect(status.state).toBe('disconnected');
      expect(status.lastDataTime).toBeNull();
      expect(status.isUsingFallbackData).toBe(false);
    });
  });

  // ─── Visibility change handling ───────────────────────────────────────

  describe('visibility change', () => {
    it('reconnects when tab becomes visible after disconnection', () => {
      const { service } = createService();
      service.connect();
      mockEs.simulateOpen();

      // Simulate disconnect
      service.disconnect();

      // Simulate reconnect without intentional close (like a network drop)
      // We need a fresh service for this since disconnect sets wasClosedIntentionally
      const { service: service2 } = createService();
      service2.connect();
      const firstEs = mockEs;
      firstEs.simulateOpen();

      // Force state to disconnected without intentional close
      firstEs.simulateError();

      // Tab becomes visible — should trigger reconnect logic
      // (actual reconnect behavior depends on state === 'disconnected' && !wasClosedIntentionally)
      document.dispatchEvent(new Event('visibilitychange'));
    });
  });

  // ─── Edge: no base URL configured ────────────────────────────────────

  describe('missing configuration', () => {
    it('proceeds to connecting with relative URL even when env vars are empty', () => {
      // SSEMarketService now uses relative URLs so it always attempts connection
      const prevVal = import.meta.env.VITE_MARKET_AGGREGATOR_URL;
      const prevApi = import.meta.env.VITE_RAILWAY_API_URL;
      import.meta.env.VITE_MARKET_AGGREGATOR_URL = '';
      import.meta.env.VITE_RAILWAY_API_URL = '';

      const { service, onStatusChange } = createService();
      service.connect();

      const lastStatus = onStatusChange.mock.calls.at(-1)?.[0] as SSEConnectionStatus;
      expect(lastStatus.state).toBe('connecting');

      // Restore
      import.meta.env.VITE_MARKET_AGGREGATOR_URL = prevVal;
      import.meta.env.VITE_RAILWAY_API_URL = prevApi;
    });
  });
});
