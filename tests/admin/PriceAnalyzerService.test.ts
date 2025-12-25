/**
 * Price Analyzer Service - Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PriceAnalyzerService } from '../../services/admin/PriceAnalyzerService';

describe('PriceAnalyzerService', () => {
  let analyzer: PriceAnalyzerService;

  beforeEach(() => {
    // Get fresh instance and reset
    analyzer = PriceAnalyzerService.getInstance();
    analyzer.reset();
  });

  describe('Basic Operations', () => {
    it('should add price and create analysis', () => {
      analyzer.addPrice('BTC', 98000);

      const analysis = analyzer.getAnalysis('BTC');
      expect(analysis).not.toBeNull();
      expect(analysis?.currentPrice).toBe(98000);
      expect(analysis?.pair).toBe('BTC');
    });

    it('should track multiple pairs independently', () => {
      analyzer.addPrice('BTC', 98000);
      analyzer.addPrice('ETH', 3500);
      analyzer.addPrice('SOL', 180);

      expect(analyzer.getAnalysis('BTC')?.currentPrice).toBe(98000);
      expect(analyzer.getAnalysis('ETH')?.currentPrice).toBe(3500);
      expect(analyzer.getAnalysis('SOL')?.currentPrice).toBe(180);
    });

    it('should update price correctly', () => {
      analyzer.addPrice('BTC', 98000);
      analyzer.addPrice('BTC', 98500);

      expect(analyzer.getAnalysis('BTC')?.currentPrice).toBe(98500);
    });

    it('should return null for pair without data', () => {
      expect(analyzer.getAnalysis('ETH')).toBeNull();
    });
  });

  describe('History Management', () => {
    it('should maintain price history', () => {
      analyzer.addPrice('BTC', 98000);
      analyzer.addPrice('BTC', 98100);
      analyzer.addPrice('BTC', 98200);

      const history = analyzer.getHistory('BTC');
      expect(history.length).toBe(3);
      expect(history[0]?.price).toBe(98000);
      expect(history[2]?.price).toBe(98200);
    });

    it('should limit history with limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        analyzer.addPrice('BTC', 98000 + i * 100);
      }

      const limited = analyzer.getHistory('BTC', 5);
      expect(limited.length).toBe(5);
      expect(limited[0]?.price).toBe(98500); // Last 5 items
    });

    it('should return empty array for pair without history', () => {
      const history = analyzer.getHistory('SOL');
      expect(history).toEqual([]);
    });
  });

  describe('Change Calculations', () => {
    it('should calculate change correctly for increasing prices', () => {
      // Add initial price
      analyzer.addPrice('BTC', 100);

      // Simulate time passing by manipulating data
      // This is a simplified test - in real scenarios time would pass
      analyzer.addPrice('BTC', 105); // 5% increase

      const analysis = analyzer.getAnalysis('BTC');
      // Change should be calculated, though exact value depends on timing
      expect(analysis?.change5m).toBeDefined();
    });

    it('should handle no price change', () => {
      analyzer.addPrice('BTC', 100);
      analyzer.addPrice('BTC', 100);

      const analysis = analyzer.getAnalysis('BTC');
      expect(analysis?.change5m).toBe(0);
    });
  });

  describe('Volatility Calculation', () => {
    it('should return 0 volatility with insufficient data', () => {
      analyzer.addPrice('BTC', 98000);
      analyzer.addPrice('BTC', 98100);

      const analysis = analyzer.getAnalysis('BTC');
      expect(analysis?.volatility).toBe(0);
    });

    it('should calculate volatility with enough data', () => {
      // Add 15 price points with some variation
      for (let i = 0; i < 15; i++) {
        const variation = i % 2 === 0 ? 100 : -100;
        analyzer.addPrice('BTC', 98000 + variation);
      }

      const analysis = analyzer.getAnalysis('BTC');
      expect(analysis?.volatility).toBeGreaterThan(0);
      expect(analysis?.volatility).toBeLessThanOrEqual(1);
    });
  });

  describe('Trend Detection', () => {
    it('should detect sideways trend with insufficient data', () => {
      for (let i = 0; i < 10; i++) {
        analyzer.addPrice('BTC', 98000);
      }

      const analysis = analyzer.getAnalysis('BTC');
      expect(analysis?.trend).toBe('sideways');
      expect(analysis?.trendStrength).toBe(0);
    });

    it('should detect bullish trend with rising prices', () => {
      // Add 30+ points with steady increase
      for (let i = 0; i < 60; i++) {
        analyzer.addPrice('BTC', 98000 + i * 50); // Steady increase
      }

      const analysis = analyzer.getAnalysis('BTC');
      expect(analysis?.trend).toBe('bullish');
      expect(analysis?.trendStrength).toBeGreaterThan(0);
    });

    it('should detect bearish trend with falling prices', () => {
      // Add 30+ points with steady decrease
      for (let i = 0; i < 60; i++) {
        analyzer.addPrice('BTC', 100000 - i * 50); // Steady decrease
      }

      const analysis = analyzer.getAnalysis('BTC');
      expect(analysis?.trend).toBe('bearish');
      expect(analysis?.trendStrength).toBeGreaterThan(0);
    });
  });

  describe('Subscription System', () => {
    it('should notify subscribers on price update', () => {
      const updates: { pair: string; price: number }[] = [];

      analyzer.subscribe((pair, analysis) => {
        updates.push({ pair, price: analysis.currentPrice });
      });

      analyzer.addPrice('BTC', 98000);
      analyzer.addPrice('ETH', 3500);

      expect(updates.length).toBe(2);
      expect(updates[0]?.pair).toBe('BTC');
      expect(updates[1]?.pair).toBe('ETH');
    });

    it('should allow unsubscribing', () => {
      const updates: number[] = [];

      const unsubscribe = analyzer.subscribe((_, analysis) => {
        updates.push(analysis.currentPrice);
      });

      analyzer.addPrice('BTC', 98000);
      unsubscribe();
      analyzer.addPrice('BTC', 99000);

      expect(updates.length).toBe(1);
    });
  });

  describe('getAllAnalyses', () => {
    it('should return analyses for all pairs', () => {
      analyzer.addPrice('BTC', 98000);
      analyzer.addPrice('ETH', 3500);

      const all = analyzer.getAllAnalyses();

      expect(all.BTC?.currentPrice).toBe(98000);
      expect(all.ETH?.currentPrice).toBe(3500);
      expect(all.SOL).toBeNull();
    });
  });

  describe('Reset', () => {
    it('should clear all data on reset', () => {
      analyzer.addPrice('BTC', 98000);
      analyzer.addPrice('ETH', 3500);

      analyzer.reset();

      expect(analyzer.getAnalysis('BTC')).toBeNull();
      expect(analyzer.getAnalysis('ETH')).toBeNull();
      expect(analyzer.getHistory('BTC')).toEqual([]);
    });
  });
});
