/**
 * RSI Calculator - Relative Strength Index
 *
 * Calculates RSI(7) for faster response to market changes.
 * Includes hysteresis to prevent state flickering at thresholds.
 *
 * RSI States:
 * - OVERSOLD: RSI < 30 (entry), exits when RSI > 35
 * - OVERBOUGHT: RSI > 70 (entry), exits when RSI < 65
 * - NEUTRAL: Everything in between
 *
 * Edge Cases Handled:
 * - Empty/insufficient price history → returns 50 (neutral)
 * - All gains → returns 100
 * - All losses → returns 0
 * - NaN/Infinity → returns 50 (neutral)
 */

import {
  type RSIState,
  type RSIConfig,
  DEFAULT_RSI_CONFIG,
  getRSIStateWithHysteresis,
} from '../../types/indicators';
import { EventBus } from '../EventBus';

export class RSICalculator {
  private priceHistory: number[] = [];
  private currentRSI: number = 50;
  private currentState: RSIState = 'NEUTRAL';
  private previousState: RSIState = 'NEUTRAL';
  private config: RSIConfig;

  // State for Wilder's Smoothing
  private prevAvgGain: number | null = null;
  private prevAvgLoss: number | null = null;

  constructor(config: RSIConfig = DEFAULT_RSI_CONFIG) {
    this.config = config;

    // Subscribe to game reset
    EventBus.on('gameReset', () => this.reset());
  }

  /**
   * Update RSI with a new price point
   *
   * @param price Current price
   * @returns Updated RSI value (0-100)
   */
  update(price: number): number {
    // Validate price
    if (!Number.isFinite(price) || price <= 0) {
      return this.currentRSI;
    }

    // Add to history
    this.priceHistory.push(price);

    // Calculate RSI if we have enough data
    if (this.priceHistory.length > this.config.period) {
      this.currentRSI = this.calculateRSI();
      this.updateState();
    }

    // Limit history size to prevent memory bloat
    const maxHistorySize = this.config.period * 10;
    if (this.priceHistory.length > maxHistorySize) {
      this.priceHistory = this.priceHistory.slice(-maxHistorySize);
    }

    return this.currentRSI;
  }

  /**
   * Get current RSI value
   */
  getRSI(): number {
    return this.currentRSI;
  }

  /**
   * Get current RSI state with hysteresis applied
   */
  getState(): RSIState {
    return this.currentState;
  }

  /**
   * Get previous RSI state (for transition detection)
   */
  getPreviousState(): RSIState {
    return this.previousState;
  }

  /**
   * Check if RSI state just changed
   */
  didStateChange(): boolean {
    return this.currentState !== this.previousState;
  }

  /**
   * Check if the system has enough data for accurate calculations
   */
  isInitialized(): boolean {
    return this.priceHistory.length > this.config.period;
  }

  /**
   * Get the number of data points in history
   */
  getHistoryLength(): number {
    return this.priceHistory.length;
  }

  /**
   * Reset calculator state (call on game reset)
   */
  reset(): void {
    this.priceHistory = [];
    this.currentRSI = 50;
    this.currentState = 'NEUTRAL';
    this.previousState = 'NEUTRAL';
    this.prevAvgGain = null;
    this.prevAvgLoss = null;
  }

  /**
   * Calculate RSI from price history
   *
   * RSI = 100 - (100 / (1 + RS))
   * where RS = Average Gain / Average Loss over the period
   */
  private calculateRSI(): number {
    const period = this.config.period;
    const historyLength = this.priceHistory.length;

    // Need at least period + 1 data points
    if (historyLength < period + 1) {
      return 50; // Neutral
    }

    // Calculate change from last update
    // Note: calculateRSI is called after pushing new price
    const currentPrice = this.priceHistory[historyLength - 1];
    const prevPrice = this.priceHistory[historyLength - 2];

    if (currentPrice === undefined || prevPrice === undefined) {
      return 50;
    }

    const change = currentPrice - prevPrice;

    let currentGain = 0;
    let currentLoss = 0;

    if (change > 0) {
      currentGain = change;
    } else {
      currentLoss = Math.abs(change);
    }

    // Initialize with SMA if not set
    if (this.prevAvgGain === null || this.prevAvgLoss === null) {
      let sumGain = 0;
      let sumLoss = 0;

      // Calculate initial SMA from the first 'period' changes
      // We look back 'period' steps
      const startIndex = historyLength - period;

      for (let i = startIndex; i < historyLength; i++) {
        const pCurr = this.priceHistory[i];
        const pPrev = this.priceHistory[i - 1];
        if (pCurr !== undefined && pPrev !== undefined) {
          const c = pCurr - pPrev;
          if (c > 0) sumGain += c;
          else sumLoss += Math.abs(c);
        }
      }

      this.prevAvgGain = sumGain / period;
      this.prevAvgLoss = sumLoss / period;
    } else {
      // Wilder's Smoothing: (Previous Avg * (n-1) + Current) / n
      this.prevAvgGain = (this.prevAvgGain * (period - 1) + currentGain) / period;
      this.prevAvgLoss = (this.prevAvgLoss * (period - 1) + currentLoss) / period;
    }

    // Prevent extreme decay: if both averages are near-zero, reset to fresh SMA
    // This prevents RSI from getting stuck at 0 or 100 due to floating-point decay
    const MIN_AVG_THRESHOLD = 1e-12; // Much smaller threshold for higher precision
    if (this.prevAvgGain < MIN_AVG_THRESHOLD && this.prevAvgLoss < MIN_AVG_THRESHOLD) {
      // Both have decayed too much - reset to recalculate fresh SMA next update
      this.prevAvgGain = null;
      this.prevAvgLoss = null;
      return 50;
    }

    // Edge cases - use threshold instead of exact 0 check
    if (this.prevAvgGain < MIN_AVG_THRESHOLD && this.prevAvgLoss < MIN_AVG_THRESHOLD) {
      return 50;
    }
    if (this.prevAvgLoss < MIN_AVG_THRESHOLD) return 100;
    if (this.prevAvgGain < MIN_AVG_THRESHOLD) return 0;

    // Calculate RS and RSI
    const rs = this.prevAvgGain / this.prevAvgLoss;
    const rsi = 100 - 100 / (1 + rs);

    // Validate result
    if (!Number.isFinite(rsi)) {
      return 50;
    }

    // Clamp to valid range
    return Math.max(0, Math.min(100, rsi));
  }

  /**
   * Update RSI state with hysteresis
   */
  private updateState(): void {
    this.previousState = this.currentState;
    this.currentState = getRSIStateWithHysteresis(
      this.currentRSI,
      this.previousState,
      this.config
    );
  }
}

// Export singleton instance
let instance: RSICalculator | null = null;

export function getRSICalculator(config?: RSIConfig): RSICalculator {
  return (instance ??= new RSICalculator(config));
}

// For testing - allows creating fresh instances
export function createRSICalculator(config?: RSIConfig): RSICalculator {
  return new RSICalculator(config);
}
