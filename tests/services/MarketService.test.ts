import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MarketService,
  type MarketUpdate,
  type ConnectionStatus,
} from '../../services/MarketService';
import { Logger } from '../../services/Logger';

// Mock Logger
vi.mock('../../services/Logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock WebSocket
class MockWebSocket {
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: any) => void) | null = null;
  readyState: number = 0; // CONNECTING

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = 1; // OPEN
      this.onopen?.();
    }, 0);
  }

  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = 3; // CLOSED
    this.onclose?.();
  });
}

describe('MarketService', () => {
  let onData: (update: MarketUpdate) => void;
  let onStatusChange: (status: ConnectionStatus) => void;
  let marketService: MarketService;
  let mockSockets: MockWebSocket[] = [];

  const wsFactory = (url: string) => {
    const ws = new MockWebSocket(url);
    mockSockets.push(ws);
    return ws as unknown as WebSocket;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    mockSockets = [];
    onData = vi.fn();
    onStatusChange = vi.fn();
    marketService = new MarketService({
      pair: 'BTC',
      onData,
      onStatusChange,
      wsFactory,
    });
  });

  afterEach(() => {
    marketService.destroy();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Connection Logic', () => {
    it('should connect to Binance primary source', async () => {
      marketService.connect();
      expect(mockSockets.length).toBe(1);
      expect(mockSockets[0]!.url).toContain('binance.com');

      await vi.runAllTimersAsync();
      expect(onStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({
          binance: 'connected',
        })
      );
    });

    it('should parse Binance kline messages', async () => {
      marketService.connect();
      await vi.runAllTimersAsync();

      const klineMessage = {
        e: 'kline',
        E: 123456789,
        s: 'BTCUSDT',
        k: {
          c: '50000.00',
          h: '51000.00',
          l: '49000.00',
          v: '100.0',
          t: 0,
          T: 0,
          s: '',
          i: '',
          o: '',
          n: 0,
          x: false,
          q: '',
        },
      };

      mockSockets[0]!.onmessage?.({ data: JSON.stringify(klineMessage) });

      expect(onData).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 50000,
          source: 'binance',
          pair: 'BTC',
        })
      );
      expect(marketService.getPrice()).toBe(50000);
    });

    it('should fallback to Coinbase if Binance fails', async () => {
      marketService.connect();
      await vi.runAllTimersAsync();

      // Simulate Binance error
      mockSockets[0]!.onerror?.(new Error('Connection failed'));

      expect(mockSockets.length).toBe(2);
      expect(mockSockets[1]!.url).toContain('coinbase.com');

      await vi.runAllTimersAsync();
      expect(onStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({
          coinbase: 'connected',
        })
      );
    });

    it('should parse Coinbase ticker messages', async () => {
      marketService.connect();
      await vi.runAllTimersAsync();

      // Fail Binance to get to Coinbase
      mockSockets[0]!.onerror?.(new Error('Fail'));
      await vi.runAllTimersAsync();

      const coinbaseMessage = {
        type: 'ticker',
        product_id: 'BTC-USD',
        price: '52000.50',
      };

      mockSockets[1]!.onmessage?.({ data: JSON.stringify(coinbaseMessage) });

      expect(onData).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 52000.5,
          source: 'coinbase',
        })
      );
    });

    it('should handle invalid JSON from sources', async () => {
      marketService.connect();
      await vi.runAllTimersAsync();

      // Invalid JSON for Binance
      mockSockets[0]!.onmessage?.({ data: 'invalid-json' });
      expect(Logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Binance'),
        expect.objectContaining({ error: expect.any(String) })
      );

      // Fail Binance to get to Coinbase
      mockSockets[0]!.onerror?.(new Error('Fail'));
      await vi.runAllTimersAsync();

      // Invalid JSON for Coinbase
      mockSockets[1]!.onmessage?.({ data: 'invalid-json' });
      expect(Logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Coinbase'),
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it('should handle failed schema parsing', async () => {
      marketService.connect();
      await vi.runAllTimersAsync();

      // Unknown message type for Binance
      mockSockets[0]!.onmessage?.({ data: JSON.stringify({ type: 'unknown' }) });

      mockSockets[0]!.onerror?.(new Error('Fail'));
      await vi.runAllTimersAsync();
      mockSockets[1]!.onmessage?.({ data: JSON.stringify({ type: 'unknown' }) });
    });

    it('should handle wsFactory throwing error', async () => {
      const errorMarketService = new MarketService({
        pair: 'BTC',
        onData: vi.fn(),
        onStatusChange: vi.fn(),
        wsFactory: () => {
          throw new Error('Crashed');
        },
      });

      // Should not throw but log error and activate fallback
      errorMarketService.connect();
      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining('failed'),
        expect.any(Error)
      );
    });

    it('should ignore Coinbase subscription messages', async () => {
      marketService.connect();
      await vi.runAllTimersAsync();
      mockSockets[0]!.onerror?.(new Error('Fail'));
      await vi.runAllTimersAsync();

      const subMsg = { type: 'subscriptions', channels: [] };
      // Should not call onData
      mockSockets[1]!.onmessage?.({ data: JSON.stringify(subMsg) });
      expect(onData).not.toHaveBeenCalled();
    });
  });

  describe('Pair Validation', () => {
    it('should ignore Binance messages from wrong pair', async () => {
      // Create SOL market service
      const solMarketService = new MarketService({
        pair: 'SOL',
        onData,
        onStatusChange,
        wsFactory,
      });

      solMarketService.connect();
      await vi.runAllTimersAsync();

      // Send BTC message (wrong pair) to SOL service
      const btcMessage = {
        e: 'kline',
        E: 123456789,
        s: 'BTCUSDT', // Wrong pair!
        k: {
          c: '50000.00',
          h: '51000.00',
          l: '49000.00',
          v: '100.0',
          t: 0,
          T: 0,
          s: 'BTCUSDT',
          i: '',
          o: '',
          n: 0,
          x: false,
          q: '',
        },
      };

      mockSockets[mockSockets.length - 1]!.onmessage?.({
        data: JSON.stringify(btcMessage),
      });

      // Should NOT call onData because pair doesn't match
      expect(onData).not.toHaveBeenCalled();
      expect(Logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Ignoring Binance message for wrong pair')
      );

      solMarketService.destroy();
    });

    it('should process Binance messages from correct pair', async () => {
      // Create SOL market service
      const solMarketService = new MarketService({
        pair: 'SOL',
        onData,
        onStatusChange,
        wsFactory,
      });

      solMarketService.connect();
      await vi.runAllTimersAsync();

      // Send SOL message (correct pair)
      const solMessage = {
        e: 'kline',
        E: 123456789,
        s: 'SOLUSDT', // Correct pair!
        k: {
          c: '100.00',
          h: '105.00',
          l: '95.00',
          v: '1000.0',
          t: 0,
          T: 0,
          s: 'SOLUSDT',
          i: '',
          o: '',
          n: 0,
          x: false,
          q: '',
        },
      };

      mockSockets[mockSockets.length - 1]!.onmessage?.({
        data: JSON.stringify(solMessage),
      });

      // Should call onData with correct pair
      expect(onData).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 100,
          pair: 'SOL',
        })
      );

      solMarketService.destroy();
    });

    it('should ignore Coinbase messages from wrong pair', async () => {
      marketService.connect();
      await vi.runAllTimersAsync();

      // Fail Binance to get Coinbase
      mockSockets[0]!.onerror?.(new Error('Fail'));
      await vi.runAllTimersAsync();

      // Send ETH message to BTC service (wrong pair)
      const ethMessage = {
        type: 'ticker',
        product_id: 'ETH-USD', // Wrong pair for BTC service!
        price: '2300.50',
      };

      mockSockets[1]!.onmessage?.({ data: JSON.stringify(ethMessage) });

      // Should NOT call onData because pair doesn't match
      expect(onData).not.toHaveBeenCalled();
      expect(Logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Ignoring Coinbase message for wrong pair')
      );
    });

    it('should process Coinbase messages from correct pair', async () => {
      marketService.connect();
      await vi.runAllTimersAsync();

      // Fail Binance to get Coinbase
      mockSockets[0]!.onerror?.(new Error('Fail'));
      await vi.runAllTimersAsync();

      // Send BTC message (correct pair)
      const btcMessage = {
        type: 'ticker',
        product_id: 'BTC-USD', // Correct pair!
        price: '52000.50',
      };

      mockSockets[1]!.onmessage?.({ data: JSON.stringify(btcMessage) });

      // Should call onData with correct pair
      expect(onData).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 52000.5,
          pair: 'BTC',
        })
      );
    });
  });

  describe('State Management', () => {
    it('should return correct status', async () => {
      marketService.connect();
      await vi.runAllTimersAsync();

      const status = marketService.getStatus();
      expect(status.binance).toBe('connected');
      expect(status.coinbase).toBe('disconnected');
    });

    it('should handle offline mode with fallback prices', () => {
      expect(marketService.isOfflineMode()).toBe(true);
      expect(marketService.getPrice()).toBe(43000); // BTC fallback
    });

    it('should not be in offline mode after receiving prices', async () => {
      marketService.connect();
      await vi.runAllTimersAsync();

      mockSockets[0]!.onmessage?.({
        data: JSON.stringify({
          e: 'kline',
          E: 0,
          s: 'BTC',
          k: {
            c: '50000',
            h: '50000',
            l: '50000',
            v: '0',
            t: 0,
            T: 0,
            s: '',
            i: '',
            o: '',
            n: 0,
            x: false,
            q: '',
          },
        }),
      });

      expect(marketService.isOfflineMode()).toBe(false);
    });
  });

  describe('Reconnection & Failover', () => {
    it('should implement exponential backoff on Binance close', async () => {
      marketService.connect();
      await vi.runAllTimersAsync();

      // First close - should reconnect in 1000ms
      mockSockets[0]!.onclose?.();
      expect(onStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({
          binance: 'reconnecting',
        })
      );

      // Advance 1000ms
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockSockets.length).toBe(3); // Binance(1) + CoinbaseFallback(2) + BinanceReconnect(3)

      // If third one also fails, delay should double to 2000ms
      mockSockets[2]!.onclose?.();
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockSockets.length).toBe(3); // Not yet

      await vi.advanceTimersByTimeAsync(1000);
      expect(mockSockets.length).toBe(4); // Reconnect happened at 2000ms
    });

    it('should pause connections when tab is hidden', async () => {
      marketService.connect();
      await vi.runAllTimersAsync();

      // Mock document.hidden
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(mockSockets[0]!.close).toHaveBeenCalled();
      expect(marketService.getStatus().binance).toBe('disconnected');
    });

    it('should implement exponential backoff on Coinbase close', async () => {
      marketService.connect();
      await vi.runAllTimersAsync();

      // Force Coinbase to connect
      mockSockets[0]!.onerror?.(new Error('Binance fail'));
      await vi.runAllTimersAsync();

      // Now close Coinbase
      mockSockets[1]!.onclose?.();
      expect(onStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({
          coinbase: 'reconnecting',
        })
      );

      // Advance 1000ms
      await vi.advanceTimersByTimeAsync(1000);
      // BinanceReconnect(3) + CoinbaseReconnect(4)
      expect(mockSockets.length).toBeGreaterThanOrEqual(3);
    });

    it('should force reconnect', async () => {
      marketService.connect();
      await vi.runAllTimersAsync();

      const disconnectSpy = vi.spyOn(marketService, 'disconnect');
      marketService.reconnect();

      expect(disconnectSpy).toHaveBeenCalled();

      // Advance 500ms
      await vi.advanceTimersByTimeAsync(600);
      // Should have called connect() which adds another socket
      expect(mockSockets.length).toBeGreaterThanOrEqual(2);
    });

    it('should resume connections when tab becomes visible', async () => {
      marketService.connect();
      await vi.runAllTimersAsync();

      // Hide
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      // Clear mockSockets to start fresh for resonance
      mockSockets = [];

      // Visible
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      // Should connect to both binance and coinbase on resume
      expect(mockSockets.length).toBeGreaterThanOrEqual(1);
      expect(mockSockets.some(ws => ws.url.includes('binance.com'))).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should clear timers and sockets on disconnect', async () => {
      marketService.connect();
      await vi.runAllTimersAsync();

      marketService.disconnect();
      expect(mockSockets[0]!.close).toHaveBeenCalled();

      // Reset mock to check if new sockets are created
      const currentCount = mockSockets.length;

      // Try to trigger a timer that was potentially scheduled
      mockSockets[0]!.onclose?.(); // Would normally trigger reconnect
      await vi.advanceTimersByTimeAsync(5000);
      expect(mockSockets.length).toBe(currentCount); // No new sockets
    });

    it('should remove event listeners on destroy', () => {
      marketService.connect(); // This sets up the visibility handler
      const removeSpy = vi.spyOn(document, 'removeEventListener');
      marketService.destroy();
      expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });
  });
});
