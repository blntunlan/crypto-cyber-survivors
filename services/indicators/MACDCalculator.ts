/**
 * MACD Calculator - Moving Average Convergence Divergence
 *
 * Calculates MACD Line, Signal Line, and Histogram using standard periods (12, 26, 9).
 * Used for detecting market momentum and trend reversals.
 *
 * Formula:
 * - MACD Line: EMA(12) - EMA(26)
 * - Signal Line: EMA(9) of the MACD Line
 * - Histogram: MACD Line - Signal Line
 *
 * Architecture:
 * - Uses EMA (Exponential Moving Average) for all internal calculations.
 * - Maintains history to provide stable Signal Line calculations.
 */

import { SYNC_CONFIG, type MACDResult } from '../../types/indicators';
import { EventBus } from '../core/EventBus';

export interface MACDConfig {
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
}

export const DEFAULT_MACD_CONFIG: MACDConfig = {
  fastPeriod: 12,
  slowPeriod: 26,
  signalPeriod: 9,
};

export class MACDCalculator {
  private priceHistory: number[] = [];
  private macdHistory: number[] = [];
  private config: MACDConfig;

  // EMA States
  private prevFastEma: number | null = null;
  private prevSlowEma: number | null = null;
  private prevSignalEma: number | null = null;

  private currentResult: MACDResult = { macd: 0, signal: 0, histogram: 0, value: 0 };

  constructor(config: MACDConfig = DEFAULT_MACD_CONFIG) {
    this.config = config;

    // Subscribe to game reset
    EventBus.on('gameReset', () => this.reset());
  }

  /**
   * Update MACD with a new price point
   *
   * @param price Current price
   * @returns Updated MACD result
   */
  update(price: number): MACDResult {
    if (!Number.isFinite(price) || price <= 0) {
      return this.currentResult;
    }

    this.priceHistory.push(price);

    // Limit price history to prevent memory leak
    if (this.priceHistory.length > SYNC_CONFIG.MAX_HISTORY_SIZE) {
      this.priceHistory.shift();
    }

    // Need at least slowPeriod + signalPeriod to have a reliable signal line
    const minRequired = this.config.slowPeriod;

    if (this.priceHistory.length >= minRequired) {
      this.currentResult = this.calculate();
    }

    return this.currentResult;
  }

  /**
   * Get current MACD result
   */
  getResult(): MACDResult {
    return this.currentResult;
  }

  /**
   * Check if the system has enough data for accurate calculations
   */
  isInitialized(): boolean {
    return (
      this.priceHistory.length >= this.config.slowPeriod && this.prevSignalEma !== null
    );
  }

  /**
   * Reset calculator state
   */
  reset(): void {
    this.priceHistory = [];
    this.macdHistory = [];
    this.prevFastEma = null;
    this.prevSlowEma = null;
    this.prevSignalEma = null;
    this.currentResult = { macd: 0, signal: 0, histogram: 0, value: 0 };
  }

  /**
   * Internal calculation logic
   */
  private calculate(): MACDResult {
    const { fastPeriod, slowPeriod, signalPeriod } = this.config;
    const currentPrice = this.priceHistory[this.priceHistory.length - 1]!;

    // 1. Calculate Fast EMA
    this.prevFastEma = this.calculateEMA(
      currentPrice,
      this.prevFastEma,
      fastPeriod,
      this.priceHistory.slice(0, fastPeriod)
    );

    // 2. Calculate Slow EMA
    this.prevSlowEma = this.calculateEMA(
      currentPrice,
      this.prevSlowEma,
      slowPeriod,
      this.priceHistory.slice(0, slowPeriod)
    );

    if (this.prevFastEma === null || this.prevSlowEma === null) {
      return this.currentResult;
    }

    // 3. Calculate MACD Line
    const macdLine = this.prevFastEma - this.prevSlowEma;
    this.macdHistory.push(macdLine);

    if (this.macdHistory.length > SYNC_CONFIG.MAX_HISTORY_SIZE) {
      this.macdHistory.shift();
    }

    // 4. Calculate Signal Line (EMA of MACD Line)
    this.prevSignalEma = this.calculateEMA(
      macdLine,
      this.prevSignalEma,
      signalPeriod,
      this.macdHistory.slice(0, signalPeriod)
    );

    if (this.prevSignalEma === null) {
      return {
        macd: Number(macdLine.toFixed(SYNC_CONFIG.PRECISION)),
        signal: 0,
        histogram: 0,
        value: Number(macdLine.toFixed(SYNC_CONFIG.PRECISION)),
      };
    }

    // 5. Calculate Histogram
    const histogram = macdLine - this.prevSignalEma;

    return {
      macd: Number(macdLine.toFixed(SYNC_CONFIG.PRECISION)),
      signal: Number(this.prevSignalEma.toFixed(SYNC_CONFIG.PRECISION)),
      histogram: Number(histogram.toFixed(SYNC_CONFIG.PRECISION)),
      value: Number(macdLine.toFixed(SYNC_CONFIG.PRECISION)),
    };
  }

  /**
   * Helper to calculate or update EMA
   */
  private calculateEMA(
    current: number,
    prevEma: number | null,
    period: number,
    seedData: number[]
  ): number | null {
    const k = 2 / (period + 1);

    if (prevEma === null) {
      // Initialize with SMA if we have enough seed data
      if (seedData.length < period) return null;
      const sum = seedData.reduce((a, b) => a + b, 0);
      return sum / period;
    }

    // Update with Smoothing
    return current * k + prevEma * (1 - k);
  }
}

// Factory for testing/DI
export function createMACDCalculator(config?: MACDConfig): MACDCalculator {
  return new MACDCalculator(config);
}
