/**
 * DataResilienceService - Market Veri Bağlantısı Dayanıklılık Katmanı
 *
 * AI Director V2 - Veri Boşluklarını Doldurma ve Bağlantı Yönetimi
 *
 * Özellikler:
 * - Veri boşluklarını interpolasyon ile doldurma
 * - Son bilinen değerleri cache'leme
 * - Bağlantı koptuğunda fallback değerler
 * - Exponential backoff ile yeniden bağlanma
 * - Veri kalitesi skorlaması
 *
 * @see docs/AI_DIRECTOR_V2_DESIGN.md
 */

import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';

/**
 * Tek bir market veri noktası
 */
export interface MarketDataPoint {
  timestamp: number;
  price: number;
  volume: number;
  rsi: number;
  atr: number;
  atrPercent: number;
}

/**
 * Veri kalitesi metrikleri
 */
export interface DataQualityMetrics {
  freshness: number; // 0-1, 1 = çok taze
  completeness: number; // 0-1, 1 = eksik yok
  consistency: number; // 0-1, 1 = tutarlı
  overallScore: number; // Ortalama skor
  lastRealDataTime: number;
  gapsFilled: number;
  interpolatedPoints: number;
}

/**
 * Bağlantı durumu
 */
export type ConnectionState =
  | 'connected'
  | 'degraded'
  | 'disconnected'
  | 'reconnecting';

/**
 * Resilience configuration
 */
export const RESILIENCE_CONFIG = {
  // Cache settings
  MAX_CACHE_SIZE: 1000, // Maximum cached data points
  CACHE_EXPIRY_MS: 5 * 60 * 1000, // 5 minutes

  // Staleness thresholds
  FRESH_THRESHOLD_MS: 2000, // Data is fresh within 2s
  DEGRADED_THRESHOLD_MS: 15000, // Data is degraded after 15s (design spec)
  STALE_THRESHOLD_MS: 30000, // Data is stale after 30s

  // Interpolation settings
  MAX_INTERPOLATION_GAP_MS: 60000, // Max 1 minute gap to interpolate
  INTERPOLATION_INTERVAL_MS: 1000, // 1 second intervals

  // Reconnection settings
  INITIAL_RETRY_DELAY_MS: 1000,
  MAX_RETRY_DELAY_MS: 30000,
  BACKOFF_MULTIPLIER: 2,

  // Fallback defaults (neutral market conditions)
  FALLBACK_DEFAULTS: {
    rsi: 50,
    atrPercent: 0.5,
    volume: 0,
    priceChangePercent: 0,
  } as const,
} as const;

/**
 * DataResilienceService - Singleton
 */
class DataResilienceServiceClass {
  private static instance: DataResilienceServiceClass | null = null;

  // Data cache (circular buffer)
  private dataCache: MarketDataPoint[] = [];

  // Last known good values
  private lastKnownData: MarketDataPoint | null = null;

  // Connection state
  private connectionState: ConnectionState = 'disconnected';
  private lastDataTime: number = 0;
  private reconnectAttempts: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // Data quality tracking
  private gapsFilled: number = 0;
  private interpolatedPoints: number = 0;
  private totalDataPoints: number = 0;

  private constructor() {
    this.setupEventListeners();
    Logger.debug('[DataResilienceService] Initialized');
  }

  static getInstance(): DataResilienceServiceClass {
    return (DataResilienceServiceClass.instance ??= new DataResilienceServiceClass());
  }

  /**
   * Setup event listeners for market data
   */
  private setupEventListeners(): void {
    // Listen for real market data
    EventBus.on('marketStateUpdated', data => {
      this.onMarketData({
        timestamp: Date.now(),
        price: data.price,
        volume: data.volume,
        rsi: data.rsi,
        atr: data.atr,
        atrPercent: data.atrPercent,
      });
    });

    // Listen for connection events
    EventBus.on('marketDataTimeout', () => {
      this.onConnectionLost();
    });

    EventBus.on('marketDataRecovered', () => {
      this.onConnectionRestored();
    });

    // Listen for game reset
    EventBus.on('gameReset', () => {
      this.resetQualityMetrics();
    });
  }

