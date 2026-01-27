/**
 * MarketService Integration Tests
 *
 * Bu testler WebSocket bağlantılarını mock ederek test eder.
 * Mock-based tests run in CI environments without network access.
 *
 * Çalıştırmak için:
 *   npm run test -- --grep "MarketService Integration"
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { MarketService, type MarketUpdate } from '../../services/market/MarketService';

// Helper to create mock WebSocket factory
const createMockWsFactory = (config: {
  shouldFail?: boolean;
  source?: 'binance' | 'coinbase';
  pair?: string;
  prices?: number[];
  updateInterval?: number;
}) => {
  const {
    shouldFail = false,
    source = 'binance',
    pair = 'BTC',
    prices = [50000, 50100, 50050],
    updateInterval = 50,
  } = config;

  return (url: string) => {
    let priceIndex = 0;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const mockWs = {
      onopen: null as ((ev: Event) => void) | null,
      onmessage: null as ((ev: MessageEvent) => void) | null,
      onclose: null as ((ev: CloseEvent) => void) | null,
      onerror: null as ((ev: Event) => void) | null,
      readyState: 0,
      close: vi.fn(() => {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        mockWs.readyState = 3; // CLOSED
        mockWs.onclose?.({ code: 1000 } as CloseEvent);
      }),
      send: vi.fn(),
    };

    if (shouldFail) {
      setTimeout(() => {
        mockWs.onerror?.({} as Event);
        mockWs.onclose?.({ code: 1006 } as CloseEvent);
      }, 50);
    } else {
      setTimeout(() => {
        mockWs.readyState = 1; // OPEN
        mockWs.onopen?.({} as Event);

        // Send mock price updates
        intervalId = setInterval(() => {
          if (priceIndex < prices.length) {
            const price = prices[priceIndex++];
            if (price === undefined) return;

            if (url.includes('binance.com') || source === 'binance') {
              // Use BinanceFuturesKlineSchema format (e: 'kline', k: { ... })
              const now = Date.now();
              mockWs.onmessage?.({
                data: JSON.stringify({
                  e: 'kline',
                  E: now,
                  s: `${pair}USDT`,
                  k: {
                    t: now - 1000,
                    T: now,
                    s: `${pair}USDT`,
                    i: '1s',
                    o: price.toString(),
                    c: price.toString(),
                    h: (price * 1.001).toString(),
                    l: (price * 0.999).toString(),
                    v: '100.5',
                    n: 50,
                    x: false,
                    q: (price * 100).toString(),
                  },
                }),
              } as MessageEvent);
            } else {
              mockWs.onmessage?.({
                data: JSON.stringify({
                  type: 'ticker',
                  product_id: `${pair}-USD`,
                  price: price.toString(),
                  time: new Date().toISOString(),
                }),
              } as MessageEvent);
            }
          }
        }, updateInterval);
      }, 50);
    }

    return mockWs as unknown as WebSocket;
  };
};

describe('MarketService Integration', () => {
  let marketService: MarketService | null = null;

  afterEach(() => {
    if (marketService) {
      marketService.destroy();
      marketService = null;
    }
  });

  describe('Binance Connection (Mocked)', () => {
    it('should connect to Binance and receive price updates', async () => {
      const updates: MarketUpdate[] = [];
      const mockPrices = [50000, 50100, 50050, 49900, 50200];

      const wsFactory = createMockWsFactory({
        source: 'binance',
        pair: 'BTC',
        prices: mockPrices,
        updateInterval: 50,
      });

      marketService = new MarketService({
        pair: 'BTC',
        onData: update => {
          updates.push(update);
        },
        wsFactory,
      });

      marketService.connect();

      // Wait for updates
      await new Promise<void>(resolve => {
        const timeout = setTimeout(() => resolve(), 1000);
        const checkInterval = setInterval(() => {
          if (updates.length >= 3) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            resolve();
          }
        }, 50);
      });

      // Verify updates
      expect(updates.length).toBeGreaterThan(0);
      expect(updates[0]?.source).toBe('binance');
      expect(updates[0]?.price).toBeGreaterThan(0);
      expect(updates[0]?.pair).toBe('BTC');
    });

    it('should handle different crypto pairs', async () => {
      const pairs: ('BTC' | 'ETH' | 'SOL')[] = ['BTC', 'ETH', 'SOL'];
      const pairPrices: Record<string, number> = {
        BTC: 50000,
        ETH: 3000,
        SOL: 100,
      };
      const results: Record<string, number> = {};

      for (const pair of pairs) {
        const updates: MarketUpdate[] = [];

        const pairPrice = pairPrices[pair] ?? 0;
        const wsFactory = createMockWsFactory({
          source: 'binance',
          pair,
          prices: [pairPrice],
        });

        const service = new MarketService({
          pair,
          onData: update => {
            updates.push(update);
          },
          wsFactory,
        });

        service.connect();

        // Wait for at least one update
        await new Promise<void>(resolve => {
          const timeout = setTimeout(() => resolve(), 500);
          const check = setInterval(() => {
            if (updates.length > 0) {
              clearInterval(check);
              clearTimeout(timeout);
              resolve();
            }
          }, 50);
        });

        if (updates.length > 0 && updates[0]) {
          results[pair] = updates[0].price;
        }

        service.destroy();
      }

      // All pairs should have received data
      expect(Object.keys(results).length).toBe(3);
      expect(results['BTC']).toBe(50000);
      expect(results['ETH']).toBe(3000);
      expect(results['SOL']).toBe(100);
    });
  });

  describe('Failover Behavior', () => {
    it('should fallback to Coinbase when Binance is blocked', async () => {
      const updates: MarketUpdate[] = [];
      let coinbaseConnected = false;

      // Create a mock wsFactory that fails for Binance but works for Coinbase (Mocked)
      const wsFactory = (url: string) => {
        const mockWs = {
          onopen: null as ((ev: Event) => void) | null,
          onmessage: null as ((ev: MessageEvent) => void) | null,
          onclose: null as ((ev: CloseEvent) => void) | null,
          onerror: null as ((ev: Event) => void) | null,
          readyState: 0,
          close: vi.fn(),
          send: vi.fn(),
        };

        if (url.includes('binance.com')) {
          // Simulate blocked Binance
          setTimeout(() => {
            mockWs.onerror?.({} as Event);
            mockWs.onclose?.({ code: 1006 } as CloseEvent);
          }, 100);
        } else {
          // Mock Coinbase success
          setTimeout(() => {
            coinbaseConnected = true;
            mockWs.readyState = 1; // OPEN
            mockWs.onopen?.({} as Event);

            // Send a mock update
            mockWs.onmessage?.({
              data: JSON.stringify({
                type: 'ticker',
                product_id: 'BTC-USD',
                price: '50000.00',
                time: new Date().toISOString(),
              }),
            } as MessageEvent);
          }, 100);
        }

        return mockWs as unknown as WebSocket;
      };

      marketService = new MarketService({
        pair: 'BTC',
        onData: update => {
          updates.push(update);
        },
        wsFactory,
      });

      marketService.connect();

      // Wait for Coinbase fallback
      await new Promise<void>(resolve => {
        const timeout = setTimeout(() => resolve(), 2000);
        const check = setInterval(() => {
          if (coinbaseConnected && updates.length > 0) {
            clearInterval(check);
            clearTimeout(timeout);
            resolve();
          }
        }, 50);
      });

      expect(coinbaseConnected).toBe(true);
      if (updates.length > 0 && updates[0]) {
        expect(updates[0].source).toBe('coinbase');
      }
    });
  });

  describe('Offline Mode (Mocked)', () => {
    it('should return fallback price when not connected', () => {
      marketService = new MarketService({
        pair: 'BTC',
        onData: () => {},
      });

      // Not connected yet
      expect(marketService.isOfflineMode()).toBe(true);
      expect(marketService.getPrice()).toBeGreaterThan(0);
      expect(marketService.isConnected()).toBe(false);
    });

    it('should switch to offline mode when disconnected', async () => {
      const updates: MarketUpdate[] = [];

      const wsFactory = createMockWsFactory({
        source: 'binance',
        pair: 'BTC',
        prices: [50000, 50100, 50050],
      });

      marketService = new MarketService({
        pair: 'BTC',
        onData: update => {
          updates.push(update);
        },
        wsFactory,
      });

      marketService.connect();

      // Wait for at least one update
      await new Promise<void>(resolve => {
        const timeout = setTimeout(() => resolve(), 500);
        const check = setInterval(() => {
          if (updates.length > 0) {
            clearInterval(check);
            clearTimeout(timeout);
            resolve();
          }
        }, 50);
      });

      expect(updates.length).toBeGreaterThan(0);
      expect(marketService.isOfflineMode()).toBe(false);
      expect(marketService.isConnected()).toBe(true);

      // Disconnect
      marketService.disconnect();

      // Should still have last known price
      expect(marketService.getLastKnownPrice()).not.toBeNull();
      expect(marketService.isConnected()).toBe(false);
    });
  });

  describe('Performance (Mocked)', () => {
    it('should handle high-frequency updates', async () => {
      const updates: MarketUpdate[] = [];

      // Generate 50 mock prices
      const mockPrices = Array.from(
        { length: 50 },
        () => 50000 + (Math.random() - 0.5) * 1000
      );

      const wsFactory = createMockWsFactory({
        source: 'binance',
        pair: 'BTC',
        prices: mockPrices,
        updateInterval: 20, // 50 updates per second
      });

      marketService = new MarketService({
        pair: 'BTC',
        onData: update => {
          updates.push(update);
        },
        wsFactory,
      });

      marketService.connect();

      // Collect updates for 1 second
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Should have received many updates
      expect(updates.length).toBeGreaterThan(10);

      // All updates should have valid data
      updates.forEach(update => {
        expect(update.price).toBeGreaterThan(0);
        expect(update.pair).toBe('BTC');
        expect(update.source).toBe('binance');
      });
    });
  });
});

// Additional helper tests for network detection
describe('Network Utilities', () => {
  it('should detect online status', () => {
    expect(typeof navigator.onLine).toBe('boolean');
  });

  it('should have WebSocket support', () => {
    expect(typeof WebSocket).toBe('function');
  });
});
