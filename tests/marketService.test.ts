import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarketService } from '../services/marketService';

describe('MarketService', () => {
  let service: MarketService | undefined;
  let mockOnData: any;
  let mockOnStatus: any;
  let mockFactory: any;

  beforeEach(() => {
    vi.useFakeTimers();

    mockOnData = vi.fn();
    mockOnStatus = vi.fn();

    // Create a distinct mock object for each connection
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

    // Mock document
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    });
  });

  afterEach(() => {
    if (service) {
      service.destroy();
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should initialize with Binance primary by default', () => {
    service = new MarketService({
      pair: 'BTC',
      onData: mockOnData,
      onStatusChange: mockOnStatus,
      wsFactory: mockFactory,
    });

    service.connect();

    // Only Binance should be connected initially
    expect(mockFactory).toHaveBeenCalledTimes(1);

    const binanceCall = mockFactory.mock.calls[0][0];
    expect(binanceCall).toContain('btcusdt@kline_1s');
  });

  it('should initialize with ETH when configured', () => {
    service = new MarketService({
      pair: 'ETH',
      onData: mockOnData,
      onStatusChange: mockOnStatus,
      wsFactory: mockFactory,
    });

    service.connect();

    const binanceCall = mockFactory.mock.calls[0][0];
    expect(binanceCall).toContain('ethusdt@kline_1s');
  });

  it('should handle Binance connection and status updates', () => {
    service = new MarketService({
      pair: 'BTC',
      onData: mockOnData,
      onStatusChange: mockOnStatus,
      wsFactory: mockFactory,
    });

    service.connect();

    const binanceSocket = mockFactory.mock.results[0].value;
    binanceSocket.onopen();

    expect(mockOnStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        binance: 'connected',
        coinbase: 'disconnected',
      })
    );
  });

  it('should activate Coinbase fallback if Binance fails to connect', () => {
    service = new MarketService({
      pair: 'BTC',
      onData: mockOnData,
      onStatusChange: mockOnStatus,
      wsFactory: mockFactory,
    });

    service.connect();
    const binanceSocket = mockFactory.mock.results[0].value;

    // Simulate Binance error
    binanceSocket.onerror(new Error('Connection failed'));

    // Should now connect to Coinbase
    expect(mockFactory).toHaveBeenCalledTimes(2);
    const fallbackCall = mockFactory.mock.calls[1][0];
    expect(fallbackCall).toContain('coinbase');

    expect(mockOnStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        coinbase: 'connecting',
      })
    );
  });

  it('should handle incoming messages from Binance', () => {
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

    binanceSocket.onmessage({ data: JSON.stringify(testData) });

    expect(mockOnData).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'binance',
        price: 3000,
        pair: 'ETH',
      })
    );
    expect(service.getPrice()).toBe(3000);
  });

  it('should reconnect Binance on close with exponential backoff', () => {
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

    // Advanced timers for 1st reconnect
    vi.advanceTimersByTime(1000); // INITIAL_RECONNECT_DELAY
    expect(mockFactory).toHaveBeenCalledTimes(3); // 1 initial + 1 fallback (activated on close) + 1 reconnect

    // Verify Coinbase was also activated as fallback
    expect(mockFactory.mock.calls[1][0]).toContain('coinbase');
  });

  it('should pause connections when document is hidden', () => {
    service = new MarketService({
      pair: 'BTC',
      onData: mockOnData,
      onStatusChange: mockOnStatus,
      wsFactory: mockFactory,
    });

    service.connect();
    const binanceSocket = mockFactory.mock.results[0].value;

    // Mock document.hidden = true
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    });

    // Trigger visibilitychange
    document.dispatchEvent(new Event('visibilitychange'));

    expect(binanceSocket.close).toHaveBeenCalled();
    expect(service.getStatus().binance).toBe('disconnected');
  });

  it('should return fallback prices when never connected', () => {
    service = new MarketService({
      pair: 'BTC',
      onData: mockOnData,
      onStatusChange: mockOnStatus,
      wsFactory: mockFactory,
    });

    expect(service.getPrice()).toBe(43000); // Static fallback for BTC
    expect(service.isOfflineMode()).toBe(true);
  });

  it('should disconnect cleanly and stop timers', () => {
    service = new MarketService({
      pair: 'BTC',
      onData: mockOnData,
      onStatusChange: mockOnStatus,
      wsFactory: mockFactory,
    });

    service.connect();
    const binanceSocket = mockFactory.mock.results[0].value;

    service.disconnect();

    expect(binanceSocket.close).toHaveBeenCalled();
    expect(mockOnStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        binance: 'disconnected',
      })
    );

    // Ensure no more reconnects happen
    vi.advanceTimersByTime(30000);
    expect(mockFactory).toHaveBeenCalledTimes(1);
  });
});
