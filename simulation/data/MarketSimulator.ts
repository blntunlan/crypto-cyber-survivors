/**
 * MarketSimulator - Gerçek Piyasa Koşullarını Simüle Etme
 *
 * HeadlessGameEngine için market verileri sağlar.
 * Tarihsel verilerden veya canlı akıştan beslenebilir.
 *
 * Modlar:
 * - HISTORICAL: Supabase'den çekilen geçmiş veriler
 * - SYNTHETIC: Algoritmik olarak üretilen senaryolar
 * - REPLAY: Belirli bir zaman diliminin tekrarı
 */

import {
  HistoricalDataLoader,
  type PriceDataPoint,
  type MarketSegment,
  type IndicatorSnapshot,
} from './HistoricalDataLoader.ts';

export type SimulationMode = 'HISTORICAL' | 'SYNTHETIC' | 'REPLAY';

export interface MarketState {
  price: number;
  volume: number;
  rsi: number;
  atr: number;
  atrPercent: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  normalizedVolume: number;
  trend: 'bull' | 'bear' | 'sideways';
  volatilityLevel: 'low' | 'medium' | 'high' | 'extreme';
}

export interface MarketScenario {
  name: string;
  description: string;
  duration: number; // seconds
  initialPrice: number;
  volatilityRange: [number, number];
  trendBias: number; // -1 (bear) to 1 (bull)
  volumeProfile: 'normal' | 'whale' | 'dead';
}

// Pre-defined training scenarios
export const TRAINING_SCENARIOS: MarketScenario[] = [
  {
    name: 'calm_bull',
    description: 'Steady uptrend with low volatility',
    duration: 120,
    initialPrice: 50000,
    volatilityRange: [0.0001, 0.0003],
    trendBias: 0.6,
    volumeProfile: 'normal',
  },
  {
    name: 'aggressive_bear',
    description: 'Sharp downtrend with high selling pressure',
    duration: 90,
    initialPrice: 55000,
    volatilityRange: [0.001, 0.003],
    trendBias: -0.7,
    volumeProfile: 'whale',
  },
  {
    name: 'sideways_chop',
    description: 'Range-bound market with fake breakouts',
    duration: 150,
    initialPrice: 52000,
    volatilityRange: [0.0005, 0.001],
    trendBias: 0,
    volumeProfile: 'normal',
  },
  {
    name: 'flash_crash',
    description: 'Sudden violent drop followed by recovery',
    duration: 60,
    initialPrice: 50000,
    volatilityRange: [0.005, 0.02],
    trendBias: -0.9,
    volumeProfile: 'whale',
  },
  {
    name: 'parabolic_pump',
    description: 'Explosive upward move with FOMO',
    duration: 60,
    initialPrice: 48000,
    volatilityRange: [0.003, 0.008],
    trendBias: 0.85,
    volumeProfile: 'whale',
  },
  {
    name: 'dead_market',
    description: 'Very low volume, minimal movement',
    duration: 180,
    initialPrice: 51000,
    volatilityRange: [0.00005, 0.0002],
    trendBias: 0,
    volumeProfile: 'dead',
  },
];

export class MarketSimulator {
  private mode: SimulationMode = 'SYNTHETIC';
  private dataLoader: HistoricalDataLoader;

  // Current simulation state
  private currentIndex: number = 0;
  private priceData: PriceDataPoint[] = [];
  private indicators: IndicatorSnapshot[] = [];
  private segment: MarketSegment | null = null;

  // Synthetic generation state
  private syntheticPrice: number = 50000;
  private syntheticVolume: number = 1000000;
  private currentScenario: MarketScenario | null = null;
  private scenarioTime: number = 0;

  // RSI state tracking
  private rsiHistory: number[] = [];
  private atrHistory: number[] = [];

  constructor() {
    this.dataLoader = new HistoricalDataLoader();
  }

  /**
   * Tarihsel veri ile başlat
   */
  async initWithHistoricalData(
    pair: string = 'BTC-USD',
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    this.mode = 'HISTORICAL';
    this.priceData = await this.dataLoader.fetchPriceHistory(pair, startDate, endDate);

    if (this.priceData.length === 0) {
      return false;
    }

    this.indicators = this.dataLoader.calculateIndicators(this.priceData);
    this.currentIndex = 0;
    return true;
  }

