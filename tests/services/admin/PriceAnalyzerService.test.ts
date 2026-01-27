import { describe, it, expect, vi, beforeEach } from 'vitest';
import { priceAnalyzer } from '../../../services/admin/PriceAnalyzerService';

// Mock Logger
vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Supabase
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
};

vi.mock('../../../services/core/Supabase', () => ({
  supabase: mockSupabase,
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
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

    mockSupabase
      .from()
      .select()
      .gte()
      .order.mockResolvedValue({ data: mockData, error: null });

    await priceAnalyzer.loadHistoryFromSupabase();
    expect(priceAnalyzer.isHistoryLoaded()).toBe(true);
    expect(priceAnalyzer.getHistory('BTC').length).toBe(2);
    expect(priceAnalyzer.getAnalysis('BTC')?.currentPrice).toBe(50000);
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
