/**
 * Price Analyzer Service
 *
 * Analyzes price data to calculate trends, volatility, and other metrics
 * for the Admin Dashboard
 */

import type {
  CryptoPair,
  PriceAnalysis,
  PriceSnapshot,
  TrendDirection,
  PriceSource,
} from '../../types/admin';
import { Logger } from '../Logger';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  // How many price points to keep in history
  MAX_HISTORY_SIZE: 3600, // ~1 hour at 1 update/sec

  // Time windows for change calculations (ms)
  WINDOWS: {
    '5m': 5 * 60 * 1000,
    '10m': 10 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
  },

  // ATR calculation period
  ATR_PERIOD: 14,

  // Stale threshold (ms)
  STALE_THRESHOLD: 60 * 1000, // 1 minute

  // Trend detection thresholds
  TREND_THRESHOLD: 0.001, // 0.1% change for trend detection
};

// =============================================================================
// PRICE ANALYZER SERVICE
// =============================================================================

export class PriceAnalyzerService {
  private static instance: PriceAnalyzerService | null = null;

  // Price history per pair
  private history: Map<CryptoPair, PriceSnapshot[]> = new Map();

  // Latest analysis per pair
  private analyses: Map<CryptoPair, PriceAnalysis> = new Map();

  // Subscribers
  private subscribers: Set<(pair: CryptoPair, analysis: PriceAnalysis) => void> = new Set();

  // Loading state
  private isLoadingHistory: boolean = false;
  private historyLoaded: boolean = false;

  private constructor() {
    // Initialize history for all pairs
    this.history.set('BTC', []);
    this.history.set('ETH', []);
    this.history.set('SOL', []);
  }

  static getInstance(): PriceAnalyzerService {
    return (PriceAnalyzerService.instance ??= new PriceAnalyzerService());
  }

  // ===========================================================================
  // SUPABASE HISTORY LOADING
  // ===========================================================================

  /**
   * Load historical price data from Supabase price_logs table
   * Call this when Admin Dashboard opens
   */
  async loadHistoryFromSupabase(): Promise<void> {
    if (this.isLoadingHistory || this.historyLoaded) {
      return;
    }

    this.isLoadingHistory = true;

    try {
      // Dynamic import to avoid circular dependencies
      const { supabase, isSupabaseConfigured } = await import('../Supabase');

      if (!isSupabaseConfigured() || !supabase) {
        Logger.info('[PriceAnalyzer] Supabase not configured, skipping history load');
        return;
      }

      // Get last 1 hour of data
      const oneHourAgo = new Date(Date.now() - CONFIG.WINDOWS['1h']).toISOString();

      const { data, error } = await supabase
        .from('price_logs')
        .select('pair, price, timestamp, source')
        .gte('timestamp', oneHourAgo)
        .order('timestamp', { ascending: true });

      if (error) {
        Logger.warn('[PriceAnalyzer] Failed to load history from Supabase:', error.message);
        return;
      }

      if (data.length === 0) {
        Logger.info('[PriceAnalyzer] No historical data found in Supabase');
        return;
      }

      // Process and add to history
      for (const row of data) {
        const pair = row.pair as CryptoPair;
        if (!['BTC', 'ETH', 'SOL'].includes(pair)) continue;

        const snapshot: PriceSnapshot = {
          pair,
          price: row.price,
          timestamp: new Date(row.timestamp).getTime(),
          source: row.source ?? 'binance',
        };

        const pairHistory = this.history.get(pair) ?? [];
        pairHistory.push(snapshot);
        this.history.set(pair, pairHistory);
      }

      // Recalculate analysis for all pairs
      for (const pair of ['BTC', 'ETH', 'SOL'] as CryptoPair[]) {
        const history = this.history.get(pair);
        if (history && history.length > 0) {
          this.recalculateAnalysis(pair);
        }
      }

      this.historyLoaded = true;

      Logger.info('[PriceAnalyzer] Loaded history from Supabase:', {
        BTC: this.history.get('BTC')?.length ?? 0,
        ETH: this.history.get('ETH')?.length ?? 0,
        SOL: this.history.get('SOL')?.length ?? 0,
        total: data.length,
      });
    } catch (err) {
      Logger.warn('[PriceAnalyzer] Error loading from Supabase:', err);
    } finally {
      this.isLoadingHistory = false;
    }
  }

