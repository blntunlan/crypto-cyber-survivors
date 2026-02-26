/**
 * ClientIndicatorService - Client-Side Market Indicator Calculator
 *
 * AI Director V2 - Phase 3: Client-Side Indicators
 *
 * This service calculates all market indicators on the client for instant response.
 * Server only verifies calculations for anti-cheat, never drives difficulty.
 *
 * Key Indicators:
 * - RSI (14-period, Wilder's smoothing)
 * - ATR (14-period, Simple Moving Average)
 * - Volume Normalization (percentile ranking)
 * - Price Change Rate (60-second window)
 * - Trend Strength (EMA slope)
 * - RSI Momentum (rate of change)
 *
 * All calculations use deterministic algorithms with fixed precision
 * to match server verification exactly.
 */

import { type MarketPosition } from '../../types';
import { MarketPosition as MarketPositionEnum } from '../../types';
import { type CryptoPair } from '../../types/crypto';
import { createRSICalculator, type RSICalculator } from './RSICalculator';
import { createMACDCalculator, type MACDCalculator } from './MACDCalculator';
import { ATRCalculator } from './ATRCalculator';
import { createVolumeAnalyzer, type VolumeAnalyzer } from './VolumeAnalyzer';
import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';

/**
 * Client indicator configuration - synced with UnifiedDirector expectations
 */
export const CLIENT_INDICATOR_CONFIG = {
  // RSI settings
  RSI_PERIOD: 14,
  RSI_OVERSOLD: 30,
  RSI_OVERBOUGHT: 70,
  RSI_HYSTERESIS: 5, // Buffer to prevent flickering

  // ATR settings
  ATR_PERIOD: 14,
  ATR_VOLATILE_THRESHOLD: 0.005, // 0.5% = volatile market
  ATR_CALM_THRESHOLD: 0.002, // 0.2% = calm market

  // Volume settings
  VOLUME_HISTORY_SIZE: 100,
  WHALE_PERCENTILE_BABY: 0.6,
  WHALE_PERCENTILE_NORMAL: 0.75,
  WHALE_PERCENTILE_MEGA: 0.9,

  // Price change settings
  PRICE_CHANGE_WINDOW: 60, // seconds
  FLASH_CRASH_THRESHOLD: -0.01, // -1% in 60s

  // Trend settings
  TREND_EMA_FAST: 12,
  TREND_EMA_SLOW: 26,

  // Precision for deterministic calculations
  PRECISION: 6,
} as const;

/**
 * Complete client-side indicator state for UnifiedDirector
 */
export interface ClientIndicatorState {
  // RSI Data (0-100 normalized to 0-1 for neural network)
  rsi: number; // Raw RSI value 0-100
  rsiNormalized: number; // Normalized 0-1 for neural network
  rsiMomentum: number; // Rate of change (-1 to 1)
  rsiState: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';

  // ATR Data
  atr: number; // Raw ATR value
  atrPercent: number; // ATR as percentage of price
  atrNormalized: number; // Normalized 0-1 for neural network

  // Volume Data
  normalizedVolume: number; // 0-1 percentile
  volumeSpike: boolean; // > 90th percentile
  whaleTier: 0 | 1 | 2 | 3; // 0=none, 1=baby, 2=normal, 3=mega

  // Price Change Data
  priceChangePercent: number; // % change in window (-1 to 1 clamped)
  isFlashCrash: boolean; // < -1% in 60s
  isMoonShot: boolean; // > +1% in 60s

  // Trend Data
  trendStrength: number; // 0-1 (0=no trend, 1=strong trend)
  trendDirection: 'UP' | 'DOWN' | 'SIDEWAYS';

  // Meta
  isInitialized: boolean;
  lastUpdateTime: number;
  dataPointCount: number;
}

/**
 * Get default indicator state (pre-initialization)
 */
export function getDefaultClientIndicatorState(): ClientIndicatorState {
  return {
    rsi: 50,
    rsiNormalized: 0.5,
    rsiMomentum: 0,
    rsiState: 'NEUTRAL',
    atr: 0,
    atrPercent: 0,
    atrNormalized: 0.5,
    normalizedVolume: 0.5,
    volumeSpike: false,
    whaleTier: 0,
    priceChangePercent: 0,
    isFlashCrash: false,
    isMoonShot: false,
    trendStrength: 0,
    trendDirection: 'SIDEWAYS',
    isInitialized: false,
    lastUpdateTime: 0,
    dataPointCount: 0,
  };
}

