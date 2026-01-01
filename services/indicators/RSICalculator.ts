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

    // Calculate price changes for the last 'period' intervals
    const changes: number[] = [];
    const startIndex = historyLength - period;

    for (let i = startIndex; i < historyLength; i++) {
      const current = this.priceHistory[i];
      const previous = this.priceHistory[i - 1];

      if (current !== undefined && previous !== undefined) {
        changes.push(current - previous);
      }
    }

    if (changes.length === 0) {
      return 50;
    }

    // Separate gains and losses
    const gains = changes.map(c => (c > 0 ? c : 0));
    const losses = changes.map(c => (c < 0 ? Math.abs(c) : 0));

    // Calculate averages
    const avgGain = gains.reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.reduce((a, b) => a + b, 0) / period;

    // Edge case: flat prices (no change at all)
    if (avgGain === 0 && avgLoss === 0) {
      return 50; // Neutral - no movement
    }

    // Edge case: all gains (no losses)
    if (avgLoss === 0) {
      return 100;
    }

    // Edge case: all losses (no gains)
    if (avgGain === 0) {
      return 0;
    }

    // Calculate RS and RSI
    const rs = avgGain / avgLoss;
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
    this.currentState = getRSIStateWithHysteresis(this.currentRSI, this.previousState, this.config);
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
