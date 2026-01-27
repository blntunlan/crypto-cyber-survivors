import { marketIndicatorService } from '../../indicators/MarketIndicatorService';

// Config for normalization
const MACD_CONFIG = {
  // Approximate range for typical crypto movements in the game's timeframe (5m)
  // This is used to scale the raw MACD before tanh squash
  EXPECTED_RANGE: 100.0,
  SENSITIVITY: 0.5,
};

/**
 * Normalizes MACD Histogram for AI consumption.
 * @returns number between -1.0 (Strong Bearish Momentum) and 1.0 (Strong Bullish Momentum)
 */
export function calculateMACDFactor(): number {
  const state = marketIndicatorService.getState();
  const histogram = state.macd.histogram;

  // Tanh Squash: Maps (-Inf, +Inf) -> (-1, 1)
  // Formula: tanh( x / (Range * Sensitivity) )
  const normalized = Math.tanh(
    histogram / (MACD_CONFIG.EXPECTED_RANGE * MACD_CONFIG.SENSITIVITY)
  );

  return normalized;
}

/**
 * Calculates raw MACD from price history (EMA 12, 26, 9)
 * Note: Now delegated to MarketIndicatorService for centralized calculation.
 */
export function computeMACD(_prices: number[]): {
  histogram: number;
  value: number;
  signal: number;
} {
  const state = marketIndicatorService.getState();
  return {
    histogram: state.macd.histogram,
    value: state.macd.macd,
    signal: state.macd.signal,
  };
}
