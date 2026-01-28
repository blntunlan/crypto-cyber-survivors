/**
 * MarketService Unit Tests
 *
 * Tests for the real-time Bitcoin price WebSocket client.
 * Covers connection management, failover logic, and data parsing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MarketService,
  type MarketServiceConfig,
  type MarketUpdate,
  type ConnectionStatus,
} from './MarketService';

// Mock Logger to prevent console output during tests
vi.mock('../system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock constants
vi.mock('../../constants', () => ({
  COINBASE_WS_URL: 'wss://mock-coinbase.com',
  getBinanceWsUrl: vi.fn(() => 'wss://mock-binance.com'),
  MARKET: {
    RECONNECT: {
      INITIAL_DELAY: 100,
      MAX_DELAY: 1000,
      MULTIPLIER: 1.5,
      FORCE_RECONNECT_DELAY: 50,
    },
    STALE_PRICE_THRESHOLD_MS: 10000,
    FALLBACK_PRICES: {
      BTC: 43000,
      ETH: 2300,
      SOL: 100,
    },
  },
}));

// Mock market schemas
vi.mock('../../schemas/marketSchemas', () => ({
  parseBinanceData: vi.fn((data: unknown) => {
    const d = data as { price?: number; c?: string };
    if (d.price) {
      return { price: d.price, source: 'binance' as const };
    }
    if (d.c) {
      return { price: parseFloat(d.c), source: 'binance' as const };
    }
    return null;
  }),
  parseCoinbaseData: vi.fn((data: unknown) => {
    const d = data as { price?: string; type?: string };
    if (d.type === 'ticker' && d.price) {
      return { price: parseFloat(d.price), source: 'coinbase' as const };
    }
    return null;
  }),
  isCoinbaseSubscription: vi.fn((data: unknown) => {
    const d = data as { type?: string };
    return d.type === 'subscriptions';
  }),
}));

// Mock crypto pairs
vi.mock('../../types/crypto', () => ({
  CRYPTO_PAIRS: {
    BTC: {
      symbol: 'BTCUSDT',
      binanceSymbol: 'btcusdt',
      coinbaseProductId: 'BTC-USD',
    },
    ETH: {
      symbol: 'ETHUSDT',
      binanceSymbol: 'ethusdt',
      coinbaseProductId: 'ETH-USD',
    },
    SOL: {
      symbol: 'SOLUSDT',
      binanceSymbol: 'solusdt',
      coinbaseProductId: 'SOL-USD',
    },
  },
}));

/**
 * Mock WebSocket implementation for testing
 */
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  private closeWasCalled = false;

  constructor(url: string) {
    this.url = url;
  }

  send(data: string): void {
    // Mock send - do nothing
    void data;
  }

  close(): void {
    this.closeWasCalled = true;
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  // Test helpers
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateMessage(data: unknown): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  wasCloseCalled(): boolean {
    return this.closeWasCalled;
  }
}