/**
 * Price history entry for change calculations
 */
interface PriceHistoryEntry {
  price: number;
  timestamp: number;
}

/**
 * ClientIndicatorService - Singleton for client-side indicator calculation
 */
class ClientIndicatorServiceClass {
  private static instance: ClientIndicatorServiceClass | null = null;

  // Sub-calculators
  private rsiCalculator: RSICalculator;
  private macdCalculator: MACDCalculator;
  private atrCalculator: ATRCalculator;
  private volumeAnalyzer: VolumeAnalyzer;

  // Price history for change calculations
  private priceHistory: PriceHistoryEntry[] = [];
  private lastRsi: number = 50;

  // Current state
  private state: ClientIndicatorState;
  private activePair: CryptoPair = 'BTC';
  private position: MarketPosition = MarketPositionEnum.LONG;

  private constructor() {
    this.rsiCalculator = createRSICalculator();
    this.macdCalculator = createMACDCalculator();
    this.atrCalculator = new ATRCalculator(CLIENT_INDICATOR_CONFIG.ATR_PERIOD);
    this.volumeAnalyzer = createVolumeAnalyzer();
    this.state = getDefaultClientIndicatorState();

    // Subscribe to game reset
    EventBus.on('gameReset', () => this.reset());

    // Subscribe to market state updates
    EventBus.on('marketStateUpdated', data => {
      if (data.pair === this.activePair) {
        this.update(data.price, data.volume, data.updatedAt.getTime());
      }
    });

    Logger.debug('[ClientIndicatorService] Initialized');
  }

  static getInstance(): ClientIndicatorServiceClass {
    return (ClientIndicatorServiceClass.instance ??= new ClientIndicatorServiceClass());
  }

  /**
   * Update all indicators with new market data
   * Call this on every price tick (1 second intervals typically)
   *
   * @param price Current price
   * @param volume Current volume
   * @param timestamp Unix timestamp in ms
   * @returns Complete indicator state for UnifiedDirector
   */
  update(
    price: number,
    volume: number,
    timestamp: number = Date.now()
  ): ClientIndicatorState {
    // Validate inputs
    if (!Number.isFinite(price) || price <= 0) {
      Logger.warn('[ClientIndicatorService] Invalid price received:', price);
      return this.state;
    }

    // Store previous RSI for momentum calculation
    this.lastRsi = this.state.rsi;

    // Update RSI
    const rsi = this.rsiCalculator.update(price);
    const rsiState = this.rsiCalculator.getState();
    const rsiNormalized = rsi / 100;
    const rsiMomentum = this.calculateRsiMomentum(rsi);

    // Update ATR
    const { atr, atrPercent } = this.atrCalculator.update(price, price, price);
    const atrNormalized = this.normalizeAtr(atrPercent);

    // Update Volume
    const normalizedVolume = this.volumeAnalyzer.update(volume);
    const whaleTier = this.volumeAnalyzer.getWhaleTier() as 0 | 1 | 2 | 3;
    const volumeSpike =
      normalizedVolume >= CLIENT_INDICATOR_CONFIG.WHALE_PERCENTILE_MEGA;

    // Update MACD for trend
    this.macdCalculator.update(price);

    // Update price history for change calculations
    this.updatePriceHistory(price, timestamp);
    const { priceChangePercent, isFlashCrash, isMoonShot } =
      this.calculatePriceChange(timestamp);

    // Calculate trend strength
    const { trendStrength, trendDirection } = this.calculateTrend();
    const macd = this.macdCalculator.getResult();

    // Update state
    this.state = {
      rsi,
      rsiNormalized,
      rsiMomentum,
      rsiState,
      atr,
      atrPercent,
      atrNormalized,
      normalizedVolume,
      volumeSpike,
      whaleTier,
      priceChangePercent,
      isFlashCrash,
      isMoonShot,
      trendStrength,
      trendDirection,
      isInitialized:
        this.rsiCalculator.isInitialized() || this.atrCalculator.isInitialized(),
      lastUpdateTime: timestamp,
      dataPointCount: this.rsiCalculator.getHistoryLength(),
    };

    // Emit event for other systems
    EventBus.emit('clientIndicatorsUpdated', {
      rsi: this.state.rsi,
      rsiState: this.state.rsiState,
      atrPercent: this.state.atrPercent,
      normalizedVolume: this.state.normalizedVolume,
      priceChangePercent: this.state.priceChangePercent,
      trendStrength: this.state.trendStrength,
      trendDirection: this.state.trendDirection,
      macd: {
        value: macd.macd,
        signal: macd.signal,
        histogram: macd.histogram,
      },
      whaleTier: this.state.whaleTier,
    });

    return this.state;
  }

