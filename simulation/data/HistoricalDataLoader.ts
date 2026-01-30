/**
 * HistoricalDataLoader - Supabase'den Gerçek Piyasa Verisi Çekme
 *
 * Project Darwin eğitimi için tarihsel BTC/ETH fiyat ve volume verilerini
 * Supabase price_history tablosundan yükler.
 *
 * Kullanım:
 * - Eğitim öncesi veri ön-yükleme
 * - Farklı piyasa koşullarında (bull/bear/sideways) test senaryoları
 * - Gerçekçi volatilite ve volume pattern'leri ile AI eğitimi
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Types
export interface PriceDataPoint {
  timestamp: number;
  price: number;
  volume: number;
  pair: string;
}

export interface MarketSegment {
  name: string;
  startTime: number;
  endTime: number;
  avgVolatility: number;
  trend: 'bull' | 'bear' | 'sideways';
  data: PriceDataPoint[];
}

export interface IndicatorSnapshot {
  rsi: number;
  atr: number;
  atrPercent: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  normalizedVolume: number;
}

// RSI Calculator (Standalone for Node.js)
class RSICalculatorStandalone {
  private prices: number[] = [];
  private period: number;
  private prevAvgGain: number | null = null;
  private prevAvgLoss: number | null = null;

  constructor(period: number = 14) {
    this.period = period;
  }

  update(price: number): number {
    this.prices.push(price);
    if (this.prices.length > 300) this.prices.shift();

    if (this.prices.length <= this.period) return 50;

    const changes: number[] = [];
    for (let i = this.prices.length - this.period; i < this.prices.length; i++) {
      changes.push(this.prices[i] - this.prices[i - 1]);
    }

    const gains = changes.map(c => (c > 0 ? c : 0));
    const losses = changes.map(c => (c < 0 ? -c : 0));

    let avgGain: number;
    let avgLoss: number;

    if (this.prevAvgGain === null) {
      avgGain = gains.reduce((a, b) => a + b, 0) / this.period;
      avgLoss = losses.reduce((a, b) => a + b, 0) / this.period;
    } else {
      avgGain =
        (this.prevAvgGain * (this.period - 1) + gains[gains.length - 1]) / this.period;
      avgLoss =
        (this.prevAvgLoss! * (this.period - 1) + losses[losses.length - 1]) /
        this.period;
    }

    this.prevAvgGain = avgGain;
    this.prevAvgLoss = avgLoss;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  reset() {
    this.prices = [];
    this.prevAvgGain = null;
    this.prevAvgLoss = null;
  }
}

// ATR Calculator (Standalone for Node.js)
class ATRCalculatorStandalone {
  private trValues: number[] = [];
  private prevClose: number | null = null;
  private period: number;

  constructor(period: number = 14) {
    this.period = period;
  }

  update(price: number): { atr: number; atrPercent: number } {
    const high = price * 1.001; // Simulated OHLC
    const low = price * 0.999;
    const close = price;

    let tr: number;
    if (this.prevClose === null) {
      tr = high - low;
    } else {
      tr = Math.max(
        high - low,
        Math.abs(high - this.prevClose),
        Math.abs(low - this.prevClose)
      );
    }

    this.prevClose = close;
    this.trValues.push(tr);
    if (this.trValues.length > 300) this.trValues.shift();

    const window = this.trValues.slice(-this.period);
    const atr = window.reduce((a, b) => a + b, 0) / window.length;
    const atrPercent = close > 0 ? (atr / close) * 100 : 0;

    return { atr, atrPercent };
  }

  reset() {
    this.trValues = [];
    this.prevClose = null;
  }
}

// MACD Calculator (Standalone for Node.js)
class MACDCalculatorStandalone {
  private prices: number[] = [];
  private ema12: number | null = null;
  private ema26: number | null = null;
  private signalEma: number | null = null;

  update(price: number): { macd: number; signal: number; histogram: number } {
    this.prices.push(price);
    if (this.prices.length > 300) this.prices.shift();

    // Calculate EMAs
    const k12 = 2 / (12 + 1);
    const k26 = 2 / (26 + 1);
    const kSignal = 2 / (9 + 1);

    if (this.ema12 === null) {
      if (this.prices.length < 26) return { macd: 0, signal: 0, histogram: 0 };
      this.ema12 = this.prices.slice(0, 12).reduce((a, b) => a + b, 0) / 12;
      this.ema26 = this.prices.slice(0, 26).reduce((a, b) => a + b, 0) / 26;
    } else {
      this.ema12 = price * k12 + this.ema12 * (1 - k12);
      this.ema26 = price * k26 + this.ema26! * (1 - k26);
    }

    const macd = this.ema12 - this.ema26!;

    if (this.signalEma === null) {
      this.signalEma = macd;
    } else {
      this.signalEma = macd * kSignal + this.signalEma * (1 - kSignal);
    }

    return {
      macd,
      signal: this.signalEma,
      histogram: macd - this.signalEma,
    };
  }

  reset() {
    this.prices = [];
    this.ema12 = null;
    this.ema26 = null;
    this.signalEma = null;
  }
}

// Volume Analyzer (Standalone for Node.js)
class VolumeAnalyzerStandalone {
  private volumes: number[] = [];
  private lookback: number;

  constructor(lookback: number = 100) {
    this.lookback = lookback;
  }

  update(volume: number): number {
    this.volumes.push(volume);
    if (this.volumes.length > this.lookback) this.volumes.shift();

    if (this.volumes.length < 10) return 0.5;

    const sorted = [...this.volumes].sort((a, b) => a - b);
    const idx = sorted.indexOf(volume);
    return idx / (sorted.length - 1);
  }

  reset() {
    this.volumes = [];
  }
}

export class HistoricalDataLoader {
  private supabase: SupabaseClient | null = null;
  private cache: Map<string, PriceDataPoint[]> = new Map();

  // Standalone calculators for Node.js environment
  private rsiCalc = new RSICalculatorStandalone();
  private atrCalc = new ATRCalculatorStandalone();
  private macdCalc = new MACDCalculatorStandalone();
  private volumeAnalyzer = new VolumeAnalyzerStandalone();

  constructor() {
    this.initSupabase();
  }

  private initSupabase() {
    const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

    if (url && key) {
      this.supabase = createClient(url, key);
    }
  }

  /**
   * Supabase'den belirli zaman aralığında veri çek
   */
  async fetchPriceHistory(
    pair: string = 'BTC-USD',
    startDate: Date,
    endDate: Date,
    limit: number = 10000
  ): Promise<PriceDataPoint[]> {
    const cacheKey = `${pair}-${startDate.toISOString()}-${endDate.toISOString()}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    if (!this.supabase) {
      console.warn('[HistoricalDataLoader] Supabase not configured, using mock data');
      return this.generateMockData(startDate, endDate);
    }

    try {
      const { data, error } = await this.supabase
        .from('price_history')
        .select('timestamp, price, volume, pair')
        .eq('pair', pair)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('[HistoricalDataLoader] Supabase error:', error);
        return this.generateMockData(startDate, endDate);
      }

      const result: PriceDataPoint[] = data.map(row => ({
        timestamp: new Date(row.timestamp).getTime(),
        price: row.price,
        volume: row.volume ?? 0,
        pair: row.pair,
      }));

      this.cache.set(cacheKey, result);
      return result;
    } catch (err) {
      console.error('[HistoricalDataLoader] Fetch error:', err);
      return this.generateMockData(startDate, endDate);
    }
  }

  /**
   * Son N dakikalık veriyi çek
   */
  async fetchRecentData(
    pair: string = 'BTC-USD',
    minutes: number = 60
  ): Promise<PriceDataPoint[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - minutes * 60 * 1000);
    return this.fetchPriceHistory(pair, startDate, endDate);
  }

  /**
   * Veriyi piyasa segmentlerine ayır (bull/bear/sideways)
   */
  segmentByMarketCondition(
    data: PriceDataPoint[],
    windowSize: number = 60
  ): MarketSegment[] {
    const segments: MarketSegment[] = [];

    for (let i = 0; i < data.length; i += windowSize) {
      const window = data.slice(i, i + windowSize);
      if (window.length < 10) continue;

      const startPrice = window[0].price;
      const endPrice = window[window.length - 1].price;
      const priceChange = (endPrice - startPrice) / startPrice;

      // Calculate volatility
      const returns: number[] = [];
      for (let j = 1; j < window.length; j++) {
        returns.push((window[j].price - window[j - 1].price) / window[j - 1].price);
      }
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance =
        returns.reduce((a, b) => a + (b - avgReturn) ** 2, 0) / returns.length;
      const volatility = Math.sqrt(variance) * 100;

      // Determine trend
      let trend: 'bull' | 'bear' | 'sideways';
      if (priceChange > 0.01) trend = 'bull';
      else if (priceChange < -0.01) trend = 'bear';
      else trend = 'sideways';

      segments.push({
        name: `${trend}-${i / windowSize}`,
        startTime: window[0].timestamp,
        endTime: window[window.length - 1].timestamp,
        avgVolatility: volatility,
        trend,
        data: window,
      });
    }

    return segments;
  }

  /**
   * Veriden indikatör snapshot'ları hesapla
   */
  calculateIndicators(data: PriceDataPoint[]): IndicatorSnapshot[] {
    this.rsiCalc.reset();
    this.atrCalc.reset();
    this.macdCalc.reset();
    this.volumeAnalyzer.reset();

    const snapshots: IndicatorSnapshot[] = [];

    for (const point of data) {
      const rsi = this.rsiCalc.update(point.price);
      const { atr, atrPercent } = this.atrCalc.update(point.price);
      const macdResult = this.macdCalc.update(point.price);
      const normalizedVolume = this.volumeAnalyzer.update(point.volume);

      snapshots.push({
        rsi,
        atr,
        atrPercent,
        macd: macdResult.macd,
        macdSignal: macdResult.signal,
        macdHistogram: macdResult.histogram,
        normalizedVolume,
      });
    }

    return snapshots;
  }

  /**
   * Eğitim için rastgele segment seç
   */
  selectRandomSegment(
    segments: MarketSegment[],
    preferredTrend?: 'bull' | 'bear' | 'sideways'
  ): MarketSegment | null {
    let pool = segments;

    if (preferredTrend) {
      pool = segments.filter(s => s.trend === preferredTrend);
      if (pool.length === 0) pool = segments;
    }

    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * Mock data generator (Supabase bağlantısı yoksa)
   */
  private generateMockData(startDate: Date, endDate: Date): PriceDataPoint[] {
    const data: PriceDataPoint[] = [];
    let price = 50000 + Math.random() * 10000;
    let volume = 1000000;

    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    const interval = 1000; // 1 second intervals

    for (let t = startTime; t <= endTime; t += interval) {
      // Random walk with occasional spikes
      const volatility = 0.0005 + Math.random() * 0.001;
      const drift = (Math.random() - 0.5) * 2 * volatility;
      price *= 1 + drift;

      // Volume spikes
      const volumeMultiplier =
        Math.random() < 0.05 ? 2 + Math.random() * 3 : 0.8 + Math.random() * 0.4;
      volume = 1000000 * volumeMultiplier;

      data.push({
        timestamp: t,
        price,
        volume,
        pair: 'BTC-USD',
      });
    }

    return data;
  }

  /**
   * Cache temizle
   */
  clearCache() {
    this.cache.clear();
  }
}

// Singleton export
export const historicalDataLoader = new HistoricalDataLoader();
