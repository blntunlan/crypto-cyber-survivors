// Mock Supabase
import { vi } from 'vitest';
vi.mock('../../../services/core/Supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  },
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

import { describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '../../../services/core/Supabase';
import { priceAnalyzer } from '../../../services/admin/PriceAnalyzerService';

// Mock Logger
vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PriceAnalyzerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    priceAnalyzer.reset();
  });

  it('should add prices and generate analysis', () => {
    priceAnalyzer.addPrice('BTC', 50000);
    priceAnalyzer.addPrice('BTC', 51000);

    const analysis = priceAnalyzer.getAnalysis('BTC');
    expect(analysis).not.toBeNull();
    expect(analysis?.currentPrice).toBe(51000);
    expect(analysis?.change5m).toBeGreaterThan(0);
  });

  it('should support subscriptions', () => {
    const callback = vi.fn();
    const unsubscribe = priceAnalyzer.subscribe(callback);

    priceAnalyzer.addPrice('ETH', 2000);
    expect(callback).toHaveBeenCalledWith('ETH', expect.any(Object));

    unsubscribe();
    callback.mockClear();
    priceAnalyzer.addPrice('ETH', 2100);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should load history from Supabase', async () => {
    const mockData = [
      {
        pair: 'BTC',
        price: 49000,
        timestamp: new Date(Date.now() - 1000).toISOString(),
        source: 'binance',
      },
      {
        pair: 'BTC',
        price: 50000,
        timestamp: new Date().toISOString(),
        source: 'binance',
      },
    ];

    const orderMock = vi.fn().mockResolvedValue({ data: mockData, error: null });
    const gteMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ gte: gteMock });
    const fromSpy = vi
      .spyOn(supabase as any, 'from')
      .mockReturnValue({ select: selectMock } as any);

    await priceAnalyzer.loadHistoryFromSupabase();
    expect(priceAnalyzer.isHistoryLoaded()).toBe(true);
    expect(priceAnalyzer.getHistory('BTC').length).toBe(2);
    expect(priceAnalyzer.getAnalysis('BTC')?.currentPrice).toBe(50000);
    expect(fromSpy).toHaveBeenCalledWith('price_logs');
  });

  it('should calculate volatility and trend with enough data', () => {
    // Add 20 price points for trend detection
    for (let i = 0; i < 30; i++) {
      priceAnalyzer.addPrice('SOL', 100 + i); // Upward trend
    }

    const analysis = priceAnalyzer.getAnalysis('SOL');
    expect(analysis?.trend).toBe('bullish');
    expect(analysis?.volatility).toBeGreaterThan(0);
  });

  it('should handle missing analysis gracefully', () => {
    const analysis = priceAnalyzer.getAnalysis('SOL');
    expect(analysis).toBeNull();

    const all = priceAnalyzer.getAllAnalyses();
    expect(all.SOL).toBeNull();
  });
});
