import { describe, it, expect } from 'vitest';
import {
  getSSEClientCount,
  broadcastMarketData,
  startHeartbeat,
  type SSEMarketPayload,
} from '../../src/routes/marketStream';

describe('Market Stream SSE', () => {
  describe('getSSEClientCount', () => {
    it('returns 0 when no clients are connected', () => {
      expect(getSSEClientCount()).toBe(0);
    });

    it('returns a number', () => {
      expect(typeof getSSEClientCount()).toBe('number');
    });
  });

  describe('module exports', () => {
    it('broadcastMarketData is a function', () => {
      expect(typeof broadcastMarketData).toBe('function');
    });

    it('startHeartbeat is a function', () => {
      expect(typeof startHeartbeat).toBe('function');
    });

    it('getSSEClientCount is a function', () => {
      expect(typeof getSSEClientCount).toBe('function');
    });
  });

  describe('broadcastMarketData with no clients', () => {
    it('does not throw when broadcasting with no clients', () => {
      const payload: SSEMarketPayload = {
        pair: 'BTC',
        price: 50000,
        volume: 1000,
        high: 50100,
        low: 49900,
        rsi: 55,
        rsiState: 'NEUTRAL',
        atrPercent: 0.5,
        normalizedVolume: 0.6,
        volumePercentile: 0.7,
        whaleTier: 0,
        spawnRateMultiplier: 1.0,
        enemyAggroMultiplierLong: 1.0,
        enemyAggroMultiplierShort: 1.0,
        trendStrength: 0.5,
        trendDirection: 'NEUTRAL',
        timestamp: Date.now(),
      };

      expect(() => broadcastMarketData(payload)).not.toThrow();
    });
  });
});
