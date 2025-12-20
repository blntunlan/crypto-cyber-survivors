import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarketService, MarketUpdate, ConnectionStatus } from '../services/marketService';

describe('MarketService', () => {
  let service: MarketService;
  let mockOnData: any;
  let mockOnStatus: any;
  let mockWebSocket: any;
  let mockFactory: any;

  beforeEach(() => {
    vi.useFakeTimers();

    mockOnData = vi.fn();
    mockOnStatus = vi.fn();

    // Create a distinct mock object for each connection to separate state if needed,
    // but for simplicity we can return a fresh object from factory each time.
    mockFactory = vi.fn(() => {
      return {
        onopen: null,
        onmessage: null,
        onclose: null,
        onerror: null,
        close: vi.fn(),
        send: vi.fn(),
        readyState: 1, // OPEN
      };
    });

    service = new MarketService(mockOnData, mockOnStatus, mockFactory);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should connect to both sources on init', () => {
    service.connect();

    // Binance and Coinbase
    expect(mockFactory).toHaveBeenCalledTimes(2);
  });

  it('should handle successful connection', () => {
    service.connect();

    // Get the mocked socket instances
    const binanceSocket = mockFactory.mock.results[0].value;
    const coinbaseSocket = mockFactory.mock.results[1].value;

    // Simulate open
    expect(binanceSocket.onopen).toBeDefined();
    binanceSocket.onopen();

    expect(mockOnStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        binance: 'connected',
      })
    );

    expect(coinbaseSocket.onopen).toBeDefined();
    coinbaseSocket.onopen();

    expect(mockOnStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        coinbase: 'connected',
      })
    );
  });

  it('should handle incoming messages from Binance', () => {
    service.connect();
    const binanceSocket = mockFactory.mock.results[0].value;
    binanceSocket.onopen();

    const testData = {
      s: 'BTCUSDT',
      c: '50000.00',
      h: '51000.00',
      l: '49000.00',
      v: '100.0',
    };

    // Simulate message
    binanceSocket.onmessage({ data: JSON.stringify(testData) });

    expect(mockOnData).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'binance',
        price: 50000,
        high: 51000,
        low: 49000,
        volume: 100,
      })
    );
  });

  it('should reconnect on close', () => {
    service.connect();
    const binanceSocket = mockFactory.mock.results[0].value;
    binanceSocket.onopen();

    // Simulate close
    binanceSocket.onclose();

    expect(mockOnStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        binance: 'reconnecting',
      })
    );

    // Advance timers to trigger reconnect
    vi.advanceTimersByTime(1000); // INITIAL_RECONNECT_DELAY

    // Should have called factory again
    expect(mockFactory).toHaveBeenCalledTimes(3); // 2 initial + 1 reconnect
  });

  it('should disconnect cleanly', () => {
    service.connect();
    const binanceSocket = mockFactory.mock.results[0].value;
    const coinbaseSocket = mockFactory.mock.results[1].value;

    service.disconnect();

    expect(binanceSocket.close).toHaveBeenCalled();
    expect(coinbaseSocket.close).toHaveBeenCalled();

    expect(mockOnStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        binance: 'disconnected',
        coinbase: 'disconnected',
      })
    );
  });
});