  /**
   * Segment ile başlat (pre-analyzed market condition)
   */
  initWithSegment(segment: MarketSegment): void {
    this.mode = 'REPLAY';
    this.segment = segment;
    this.priceData = segment.data;
    this.indicators = this.dataLoader.calculateIndicators(this.priceData);
    this.currentIndex = 0;
  }

  /**
   * Sentetik senaryo ile başlat
   */
  initWithScenario(scenario: MarketScenario): void {
    this.mode = 'SYNTHETIC';
    this.currentScenario = scenario;
    this.syntheticPrice = scenario.initialPrice;
    this.scenarioTime = 0;
    this.rsiHistory = [];
    this.atrHistory = [];

    // Pre-fill RSI history with neutral values
    for (let i = 0; i < 14; i++) {
      this.rsiHistory.push(scenario.initialPrice * (1 + (Math.random() - 0.5) * 0.001));
    }
  }

  /**
   * Rastgele senaryo seç ve başlat
   */
  initRandomScenario(): MarketScenario {
    const scenario =
      TRAINING_SCENARIOS[Math.floor(Math.random() * TRAINING_SCENARIOS.length)];
    this.initWithScenario(scenario);
    return scenario;
  }

  /**
   * Bir adım ilerle ve market state döndür
   */
  step(dt: number = 1 / 60): MarketState {
    if (this.mode === 'SYNTHETIC') {
      return this.stepSynthetic(dt);
    } else {
      return this.stepHistorical();
    }
  }

  /**
   * Sentetik veri üret
   */
  private stepSynthetic(dt: number): MarketState {
    if (!this.currentScenario) {
      this.initRandomScenario();
    }

    const scenario = this.currentScenario!;
    this.scenarioTime += dt;

    // Volatility varies over time
    const volBase = scenario.volatilityRange[0];
    const volRange = scenario.volatilityRange[1] - scenario.volatilityRange[0];
    const volatility = volBase + Math.random() * volRange;

    // Price movement with trend bias
    const randomComponent = (Math.random() - 0.5) * 2;
    const trendComponent = scenario.trendBias * 0.3;
    const priceChange = (randomComponent + trendComponent) * volatility;

    this.syntheticPrice *= 1 + priceChange;

    // Volume generation based on profile
    let volumeMultiplier: number;
    switch (scenario.volumeProfile) {
      case 'whale':
        volumeMultiplier =
          Math.random() < 0.1 ? 3 + Math.random() * 5 : 0.8 + Math.random() * 0.4;
        break;
      case 'dead':
        volumeMultiplier = 0.1 + Math.random() * 0.3;
        break;
      default:
        volumeMultiplier = 0.7 + Math.random() * 0.6;
    }
    this.syntheticVolume = 1000000 * volumeMultiplier;

    // Track RSI history
    this.rsiHistory.push(this.syntheticPrice);
    if (this.rsiHistory.length > 300) this.rsiHistory.shift();

    // Calculate indicators
    const rsi = this.calculateRSI();
    const { atr, atrPercent } = this.calculateATR();
    const macdResult = this.calculateMACD();
    const normalizedVolume = this.normalizeVolume(this.syntheticVolume);

    // Determine volatility level
    let volatilityLevel: 'low' | 'medium' | 'high' | 'extreme';
    if (atrPercent < 0.1) volatilityLevel = 'low';
    else if (atrPercent < 0.3) volatilityLevel = 'medium';
    else if (atrPercent < 0.8) volatilityLevel = 'high';
    else volatilityLevel = 'extreme';

    // Determine trend from RSI
    let trend: 'bull' | 'bear' | 'sideways';
    if (rsi > 60) trend = 'bull';
    else if (rsi < 40) trend = 'bear';
    else trend = 'sideways';

    return {
      price: this.syntheticPrice,
      volume: this.syntheticVolume,
      rsi,
      atr,
      atrPercent,
      macd: macdResult.macd,
      macdSignal: macdResult.signal,
      macdHistogram: macdResult.histogram,
      normalizedVolume,
      trend,
      volatilityLevel,
    };
  }

