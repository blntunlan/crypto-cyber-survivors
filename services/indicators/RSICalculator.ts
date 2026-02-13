/**
 * RSI Calculator - Relative Strength Index
 *
 * Calculates RSI(14) by default for standard market signals.
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
  SYNC_CONFIG,
} from '../../types/indicators';
import { EventBus } from '../core/EventBus';

export class RSICalculator {
  private priceHistory: number[] = [];
  private currentRSI: number = 50;
  private currentState: RSIState = 'NEUTRAL';
  private previousState: RSIState = 'NEUTRAL';
  private config: RSIConfig;

  // State for Wilder's Smoothing
  private prevAvgGain: number | null = null;
  private prevAvgLoss: number | null = null;
  private lastPrice: number | null = null;

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

    // Skip unchanged prices to prevent Wilder's smoothing decay on flat ticks.
    // With 1-second WebSocket ticks, BTC price is often identical between ticks.
    // Processing unchanged prices causes both avgGain/avgLoss to decay toward zero,
    // which eventually triggers extreme RSI values (0 or 100).
    if (this.lastPrice !== null && price === this.lastPrice) {
      return this.currentRSI;
    }
    this.lastPrice = price;

    // Add to history
    this.priceHistory.push(price);

    // Limit history size to fixed sliding window (SYNC_CONFIG.MAX_HISTORY_SIZE)
    // This ensures consistency between client and server
    if (this.priceHistory.length > SYNC_CONFIG.MAX_HISTORY_SIZE) {
      this.priceHistory.shift();
    }

    // Calculate RSI if we have enough data (at least period + 1)
    if (this.priceHistory.length > this.config.period) {
      this.currentRSI = this.calculateRSI();
      this.updateState();
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
    this.lastPrice = null;
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

    const currentPrice = this.priceHistory[historyLength - 1];
    const prevPrice = this.priceHistory[historyLength - 2];

    if (currentPrice === undefined || prevPrice === undefined) {
      return 50;
    }

    const change = currentPrice - prevPrice;
    const currentGain = change > 0 ? change : 0;
    const currentLoss = change < 0 ? Math.abs(change) : 0;

    // Initialize with SMA if not set
    if (this.prevAvgGain === null || this.prevAvgLoss === null) {
      let sumGain = 0;
      let sumLoss = 0;

      // Use only the last `period` changes for SMA seeding.
      // Previously this iterated over ALL history (up to 300 elements)
      // but divided by `period` (14), causing disproportionate averages
      // when re-initialization was triggered mid-session.
      const startIdx = Math.max(1, historyLength - period);
      for (let i = startIdx; i < historyLength; i++) {
        const p1 = this.priceHistory[i];
        const p0 = this.priceHistory[i - 1];
        if (p1 !== undefined && p0 !== undefined) {
          const c = p1 - p0;
          if (c > 0) sumGain += c;
          else sumLoss += Math.abs(c);
        }
      }

      const changeCount = historyLength - startIdx;
      this.prevAvgGain = changeCount > 0 ? sumGain / changeCount : 0;
      this.prevAvgLoss = changeCount > 0 ? sumLoss / changeCount : 0;
    } else {
      // Wilder's Smoothing: (Previous Avg * (n-1) + Current) / n
      this.prevAvgGain = (this.prevAvgGain * (period - 1) + currentGain) / period;
      this.prevAvgLoss = (this.prevAvgLoss * (period - 1) + currentLoss) / period;
    }

    // Precision handling - when both averages decay to near-zero,
    // return neutral RSI without resetting smoothing state.
    // Previously this set prevAvgGain/prevAvgLoss to null, which forced
    // a full SMA re-initialization on the next tick, causing RSI to
    // spike to 0 or 100 depending on the window composition.
    const MIN_AVG_THRESHOLD = 1e-12;
    if (this.prevAvgGain < MIN_AVG_THRESHOLD && this.prevAvgLoss < MIN_AVG_THRESHOLD) {
      // Don't reset state - just return neutral
      return 50;
    }

    let rsi: number;
    if (this.prevAvgLoss < MIN_AVG_THRESHOLD) {
      // All gains, no losses - but clamp to 95 to avoid extreme display values
      rsi = 95;
    } else if (this.prevAvgGain < MIN_AVG_THRESHOLD) {
      // All losses, no gains - clamp to 5 to avoid extreme display values
      rsi = 5;
    } else {
      const rs = this.prevAvgGain / this.prevAvgLoss;
      rsi = 100 - 100 / (1 + rs);
    }

    // Clamp and fix precision for determinism
    const clampedRsi = Math.max(0, Math.min(100, rsi));
    return Number(clampedRsi.toFixed(SYNC_CONFIG.PRECISION));
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