  /**
   * Calculate RSI momentum (rate of change)
   * Returns -1 to 1 where negative = falling, positive = rising
   */
  private calculateRsiMomentum(currentRsi: number): number {
    const delta = currentRsi - this.lastRsi;
    // Clamp to -1, 1 with max delta of 10 points per tick
    return Math.max(-1, Math.min(1, delta / 10));
  }

  /**
   * Normalize ATR percent to 0-1 for neural network
   * Uses sigmoid-like mapping: low volatility → 0.5, high → 1
   */
  private normalizeAtr(atrPercent: number): number {
    // ATR typically 0.1% - 2% for crypto
    // Map to 0-1 with 0.5% being the midpoint (0.5)
    const midpoint = 0.005; // 0.5%
    const steepness = 400; // Controls curve sharpness

    // Sigmoid: 1 / (1 + e^(-steepness * (x - midpoint)))
    const normalized = 1 / (1 + Math.exp(-steepness * (atrPercent - midpoint)));

    return Number(normalized.toFixed(CLIENT_INDICATOR_CONFIG.PRECISION));
  }

  /**
   * Update price history, keeping only last 60 seconds
   */
  private updatePriceHistory(price: number, timestamp: number): void {
    this.priceHistory.push({ price, timestamp });

    // Remove entries older than window
    const cutoff = timestamp - CLIENT_INDICATOR_CONFIG.PRICE_CHANGE_WINDOW * 1000;
    this.priceHistory = this.priceHistory.filter(e => e.timestamp >= cutoff);
  }

  /**
   * Calculate price change over the window period
   */
  private calculatePriceChange(_currentTimestamp: number): {
    priceChangePercent: number;
    isFlashCrash: boolean;
    isMoonShot: boolean;
  } {
    if (this.priceHistory.length < 2) {
      return { priceChangePercent: 0, isFlashCrash: false, isMoonShot: false };
    }

    const oldestEntry = this.priceHistory[0];
    const newestEntry = this.priceHistory[this.priceHistory.length - 1];

    if (!oldestEntry || !newestEntry || oldestEntry.price === 0) {
      return { priceChangePercent: 0, isFlashCrash: false, isMoonShot: false };
    }

    const priceChangePercent =
      (newestEntry.price - oldestEntry.price) / oldestEntry.price;

    // Clamp to -1, 1 for neural network input
    const clampedChange = Math.max(-1, Math.min(1, priceChangePercent));

    return {
      priceChangePercent: Number(
        clampedChange.toFixed(CLIENT_INDICATOR_CONFIG.PRECISION)
      ),
      isFlashCrash: priceChangePercent <= CLIENT_INDICATOR_CONFIG.FLASH_CRASH_THRESHOLD,
      isMoonShot: priceChangePercent >= -CLIENT_INDICATOR_CONFIG.FLASH_CRASH_THRESHOLD,
    };
  }

  /**
   * Calculate trend strength and direction from MACD
   */
  private calculateTrend(): {
    trendStrength: number;
    trendDirection: 'UP' | 'DOWN' | 'SIDEWAYS';
  } {
    // Get MACD result and initialized status separately
    const macdResult = this.macdCalculator.getResult();
    const isInitialized = this.macdCalculator.isInitialized();

    if (!isInitialized) {
      return { trendStrength: 0, trendDirection: 'SIDEWAYS' };
    }

    // Use MACD histogram for direction
    const histogram = macdResult.histogram;
    const histogramAbs = Math.abs(histogram);

    // Normalize histogram to 0-1 (typical range is -50 to +50 for BTC)
    const normalizedHistogram = Math.min(1, histogramAbs / 50);

    // Determine direction
    let direction: 'UP' | 'DOWN' | 'SIDEWAYS';
    if (histogram > 0.5) {
      direction = 'UP';
    } else if (histogram < -0.5) {
      direction = 'DOWN';
    } else {
      direction = 'SIDEWAYS';
    }

    return {
      trendStrength: Number(
        normalizedHistogram.toFixed(CLIENT_INDICATOR_CONFIG.PRECISION)
      ),
      trendDirection: direction,
    };
  }