  /**
   * Process incoming market data
   */
  /**
   * Process incoming market data
   */
  private onMarketData(data: MarketDataPoint): void {
    const now = Date.now();
    const timeSinceLast = this.lastDataTime > 0 ? now - this.lastDataTime : 0;

    // Check for gaps and fill if needed
    if (
      timeSinceLast > RESILIENCE_CONFIG.INTERPOLATION_INTERVAL_MS * 1.5 &&
      this.lastKnownData
    ) {
      this.fillGap(this.lastKnownData, data);
    }

    // Store data
    this.addToCache(data);
    this.lastKnownData = data;
    this.lastDataTime = now;

    // Update connection state
    this.updateConnectionState('connected');
  }

  /**
   * Fill data gap with interpolated values
   */
  private fillGap(start: MarketDataPoint, end: MarketDataPoint): void {
    const gapMs = end.timestamp - start.timestamp;

    // Don't interpolate if gap is too large
    if (gapMs > RESILIENCE_CONFIG.MAX_INTERPOLATION_GAP_MS) {
      Logger.warn(
        `[DataResilienceService] Gap too large to interpolate: ${(gapMs / 1000).toFixed(1)}s`
      );
      this.gapsFilled++;
      return;
    }

    const steps = Math.floor(gapMs / RESILIENCE_CONFIG.INTERPOLATION_INTERVAL_MS) - 1;

    for (let i = 1; i <= steps; i++) {
      const t = i / (steps + 1); // 0 to 1
      const interpolated: MarketDataPoint = {
        timestamp: start.timestamp + i * RESILIENCE_CONFIG.INTERPOLATION_INTERVAL_MS,
        price: this.lerp(start.price, end.price, t),
        volume: this.lerp(start.volume, end.volume, t),
        rsi: this.lerp(start.rsi, end.rsi, t),
        atr: this.lerp(start.atr, end.atr, t),
        atrPercent: this.lerp(start.atrPercent, end.atrPercent, t),
      };

      this.addToCache(interpolated);
      this.interpolatedPoints++;
    }

    this.gapsFilled++;
    Logger.debug(
      `[DataResilienceService] Filled gap with ${steps} interpolated points`
    );
  }

  /**
   * Linear interpolation
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Add data point to cache
   */
  private addToCache(data: MarketDataPoint): void {
    this.dataCache.push(data);
    this.totalDataPoints++;

    // Trim cache if too large
    while (this.dataCache.length > RESILIENCE_CONFIG.MAX_CACHE_SIZE) {
      this.dataCache.shift();
    }
  }

  /**
   * Handle connection lost
   */
  private onConnectionLost(): void {
    this.updateConnectionState('disconnected');
    this.startReconnect();

    Logger.warn('[DataResilienceService] Connection lost, using fallback values');

    // Emit fallback event for consumers
    EventBus.emit('marketDataFallback', {
      lastRealData: this.lastKnownData,
      usingDefaults: !this.lastKnownData,
    });
  }

  /**
   * Handle connection restored
   */
  private onConnectionRestored(): void {
    this.updateConnectionState('connected');
    this.reconnectAttempts = 0;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    Logger.info('[DataResilienceService] Connection restored');
  }

