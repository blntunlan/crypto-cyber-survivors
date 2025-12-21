import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarketService } from '../services/marketService';

describe('MarketService', () => {
  let service: MarketService;
  let mockOnData: any;
  let mockOnStatus: any;
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
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with BTC by default configuration', () => {
    service = new MarketService({
      pair: 'BTC',
      onData: mockOnData,
      onStatusChange: mockOnStatus,
      wsFactory: mockFactory,
    });

    service.connect();

    // Binance and Coinbase
    expect(mockFactory).toHaveBeenCalledTimes(2);

    // Verify Binance URL for BTC
    const binanceCall = mockFactory.mock.calls[0][0];
    expect(binanceCall).toContain('btcusdt@ticker');
  });

  it('should initialize with ETH when configured', () => {
    service = new MarketService({
      pair: 'ETH',
      onData: mockOnData,
      onStatusChange: mockOnStatus,
      wsFactory: mockFactory,
    });

    service.connect();

    // Verify Binance URL for ETH
    const binanceCall = mockFactory.mock.calls[0][0];
    expect(binanceCall).toContain('ethusdt@ticker');
  });

  it('should initialize with SOL when configured', () => {
    service = new MarketService({
      pair: 'SOL',
      onData: mockOnData,
      onStatusChange: mockOnStatus,
      wsFactory: mockFactory,
    });

    service.connect();

    // Verify Binance URL for SOL
    const binanceCall = mockFactory.mock.calls[0][0];
    expect(binanceCall).toContain('solusdt@ticker');
  });

  it('should handle successful connection and status updates', () => {
    service = new MarketService({
      pair: 'BTC',
      onData: mockOnData,
      onStatusChange: mockOnStatus,
      wsFactory: mockFactory,
    });

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

  it('should handle incoming messages from Binance with correct pair info', () => {
    service = new MarketService({
      pair: 'ETH',
      onData: mockOnData,
      onStatusChange: mockOnStatus,
      wsFactory: mockFactory,
    });

    service.connect();
    const binanceSocket = mockFactory.mock.results[0].value;
    binanceSocket.onopen();

    const testData = {
      s: 'ETHUSDT',
      c: '3000.00',
      h: '3100.00',
      l: '2900.00',
      v: '500.0',
    };

    // Simulate message
    binanceSocket.onmessage({ data: JSON.stringify(testData) });

    expect(mockOnData).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'binance',
        price: 3000,
        high: 3100,
        low: 2900,
        volume: 500,
        pair: 'ETH', // Verify pair is passed correctly
      })
    );
  });

  it('should reconnect on close using the correct URL', () => {
    service = new MarketService({
      pair: 'SOL',
      onData: mockOnData,
      onStatusChange: mockOnStatus,
      wsFactory: mockFactory,
    });

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

    // Verify reconnect URL matches the configured pair
    const reconnectCall = mockFactory.mock.calls[2][0];
    expect(reconnectCall).toContain('solusdt@ticker');
  });

  it('should disconnect cleanly', () => {
    service = new MarketService({
      pair: 'BTC',
      onData: mockOnData,
      onStatusChange: mockOnStatus,
      wsFactory: mockFactory,
    });

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