  /**
   * Check if history has been loaded from Supabase
   */
  isHistoryLoaded(): boolean {
    return this.historyLoaded;
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Add a new price point and recalculate analysis
   */
  addPrice(pair: CryptoPair, price: number, source: PriceSource = 'binance'): void {
    const snapshot: PriceSnapshot = {
      pair,
      price,
      timestamp: Date.now(),
      source,
    };

    // Add to history
    const pairHistory = this.history.get(pair) ?? [];
    pairHistory.push(snapshot);

    // Trim if needed
    if (pairHistory.length > CONFIG.MAX_HISTORY_SIZE) {
      pairHistory.shift();
    }

    this.history.set(pair, pairHistory);

    // Recalculate analysis
    this.recalculateAnalysis(pair);
  }

  /**
   * Get the latest analysis for a pair
   */
  getAnalysis(pair: CryptoPair): PriceAnalysis | null {
    return this.analyses.get(pair) ?? null;
  }

  /**
   * Get analyses for all pairs
   */
  getAllAnalyses(): Record<CryptoPair, PriceAnalysis | null> {
    return {
      BTC: this.getAnalysis('BTC'),
      ETH: this.getAnalysis('ETH'),
      SOL: this.getAnalysis('SOL'),
    };
  }

  /**
   * Subscribe to analysis updates
   */
  subscribe(callback: (pair: CryptoPair, analysis: PriceAnalysis) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Get price history for a pair
   */
  getHistory(pair: CryptoPair, limit?: number): PriceSnapshot[] {
    const history = this.history.get(pair) ?? [];
    if (limit) {
      return history.slice(-limit);
    }
    return [...history];
  }

  /**
   * Clear all data (for testing)
   */
  reset(): void {
    this.history.set('BTC', []);
    this.history.set('ETH', []);
    this.history.set('SOL', []);
    this.analyses.clear();
  }

  // ===========================================================================
  // ANALYSIS CALCULATIONS
  // ===========================================================================

  private recalculateAnalysis(pair: CryptoPair): void {
    const history = this.history.get(pair) ?? [];

    if (history.length === 0) {
      return;
    }

    const latest = history[history.length - 1];
    if (!latest) return;

    const now = Date.now();

    // Calculate time-based changes
    const change5m = this.calculateChange(history, CONFIG.WINDOWS['5m']);
    const change10m = this.calculateChange(history, CONFIG.WINDOWS['10m']);
    const change30m = this.calculateChange(history, CONFIG.WINDOWS['30m']);
    const change1h = this.calculateChange(history, CONFIG.WINDOWS['1h']);

    // Calculate volatility (normalized 0-1)
    const volatility = this.calculateVolatility(history);

    // Calculate ATR
    const atr = this.calculateATR(history);

    // Determine trend
    const { trend, trendStrength } = this.detectTrend(history);

    // Check staleness
    const isStale = now - latest.timestamp > CONFIG.STALE_THRESHOLD;

    const analysis: PriceAnalysis = {
      pair,
      currentPrice: latest.price,
      change5m,
      change10m,
      change30m,
      change1h,
      volatility,
      atr,
      trend,
      trendStrength,
      timestamp: now,
      source: latest.source,
      isStale,
    };

    this.analyses.set(pair, analysis);

    // Notify subscribers
    this.notifySubscribers(pair, analysis);
  }

  /**
   * Calculate percentage change over a time window
   */
  private calculateChange(history: PriceSnapshot[], windowMs: number): number {
    if (history.length < 2) return 0;

    const now = Date.now();
    const cutoff = now - windowMs;

    // Find the oldest price within the window
    let oldestInWindow: PriceSnapshot | null = null;
    for (const snapshot of history) {
      if (snapshot.timestamp >= cutoff) {
        oldestInWindow = snapshot;
        break;
      }
    }

    // Use the oldest available if we don't have enough history
    oldestInWindow ??= history[0] ?? null;

    const latest = history[history.length - 1];
    if (!latest || !oldestInWindow || oldestInWindow.price === 0) return 0;

    return ((latest.price - oldestInWindow.price) / oldestInWindow.price) * 100;
  }

  /**
   * Calculate volatility as normalized standard deviation
   */
  private calculateVolatility(history: PriceSnapshot[]): number {
    if (history.length < 10) return 0;

    // Use last 100 price points or all available
    const recent = history.slice(-100);
    const prices = recent.map(s => s.price);

    // Calculate mean
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;

    // Calculate standard deviation
    const squaredDiffs = prices.map(p => Math.pow(p - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
    const stdDev = Math.sqrt(avgSquaredDiff);

    // Normalize to percentage of mean
    const volatilityPercent = (stdDev / mean) * 100;

    // Normalize to 0-1 (assuming 5% is maximum expected volatility)
    return Math.min(volatilityPercent / 5, 1);
  }

  /**
   * Calculate Average True Range (simplified for single data point)
   */
  private calculateATR(history: PriceSnapshot[]): number {
    if (history.length < CONFIG.ATR_PERIOD + 1) return 0;

    const recent = history.slice(-CONFIG.ATR_PERIOD - 1);
    const trueRanges: number[] = [];

    for (let i = 1; i < recent.length; i++) {
      const current = recent[i];
      const previous = recent[i - 1];
      if (!current || !previous) continue;

      // Simplified TR = |current - previous|
      // (In real trading, this would use high/low/close)
      const tr = Math.abs(current.price - previous.price);
      trueRanges.push(tr);
    }

    if (trueRanges.length === 0) return 0;

    // Average
    return trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
  }

  /**
   * Detect trend direction and strength
   */
  private detectTrend(history: PriceSnapshot[]): { trend: TrendDirection; trendStrength: number } {
    if (history.length < 20) {
      return { trend: 'sideways', trendStrength: 0 };
    }

    // Use simple moving average comparison
    const recent = history.slice(-60); // Last 60 points
    const prices = recent.map(s => s.price);

    // Short-term SMA (last 10)
    const shortSMA = this.calculateSMA(prices.slice(-10));

    // Long-term SMA (last 30)
    const longSMA = this.calculateSMA(prices.slice(-30));

    if (shortSMA === 0 || longSMA === 0) {
      return { trend: 'sideways', trendStrength: 0 };
    }

    // Calculate difference as percentage
    const diff = (shortSMA - longSMA) / longSMA;

    // Determine trend
    let trend: TrendDirection;
    if (diff > CONFIG.TREND_THRESHOLD) {
      trend = 'bullish';
    } else if (diff < -CONFIG.TREND_THRESHOLD) {
      trend = 'bearish';
    } else {
      trend = 'sideways';
    }

    // Calculate strength (0-1)
    // Max strength at 1% difference
    const trendStrength = Math.min(Math.abs(diff) / 0.01, 1);

    return { trend, trendStrength };
  }

  /**
   * Calculate Simple Moving Average
   */
  private calculateSMA(prices: number[]): number {
    if (prices.length === 0) return 0;
    return prices.reduce((a, b) => a + b, 0) / prices.length;
  }

  /**
   * Notify all subscribers of an analysis update
   */
  private notifySubscribers(pair: CryptoPair, analysis: PriceAnalysis): void {
    this.subscribers.forEach(callback => {
      try {
        callback(pair, analysis);
      } catch (error) {
        Logger.error('[PriceAnalyzer] Subscriber error:', error);
      }
    });
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const priceAnalyzer = PriceAnalyzerService.getInstance();
