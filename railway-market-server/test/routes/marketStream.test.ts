import { describe, expect, it } from 'vitest';
import {
  bucketedHistoryQuery,
  getHistoryCacheSize,
  normalizeMarketPair,
  normalizeWindowHours,
} from '../../src/routes/marketStream';

describe('marketStream route helpers', () => {
  describe('normalizeMarketPair', () => {
    it('defaults undefined, empty string, and whitespace to BTC', () => {
      expect(normalizeMarketPair(undefined)).toBe('BTC');
      expect(normalizeMarketPair('')).toBe('BTC');
      expect(normalizeMarketPair('   ')).toBe('BTC');
    });

    it('normalizes valid pairs with trimming and case-insensitivity', () => {
      expect(normalizeMarketPair(' eth ')).toBe('ETH');
      expect(normalizeMarketPair('btc')).toBe('BTC');
      expect(normalizeMarketPair('SOL')).toBe('SOL');
      expect(normalizeMarketPair('  sol  ')).toBe('SOL');
    });

    it('returns null for unsupported market pairs', () => {
      expect(normalizeMarketPair('DOGE')).toBeNull();
      expect(normalizeMarketPair('BTCUSD')).toBeNull();
      expect(normalizeMarketPair('random_coin')).toBeNull();
    });

    // Express hands back an array for a repeated query param (`?pair=A&pair=B`)
    // and an object for a bracketed one. Neither is a string, so both fall back
    // to BTC rather than 400ing — pinned here because it is easy to "fix" into
    // a rejection and diverge from the aggregator.
    it('falls back to BTC for non-string inputs', () => {
      expect(normalizeMarketPair(['ETH'])).toBe('BTC');
      expect(normalizeMarketPair({ pair: 'ETH' })).toBe('BTC');
      expect(normalizeMarketPair(42)).toBe('BTC');
      expect(normalizeMarketPair(null)).toBe('BTC');
    });
  });

  describe('normalizeWindowHours', () => {
    it('returns undefined for empty, nullish, or non-numeric inputs', () => {
      expect(normalizeWindowHours(undefined)).toBeUndefined();
      expect(normalizeWindowHours(null)).toBeUndefined();
      expect(normalizeWindowHours('')).toBeUndefined();
      expect(normalizeWindowHours('   ')).toBeUndefined();
      expect(normalizeWindowHours('invalid')).toBeUndefined();
      expect(normalizeWindowHours(Number.NaN)).toBeUndefined();
    });

    it('returns undefined for zero and negative values', () => {
      expect(normalizeWindowHours(0)).toBeUndefined();
      expect(normalizeWindowHours(-1)).toBeUndefined();
      expect(normalizeWindowHours('-24')).toBeUndefined();
    });

    it('passes through valid positive window hours', () => {
      expect(normalizeWindowHours(1)).toBe(1);
      expect(normalizeWindowHours(24)).toBe(24);
      expect(normalizeWindowHours('24')).toBe(24);
      expect(normalizeWindowHours(72)).toBe(72);
    });

    it('clamps values above 72 to 72', () => {
      expect(normalizeWindowHours(73)).toBe(72);
      expect(normalizeWindowHours(100)).toBe(72);
      expect(normalizeWindowHours('1000')).toBe(72);
    });
  });

  describe('bucketedHistoryQuery', () => {
    it('returns a SQL object with expected bucket size and pair bound in query chunks', () => {
      const query = bucketedHistoryQuery('ETH', 300, 24);
      // 24 * 3600 / 300 = 288 bucket-seconds
      expect(query).toBeDefined();

      const chunks = query.queryChunks;
      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks).toContain(288);
      expect(chunks).toContain('ETH');
    });

    it('floors bucket size at 1 second for large limits or small windows', () => {
      // 1 hour (3600s) / 5000 limit -> ceil(0.72) = 1
      const query = bucketedHistoryQuery('BTC', 5000, 1);
      const chunks = query.queryChunks;

      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks).toContain(1);
      expect(chunks).toContain('BTC');
    });
  });

  describe('getHistoryCacheSize', () => {
    it('returns a number and is callable on a cold module', () => {
      const size = getHistoryCacheSize();
      expect(typeof size).toBe('number');
      expect(size).toBeGreaterThanOrEqual(0);
    });
  });
});