describe('MarketService', () => {
  let service: MarketService;
  let mockOnData: (update: MarketUpdate) => void;
  let mockOnStatusChange: (status: ConnectionStatus) => void;
  let mockWebSockets: MockWebSocket[];
  let wsFactory: (url: string) => MockWebSocket;

  beforeEach(() => {
    vi.useFakeTimers();
    mockOnData = vi.fn() as unknown as (update: MarketUpdate) => void;
    mockOnStatusChange = vi.fn() as unknown as (status: ConnectionStatus) => void;
    mockWebSockets = [];

    wsFactory = (url: string) => {
      const ws = new MockWebSocket(url);
      mockWebSockets.push(ws);
      return ws;
    };

    // Mock document.hidden and visibility change
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    mockWebSockets = [];
  });

  const createService = (pair: 'BTC' | 'ETH' | 'SOL' = 'BTC'): MarketService => {
    const config: MarketServiceConfig = {
      pair,
      onData: mockOnData,
      onStatusChange: mockOnStatusChange,
      wsFactory: wsFactory as unknown as (url: string) => WebSocket,
    };
    return new MarketService(config);
  };

  describe('Connection Management', () => {
    it('should create a MarketService instance', () => {
      service = createService();
      expect(service).toBeInstanceOf(MarketService);
    });

    it('should connect to Binance on connect()', () => {
      service = createService();
      service.connect();

      expect(mockWebSockets.length).toBe(1);
      expect(mockWebSockets[0]?.url).toBe('wss://mock-binance.com');
    });

    it('should update status to connecting when connecting', () => {
      service = createService();
      service.connect();

      expect(mockOnStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({
          binance: 'connecting',
        })
      );
    });

    it('should update status to connected when Binance opens', () => {
      service = createService();
      service.connect();

      mockWebSockets[0]?.simulateOpen();

      expect(mockOnStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({
          binance: 'connected',
        })
      );
    });

    it('should return correct connection status', () => {
      service = createService();
      service.connect();
      mockWebSockets[0]?.simulateOpen();

      const status = service.getStatus();
      expect(status.binance).toBe('connected');
      expect(status.coinbase).toBe('disconnected');
    });

    it('should return true for isConnected() when Binance is connected', () => {
      service = createService();
      service.connect();
      mockWebSockets[0]?.simulateOpen();

      expect(service.isConnected()).toBe(true);
    });

    it('should return false for isConnected() when disconnected', () => {
      service = createService();
      expect(service.isConnected()).toBe(false);
    });
  });

  describe('Data Processing', () => {
    it('should call onData callback when receiving valid Binance data', () => {
      service = createService();
      service.connect();
      mockWebSockets[0]?.simulateOpen();

      mockWebSockets[0]?.simulateMessage({ price: 45000 });

      expect(mockOnData).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 45000,
          source: 'binance',
          pair: 'BTC',
        })
      );
    });

    it('should update lastKnownPrice when receiving data', () => {
      service = createService();
      service.connect();
      mockWebSockets[0]?.simulateOpen();

      mockWebSockets[0]?.simulateMessage({ price: 45000 });

      expect(service.getLastKnownPrice()).toBe(45000);
    });

    it('should return fallback price when no data received', () => {
      service = createService();
      expect(service.getPrice()).toBe(43000); // BTC fallback
    });

    it('should return last known price when available', () => {
      service = createService();
      service.connect();
      mockWebSockets[0]?.simulateOpen();
      mockWebSockets[0]?.simulateMessage({ price: 45000 });

      expect(service.getPrice()).toBe(45000);
    });

    it('should ignore messages for wrong symbol', () => {
      service = createService();
      service.connect();
      mockWebSockets[0]?.simulateOpen();

      // Message with wrong symbol
      mockWebSockets[0]?.simulateMessage({ s: 'ETHUSDT', price: 2500 });

      // Should not update price
      expect(service.getLastKnownPrice()).toBeNull();
    });
  });

  describe('Failover Logic', () => {
    it('should activate Coinbase fallback when Binance fails', () => {
      service = createService();
      service.connect();

      // Simulate Binance error
      mockWebSockets[0]?.simulateError();

      // Should have created a second WebSocket for Coinbase
      expect(mockWebSockets.length).toBe(2);
      expect(mockWebSockets[1]?.url).toBe('wss://mock-coinbase.com');
    });

    it('should disconnect Coinbase when Binance recovers', () => {
      service = createService();
      service.connect();

      // Simulate Binance error to trigger Coinbase fallback
      mockWebSockets[0]?.simulateError();

      // Coinbase connects
      mockWebSockets[1]?.simulateOpen();

      // Advance timers for reconnect
      vi.advanceTimersByTime(100);

      // New Binance connection created
      const binanceWs = mockWebSockets.find(
        ws => ws.url === 'wss://mock-binance.com' && !ws.wasCloseCalled()
      );
      binanceWs?.simulateOpen();

      // Coinbase should be disconnected
      expect(mockOnStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({
          coinbase: 'disconnected',
        })
      );
    });

    it('should schedule reconnect with exponential backoff', () => {
      service = createService();
      service.connect();

      // Close Binance connection
      mockWebSockets[0]?.close();

      // First reconnect attempt after initial delay
      vi.advanceTimersByTime(100);
      expect(mockWebSockets.length).toBeGreaterThan(1);

      // Close again
      const newBinance = mockWebSockets[mockWebSockets.length - 1];
      newBinance?.close();

      // Second reconnect should take longer (100 * 1.5 = 150ms)
      vi.advanceTimersByTime(150);
      expect(mockWebSockets.length).toBeGreaterThan(2);
    });
  });

  describe('Disconnect', () => {
    it('should close all connections on disconnect()', () => {
      service = createService();
      service.connect();
      mockWebSockets[0]?.simulateOpen();

      service.disconnect();

      expect(mockWebSockets[0]?.wasCloseCalled()).toBe(true);
      expect(service.isConnected()).toBe(false);
    });

    it('should not reconnect after intentional disconnect', () => {
      service = createService();
      service.connect();
      mockWebSockets[0]?.simulateOpen();

      service.disconnect();

      // Advance timers
      vi.advanceTimersByTime(10000);

      // Should not have created new connections
      expect(mockWebSockets.length).toBe(1);
    });

    it('should update status to disconnected on disconnect()', () => {
      service = createService();
      service.connect();
      mockWebSockets[0]?.simulateOpen();

      service.disconnect();

      expect(mockOnStatusChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          binance: 'disconnected',
          coinbase: 'disconnected',
        })
      );
    });
  });

  describe('Offline Mode', () => {
    it('should return true for isOfflineMode() when never connected', () => {
      service = createService();
      expect(service.isOfflineMode()).toBe(true);
    });

    it('should return false for isOfflineMode() after receiving data', () => {
      service = createService();
      service.connect();
      mockWebSockets[0]?.simulateOpen();
      mockWebSockets[0]?.simulateMessage({ price: 45000 });

      expect(service.isOfflineMode()).toBe(false);
    });

    it('should return false for isOfflineMode() when connected but no data yet', () => {
      service = createService();
      service.connect();
      mockWebSockets[0]?.simulateOpen();

      // Connected but no data - still offline mode
      expect(service.isOfflineMode()).toBe(false);
    });
  });

  describe('Multiple Pairs', () => {
    it('should connect to correct Binance URL for ETH', () => {
      service = createService('ETH');
      service.connect();

      expect(mockWebSockets[0]?.url).toBe('wss://mock-binance.com');
    });

    it('should return correct fallback price for ETH', () => {
      service = createService('ETH');
      expect(service.getPrice()).toBe(2300);
    });

    it('should return correct fallback price for SOL', () => {
      service = createService('SOL');
      expect(service.getPrice()).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parse errors gracefully', () => {
      service = createService();
      service.connect();
      mockWebSockets[0]?.simulateOpen();

      // Simulate invalid JSON message
      if (mockWebSockets[0]?.onmessage) {
        mockWebSockets[0].onmessage(
          new MessageEvent('message', { data: 'invalid json' })
        );
      }

      // Should not throw and should not update price
      expect(service.getLastKnownPrice()).toBeNull();
    });

    it('should handle WebSocket errors without crashing', () => {
      service = createService();
      service.connect();

      // Should not throw
      expect(() => {
        mockWebSockets[0]?.simulateError();
      }).not.toThrow();
    });

    it('should update status to reconnecting on connection close', () => {
      service = createService();
      service.connect();
      mockWebSockets[0]?.simulateOpen();

      // Close without intentional disconnect
      if (mockWebSockets[0]?.onclose) {
        mockWebSockets[0].onclose(new CloseEvent('close'));
      }

      expect(mockOnStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({
          binance: 'reconnecting',
        })
      );
    });
  });

  describe('Coinbase Connection', () => {
    it('should send subscription message when Coinbase connects', () => {
      service = createService();
      service.connect();

      // Trigger Coinbase fallback
      mockWebSockets[0]?.simulateError();

      // Spy on send
      const coinbaseWs = mockWebSockets[1];
      const sendSpy = vi.spyOn(coinbaseWs!, 'send');

      coinbaseWs?.simulateOpen();

      expect(sendSpy).toHaveBeenCalledWith(expect.stringContaining('subscribe'));
    });

    it('should process Coinbase ticker data', () => {
      service = createService();
      service.connect();

      // Trigger Coinbase fallback
      mockWebSockets[0]?.simulateError();
      mockWebSockets[1]?.simulateOpen();

      // Send ticker data
      mockWebSockets[1]?.simulateMessage({ type: 'ticker', price: '44000' });

      expect(mockOnData).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 44000,
          source: 'coinbase',
          pair: 'BTC',
        })
      );
    });

    it('should ignore Coinbase subscription responses', () => {
      service = createService();
      service.connect();

      // Trigger Coinbase fallback
      mockWebSockets[0]?.simulateError();
      mockWebSockets[1]?.simulateOpen();

      // Send subscription response
      mockWebSockets[1]?.simulateMessage({ type: 'subscriptions' });

      // Should not call onData for subscription messages
      expect(mockOnData).not.toHaveBeenCalled();
    });
  });
});
