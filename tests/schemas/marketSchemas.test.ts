/**
 * Market Schema Tests
 *
 * Tests for Zod validation schemas.
 */

import { describe, it, expect } from 'vitest';
import {
  parseBinanceData,
  parseCoinbaseData,
  isCoinbaseSubscription,
  BinanceTickerSchema,
  BinanceFuturesKlineSchema,
  CoinbaseTickerSchema,
} from '../../schemas/marketSchemas';

describe('Market Schemas', () => {
  describe('BinanceFuturesKlineSchema', () => {
    it('should validate correct Binance futures kline data', () => {
      const validData = {
        e: 'kline',
        E: 1625097600000,
        s: 'BTCUSDT',
        k: {
          t: 1625097600000,
          T: 1625097659999,
          s: 'BTCUSDT',
          i: '1m',
          o: '42000.00',
          c: '42050.50',
          h: '42100.00',
          l: '41950.00',
          v: '100.5',
          n: 500,
          x: false,
          q: '4200000.0',
        },
      };

      const result = BinanceFuturesKlineSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid kline data', () => {
      const invalidData = {
        e: 'kline',
        k: {
          c: 42050.5, // Should be string
        },
      };

      const result = BinanceFuturesKlineSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('BinanceTickerSchema', () => {
    it('should validate correct Binance ticker data', () => {
      const validData = {
        c: '42000.50',
        h: '43000.00',
        l: '41000.00',
        v: '1234.56',
      };

      const result = BinanceTickerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid Binance data', () => {
      const invalidData = {
        price: '42000.50', // Wrong key
      };

      const result = BinanceTickerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('CoinbaseTickerSchema', () => {
    it('should validate correct Coinbase ticker data', () => {
      const validData = {
        type: 'ticker',
        product_id: 'BTC-USD',
        price: '42000.50',
      };

      const result = CoinbaseTickerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject non-ticker messages', () => {
      const subscriptionData = {
        type: 'subscriptions',
        channels: [],
      };

      const result = CoinbaseTickerSchema.safeParse(subscriptionData);
      expect(result.success).toBe(false);
    });
  });

  describe('parseBinanceData', () => {
    it('should parse valid Binance futures kline data (primary)', () => {
      const data = {
        e: 'kline',
        E: 1625097600000,
        s: 'BTCUSDT',
        k: {
          o: '42000.00',
          c: '42050.50',
          h: '42100.00',
          l: '41950.00',
          v: '100.5',
          s: 'BTCUSDT',
          t: 1625097600000,
          T: 1625097659999,
          i: '1m',
          n: 500,
          x: false,
          q: '4200000.0',
        },
      };

      const result = parseBinanceData(data);

      expect(result).not.toBeNull();
      expect(result?.price).toBe(42050.5);
      expect(result?.high).toBe(42100);
      expect(result?.low).toBe(41950);
      expect(result?.source).toBe('binance');
    });

    it('should parse valid Binance ticker data (fallback)', () => {
      const data = {
        c: '42000.50',
        h: '43000.00',
        l: '41000.00',
        v: '1234.56',
      };

      const result = parseBinanceData(data);

      expect(result).not.toBeNull();
      expect(result?.price).toBe(42000.5);
      expect(result?.source).toBe('binance');
    });

    it('should return null for invalid data', () => {
      const result = parseBinanceData({ invalid: 'data' });
      expect(result).toBeNull();
    });

    it('should return null for non-object input', () => {
      const result = parseBinanceData('not an object');
      expect(result).toBeNull();
    });
  });

  describe('parseCoinbaseData', () => {
    it('should parse valid Coinbase data', () => {
      const data = {
        type: 'ticker',
        product_id: 'BTC-USD',
        price: '42000.50',
      };

      const result = parseCoinbaseData(data);

      expect(result).not.toBeNull();
      expect(result?.price).toBe(42000.5);
      expect(result?.source).toBe('coinbase');
    });

    it('should return null for subscription messages', () => {
      const result = parseCoinbaseData({
        type: 'subscriptions',
        channels: [],
      });
      expect(result).toBeNull();
    });
  });

  describe('isCoinbaseSubscription', () => {
    it('should recognize subscription messages', () => {
      const subscriptionData = {
        type: 'subscriptions',
        channels: [{ name: 'ticker', product_ids: ['BTC-USD'] }],
      };

      expect(isCoinbaseSubscription(subscriptionData)).toBe(true);
    });

    it('should recognize error messages', () => {
      const errorData = {
        type: 'error',
        message: 'Something went wrong',
      };

      expect(isCoinbaseSubscription(errorData)).toBe(true);
    });

    it('should not match ticker messages', () => {
      const tickerData = {
        type: 'ticker',
        product_id: 'BTC-USD',
        price: '42000.50',
      };

      expect(isCoinbaseSubscription(tickerData)).toBe(false);
    });
  });
});