  /**
   * Tarihsel veriden adım
   */
  private stepHistorical(): MarketState {
    if (this.currentIndex >= this.priceData.length) {
      this.currentIndex = 0; // Loop
    }

    const point = this.priceData[this.currentIndex];
    const indicator = this.indicators[this.currentIndex];
    this.currentIndex++;

    // Determine volatility level
    let volatilityLevel: 'low' | 'medium' | 'high' | 'extreme';
    if (indicator.atrPercent < 0.1) volatilityLevel = 'low';
    else if (indicator.atrPercent < 0.3) volatilityLevel = 'medium';
    else if (indicator.atrPercent < 0.8) volatilityLevel = 'high';
    else volatilityLevel = 'extreme';

    // Determine trend
    let trend: 'bull' | 'bear' | 'sideways';
    if (indicator.rsi > 60) trend = 'bull';
    else if (indicator.rsi < 40) trend = 'bear';
    else trend = 'sideways';

    return {
      price: point.price,
      volume: point.volume,
      rsi: indicator.rsi,
      atr: indicator.atr,
      atrPercent: indicator.atrPercent,
      macd: indicator.macd,
      macdSignal: indicator.macdSignal,
      macdHistogram: indicator.macdHistogram,
      normalizedVolume: indicator.normalizedVolume,
      trend,
      volatilityLevel,
    };
  }

  /**
   * RSI hesapla (standalone)
   */
  private calculateRSI(): number {
    if (this.rsiHistory.length < 15) return 50;

    const period = 14;
    const changes: number[] = [];
    for (let i = this.rsiHistory.length - period; i < this.rsiHistory.length; i++) {
      changes.push(this.rsiHistory[i] - this.rsiHistory[i - 1]);
    }

    const gains = changes.filter(c => c > 0);
    const losses = changes.filter(c => c < 0).map(c => -c);

    const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  /**
   * ATR hesapla
   */
  private calculateATR(): { atr: number; atrPercent: number } {
    this.atrHistory.push(this.syntheticPrice);
    if (this.atrHistory.length > 15) this.atrHistory.shift();

    if (this.atrHistory.length < 2) return { atr: 0, atrPercent: 0 };

    const trs: number[] = [];
    for (let i = 1; i < this.atrHistory.length; i++) {
      trs.push(Math.abs(this.atrHistory[i] - this.atrHistory[i - 1]));
    }

    const atr = trs.reduce((a, b) => a + b, 0) / trs.length;
    const atrPercent = (atr / this.syntheticPrice) * 100;

    return { atr, atrPercent };
  }

  /**
   * MACD hesapla (simplified)
   */
  private calculateMACD(): { macd: number; signal: number; histogram: number } {
    if (this.rsiHistory.length < 26) {
      return { macd: 0, signal: 0, histogram: 0 };
    }

    const ema12 = this.calculateEMA(this.rsiHistory, 12);
    const ema26 = this.calculateEMA(this.rsiHistory, 26);
    const macd = ema12 - ema26;

    // Signal line (simplified as current MACD for now)
    const signal = macd * 0.9; // Approximation

    return {
      macd,
      signal,
      histogram: macd - signal,
    };
  }

  /**
   * EMA hesapla
   */
  private calculateEMA(data: number[], period: number): number {
    const k = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }

    return ema;
  }

  /**
   * Volume normalize et
   */
  private normalizeVolume(volume: number): number {
    // Simple percentile estimation
    const baseVolume = 1000000;
    const ratio = volume / baseVolume;
    return Math.min(1, Math.max(0, ratio / 2));
  }

  /**
   * Simülasyon bitti mi?
   */
  isComplete(): boolean {
    if (this.mode === 'SYNTHETIC' && this.currentScenario) {
      return this.scenarioTime >= this.currentScenario.duration;
    }
    return this.currentIndex >= this.priceData.length;
  }

  /**
   * Mevcut senaryo bilgisi
   */
  getCurrentScenario(): MarketScenario | null {
    return this.currentScenario;
  }

  /**
   * Mevcut segment bilgisi
   */
  getCurrentSegment(): MarketSegment | null {
    return this.segment;
  }

  /**
   * Reset
   */
  reset(): void {
    this.currentIndex = 0;
    this.scenarioTime = 0;
    this.rsiHistory = [];
    this.atrHistory = [];
  }
}

// Factory function
export function createMarketSimulator(): MarketSimulator {
  return new MarketSimulator();
}
