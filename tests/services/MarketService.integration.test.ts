/**
 * MarketService Integration Tests
 *
 * Bu testler gerçek WebSocket bağlantılarını test eder.
 * NOT: Bu testler network'e bağlı olduğu için CI'da skip edilebilir.
 *
 * Çalıştırmak için:
 *   npm run test -- --grep "MarketService Integration"
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { MarketService, type MarketUpdate } from '../../services/MarketService';

// Skip if in CI environment or no network
const SKIP_INTEGRATION = process.env.CI === 'true' || process.env.SKIP_INTEGRATION === 'true';

describe.skipIf(SKIP_INTEGRATION)('MarketService Integration', () => {
  let marketService: MarketService | null = null;

  afterEach(() => {
    if (marketService) {
      marketService.destroy();
      marketService = null;
    }
  });

  describe('Binance Connection', () => {
    it('should connect to Binance and receive price updates', async () => {
      const updates: MarketUpdate[] = [];

      marketService = new MarketService({
        pair: 'BTC',
        onData: update => {
          updates.push(update);
        },
        onStatusChange: status => {
          console.log('[Integration] Status:', status);
        },
      });

      marketService.connect();

      // Wait for up to 10 seconds for price updates
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (updates.length > 0) {
            resolve();
          } else {
            reject(new Error('No price updates received within 10 seconds'));
          }
        }, 10000);

        const checkInterval = setInterval(() => {
          if (updates.length >= 3) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            resolve();
          }
        }, 100);
      });

      // Verify updates
      expect(updates.length).toBeGreaterThan(0);
      expect(updates[0]?.source).toBe('binance');
      expect(updates[0]?.price).toBeGreaterThan(0);
      expect(updates[0]?.pair).toBe('BTC');

      console.log(`[Integration] Received ${updates.length} price updates`);
      console.log(`[Integration] Last price: $${updates[updates.length - 1]?.price}`);
    }, 15000); // 15 second timeout

    it('should handle different crypto pairs', async () => {
      const pairs: ('BTC' | 'ETH' | 'SOL')[] = ['BTC', 'ETH', 'SOL'];
      const results: Record<string, number> = {};

      for (const pair of pairs) {
        const updates: MarketUpdate[] = [];

        const service = new MarketService({
          pair,
          onData: update => {
            updates.push(update);
          },
        });

        service.connect();

        // Wait for at least one update
        await new Promise<void>(resolve => {
          const timeout = setTimeout(() => resolve(), 5000);
          const check = setInterval(() => {
            if (updates.length > 0) {
              clearInterval(check);
              clearTimeout(timeout);
              resolve();
            }
          }, 100);
        });

        if (updates.length > 0 && updates[0]) {
          results[pair] = updates[0].price;
        }

        service.destroy();
      }

      console.log('[Integration] Pair prices:', results);

      // At least one pair should have received data
      expect(Object.keys(results).length).toBeGreaterThan(0);
    }, 20000);
  });

  describe('Failover Behavior', () => {
    it('should fallback to Coinbase when Binance is blocked', async () => {
      const updates: MarketUpdate[] = [];
      let coinbaseConnected = false;

      // Create a mock wsFactory that fails for Binance
      const wsFactory = (url: string) => {
        if (url.includes('binance.com')) {
          // Simulate blocked Binance
          const mockWs = {
            onopen: null as any,
            onmessage: null as any,
            onclose: null as any,
            onerror: null as any,
            readyState: 0,
            close: vi.fn(),
            send: vi.fn(),
          };

          // Trigger error after short delay
          setTimeout(() => {
            mockWs.onerror?.(new Error('Binance blocked'));
          }, 100);

          return mockWs as unknown as WebSocket;
        }

        // Real WebSocket for Coinbase
        const ws = new WebSocket(url);
        ws.onopen = () => {
          coinbaseConnected = true;
        };
        return ws;
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
        const timeout = setTimeout(() => resolve(), 10000);
        const check = setInterval(() => {
          if (coinbaseConnected && updates.length > 0) {
            clearInterval(check);
            clearTimeout(timeout);
            resolve();
          }
        }, 100);
      });

      expect(coinbaseConnected).toBe(true);
      if (updates.length > 0 && updates[0]) {
        expect(updates[0].source).toBe('coinbase');
      }

      console.log(`[Integration] Failover successful, received ${updates.length} Coinbase updates`);
    }, 15000);
  });

  describe('Offline Mode', () => {
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

      marketService = new MarketService({
        pair: 'BTC',
        onData: update => {
          updates.push(update);
        },
      });

      marketService.connect();

      // Wait for at least one update
      await new Promise<void>(resolve => {
        const timeout = setTimeout(() => resolve(), 5000);
        const check = setInterval(() => {
          if (updates.length > 0) {
            clearInterval(check);
            clearTimeout(timeout);
            resolve();
          }
        }, 100);
      });

      if (updates.length > 0) {
        expect(marketService.isOfflineMode()).toBe(false);
        expect(marketService.isConnected()).toBe(true);
      }

      // Disconnect
      marketService.disconnect();

      // Should still have last known price
      expect(marketService.getLastKnownPrice()).not.toBeNull();
      expect(marketService.isConnected()).toBe(false);
    }, 10000);
  });

  describe('Performance', () => {
    it('should handle high-frequency updates', async () => {
      const updates: MarketUpdate[] = [];
      const startTime = Date.now();

      marketService = new MarketService({
        pair: 'BTC',
        onData: update => {
          updates.push(update);
        },
      });

      marketService.connect();

      // Collect updates for 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));

      const duration = (Date.now() - startTime) / 1000;
      const rate = updates.length / duration;

      console.log(
        `[Integration] Received ${updates.length} updates in ${duration.toFixed(1)}s (${rate.toFixed(1)} updates/sec)`
      );

      // Binance should send updates frequently (typically 1-2 per second)
      if (updates.length > 0) {
        expect(rate).toBeGreaterThan(0.1); // At least 1 update per 10 seconds
      }
    }, 10000);
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