  /**
   * Start reconnection with exponential backoff
   */
  private startReconnect(): void {
    if (this.reconnectTimer) return;

    this.updateConnectionState('reconnecting');
    this.reconnectAttempts++;

    const delay = Math.min(
      RESILIENCE_CONFIG.INITIAL_RETRY_DELAY_MS *
        Math.pow(RESILIENCE_CONFIG.BACKOFF_MULTIPLIER, this.reconnectAttempts - 1),
      RESILIENCE_CONFIG.MAX_RETRY_DELAY_MS
    );

    Logger.info(
      `[DataResilienceService] Reconnecting in ${(delay / 1000).toFixed(1)}s (attempt ${this.reconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      EventBus.emit('marketReconnectAttempt', { attempt: this.reconnectAttempts });
    }, delay);
  }

  /**
   * Update connection state
   */
  private updateConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      EventBus.emit('marketConnectionStateChanged', { state });
    }
  }

  // --- Public API ---

  /**
   * Get current market data with fallback
   * Always returns valid data (real or fallback)
   */
  getCurrentData(): MarketDataPoint {
    const now = Date.now();
    const timeSinceLast = now - this.lastDataTime;

    // If we have recent real data, use it
    if (this.lastKnownData && timeSinceLast < RESILIENCE_CONFIG.STALE_THRESHOLD_MS) {
      return this.lastKnownData;
    }

    // Return fallback with last known price or default
    return {
      timestamp: now,
      price: this.lastKnownData?.price ?? 0,
      volume: RESILIENCE_CONFIG.FALLBACK_DEFAULTS.volume,
      rsi: RESILIENCE_CONFIG.FALLBACK_DEFAULTS.rsi,
      atr: 0,
      atrPercent: RESILIENCE_CONFIG.FALLBACK_DEFAULTS.atrPercent,
    };
  }

  /**
   * Get RSI with fallback to neutral
   */
  getRSI(): number {
    return this.lastKnownData?.rsi ?? RESILIENCE_CONFIG.FALLBACK_DEFAULTS.rsi;
  }

  /**
   * Get ATR percent with fallback
   */
  getATRPercent(): number {
    return (
      this.lastKnownData?.atrPercent ?? RESILIENCE_CONFIG.FALLBACK_DEFAULTS.atrPercent
    );
  }

  /**
   * Get price with fallback to last known
   */
  getPrice(): number {
    return this.lastKnownData?.price ?? 0;
  }

  /**
   * Check if data is fresh (within threshold)
   */
  isDataFresh(): boolean {
    return Date.now() - this.lastDataTime < RESILIENCE_CONFIG.FRESH_THRESHOLD_MS;
  }

  /**
   * Check if data is stale
   */
  isDataStale(): boolean {
    return Date.now() - this.lastDataTime > RESILIENCE_CONFIG.STALE_THRESHOLD_MS;
  }

  /**
   * Get connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get data quality metrics
   */
  getQualityMetrics(): DataQualityMetrics {
    const now = Date.now();
    const timeSinceLast = now - this.lastDataTime;

    // Freshness: 1.0 for <2s, decays to 0 at 30s
    const freshness = Math.max(
      0,
      1 - timeSinceLast / RESILIENCE_CONFIG.STALE_THRESHOLD_MS
    );

    // Completeness: ratio of real vs interpolated
    const completeness =
      this.totalDataPoints > 0
        ? (this.totalDataPoints - this.interpolatedPoints) / this.totalDataPoints
        : 1;

    // Consistency: inverse of gaps ratio
    const consistency =
      this.totalDataPoints > 0
        ? Math.max(0, 1 - (this.gapsFilled * 10) / this.totalDataPoints)
        : 1;

    const overallScore = (freshness + completeness + consistency) / 3;

    return {
      freshness,
      completeness,
      consistency,
      overallScore,
      lastRealDataTime: this.lastDataTime,
      gapsFilled: this.gapsFilled,
      interpolatedPoints: this.interpolatedPoints,
    };
  }

  /**
   * Get cached data for backtesting/analysis
   */
  getCachedData(): ReadonlyArray<MarketDataPoint> {
    return [...this.dataCache];
  }

  /**
   * Get last N data points
   */
  getRecentData(count: number): MarketDataPoint[] {
    return this.dataCache.slice(-count);
  }

  /**
   * Fill array with interpolated data (for training)
   */
  fillDataArray(
    data: Array<Partial<MarketDataPoint>>,
    expectedIntervalMs: number = 1000
  ): MarketDataPoint[] {
    const filled: MarketDataPoint[] = [];

    for (let i = 0; i < data.length; i++) {
      const current = data[i];

      // Use defaults for missing values
      const point: MarketDataPoint = {
        timestamp: current?.timestamp ?? i * expectedIntervalMs,
        price: current?.price ?? filled[filled.length - 1]?.price ?? 50000,
        volume: current?.volume ?? 0,
        rsi: current?.rsi ?? RESILIENCE_CONFIG.FALLBACK_DEFAULTS.rsi,
        atr: current?.atr ?? 0,
        atrPercent:
          current?.atrPercent ?? RESILIENCE_CONFIG.FALLBACK_DEFAULTS.atrPercent,
      };

      // Interpolate if there's a gap to next point
      if (i < data.length - 1 && data[i + 1]?.timestamp) {
        const gap = (data[i + 1]?.timestamp ?? 0) - point.timestamp;
        if (gap > expectedIntervalMs * 1.5) {
          filled.push(point);

          // Add interpolated points
          const steps = Math.floor(gap / expectedIntervalMs) - 1;
          const nextPoint = data[i + 1];

          for (let j = 1; j <= steps; j++) {
            const t = j / (steps + 1);
            filled.push({
              timestamp: point.timestamp + j * expectedIntervalMs,
              price: this.lerp(point.price, nextPoint?.price ?? point.price, t),
              volume: this.lerp(point.volume, nextPoint?.volume ?? 0, t),
              rsi: this.lerp(point.rsi, nextPoint?.rsi ?? 50, t),
              atr: this.lerp(point.atr, nextPoint?.atr ?? 0, t),
              atrPercent: this.lerp(point.atrPercent, nextPoint?.atrPercent ?? 0.5, t),
            });
          }

          continue;
        }
      }

      filled.push(point);
    }

    return filled;
  }

  /**
   * Generate a synthetic data point with neutral indicators.
   * Uses last known price (or 0) and FALLBACK_DEFAULTS for all other fields.
   */
  generateSyntheticPoint(): MarketDataPoint {
    return {
      timestamp: Date.now(),
      price: this.lastKnownData?.price ?? 0,
      volume: RESILIENCE_CONFIG.FALLBACK_DEFAULTS.volume,
      rsi: RESILIENCE_CONFIG.FALLBACK_DEFAULTS.rsi,
      atr: 0,
      atrPercent: RESILIENCE_CONFIG.FALLBACK_DEFAULTS.atrPercent,
    };
  }

  /**
   * Reset quality metrics (call on game start)
   */
  resetQualityMetrics(): void {
    this.gapsFilled = 0;
    this.interpolatedPoints = 0;
    this.totalDataPoints = 0;
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.dataCache = [];
    this.lastKnownData = null;
    this.lastDataTime = 0;
    this.reconnectAttempts = 0;
    this.connectionState = 'disconnected';

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.resetQualityMetrics();
    Logger.debug('[DataResilienceService] Reset');
  }

  /**
   * Debug state
   */
  getDebugState(): Record<string, unknown> {
    return {
      connectionState: this.connectionState,
      cacheSize: this.dataCache.length,
      lastDataTime:
        this.lastDataTime > 0 ? new Date(this.lastDataTime).toISOString() : 'never',
      dataAge:
        this.lastDataTime > 0
          ? `${((Date.now() - this.lastDataTime) / 1000).toFixed(1)}s`
          : 'N/A',
      quality: this.getQualityMetrics(),
      lastKnownPrice: this.lastKnownData?.price ?? 'N/A',
      lastKnownRSI: this.lastKnownData?.rsi ?? 'N/A',
    };
  }
}

// Export singleton
export const DataResilienceService = DataResilienceServiceClass.getInstance();

// For testing
export function createDataResilienceService(): DataResilienceServiceClass {
  (DataResilienceServiceClass as unknown as { instance: null }).instance = null;
  return DataResilienceServiceClass.getInstance();
}