  /**
   * Set the active trading pair
   */
  setPair(pair: CryptoPair): void {
    if (pair !== this.activePair) {
      this.activePair = pair;
      Logger.debug(`[ClientIndicatorService] Active pair set to ${pair}`);
    }
  }

  /**
   * Set the player's position (LONG/SHORT)
   */
  setPosition(position: MarketPosition): void {
    this.position = position;
  }

  /**
   * Get current indicator state
   */
  getState(): ClientIndicatorState {
    return this.state;
  }

  /**
   * Get state formatted for UnifiedDirector input
   * Returns the 6 market data inputs expected by the neural network
   */
  getUnifiedInputs(): {
    rsiNormalized: number;
    rsiMomentum: number;
    atrNormalized: number;
    volumeNormalized: number;
    priceChange: number;
    trendStrength: number;
  } {
    return {
      rsiNormalized: this.state.rsiNormalized,
      rsiMomentum: this.state.rsiMomentum,
      atrNormalized: this.state.atrNormalized,
      volumeNormalized: this.state.normalizedVolume,
      priceChange: this.state.priceChangePercent,
      trendStrength: this.state.trendStrength,
    };
  }

  /**
   * Check if current market favors player position
   */
  isFavorable(): boolean {
    const { rsiState } = this.state;
    if (rsiState === 'NEUTRAL') return false;

    return (
      (this.position === MarketPositionEnum.LONG && rsiState === 'OVERSOLD') ||
      (this.position === MarketPositionEnum.SHORT && rsiState === 'OVERBOUGHT')
    );
  }

  /**
   * Check if current market is unfavorable for player position
   */
  isUnfavorable(): boolean {
    const { rsiState } = this.state;
    if (rsiState === 'NEUTRAL') return false;

    return (
      (this.position === MarketPositionEnum.LONG && rsiState === 'OVERBOUGHT') ||
      (this.position === MarketPositionEnum.SHORT && rsiState === 'OVERSOLD')
    );
  }

  /**
   * Check if indicators are initialized with enough data
   */
  isInitialized(): boolean {
    return this.state.isInitialized;
  }

  /**
   * Reset all indicator state (call on game reset)
   */
  reset(): void {
    this.rsiCalculator.reset();
    this.macdCalculator.reset();
    this.atrCalculator.reset();
    this.volumeAnalyzer.reset();
    this.priceHistory = [];
    this.lastRsi = 50;
    this.state = getDefaultClientIndicatorState();

    Logger.debug('[ClientIndicatorService] Reset');
  }

  /**
   * Warmup indicators with historical data
   * Used to pre-populate indicators before game starts
   */
  async warmup(
    history: Array<{ price: number; volume: number; timestamp: number }>
  ): Promise<void> {
    if (history.length === 0) return;

    Logger.info(
      `[ClientIndicatorService] Warming up with ${history.length} data points...`
    );

    // Reset before warmup
    this.reset();

    // Process each historical point
    for (const point of history) {
      this.update(point.price, point.volume, point.timestamp);
    }

    Logger.info(
      `[ClientIndicatorService] Warmup complete. RSI: ${this.state.rsi}, ATR: ${this.state.atrPercent}%`
    );
  }

  /**
   * Get debug information for DebugPanel
   */
  getDebugState(): Record<string, unknown> {
    return {
      rsi: this.state.rsi.toFixed(2),
      rsiState: this.state.rsiState,
      rsiMomentum: this.state.rsiMomentum.toFixed(3),
      atrPercent: `${(this.state.atrPercent * 100).toFixed(3)}%`,
      volume: this.state.normalizedVolume.toFixed(3),
      whaleTier: this.state.whaleTier,
      priceChange: `${(this.state.priceChangePercent * 100).toFixed(2)}%`,
      trend: `${this.state.trendDirection} (${this.state.trendStrength.toFixed(2)})`,
      flashCrash: this.state.isFlashCrash,
      moonShot: this.state.isMoonShot,
      initialized: this.state.isInitialized,
      dataPoints: this.state.dataPointCount,
    };
  }
}

// Export singleton instance
export const ClientIndicatorService = ClientIndicatorServiceClass.getInstance();

// For testing - allows creating fresh instances
export function createClientIndicatorService(): ClientIndicatorServiceClass {
  (ClientIndicatorServiceClass as unknown as { instance: null }).instance = null;
  return ClientIndicatorServiceClass.getInstance();
}
