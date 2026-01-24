import { clamp } from '../utils';

export interface PerformanceInputs {
  accuracy: number;
  damageTakenFrequency: number;
  atrPercent: number;
  leverage: number;
}

/**
 * PerformanceFactor - Calculates the Adaptive Difficulty Score (ADS)
 *
 * ADS = (Player Performance * 0.4) + (Market Volatility * 0.3) + (Leverage * 0.3)
 */
export function calculatePerformanceFactor({
  accuracy,
  damageTakenFrequency,
  atrPercent,
  leverage,
}: PerformanceInputs): number {
  // 1. Calculate Player Performance Score (0.0 to 1.0)
  // Accuracy is good, high damage frequency is bad
  const hpmThreshold = 15; // 15 hits per minute is considered "struggling"
  const damageScore = clamp(1 - damageTakenFrequency / hpmThreshold, 0, 1);
  const playerPerformance = accuracy * 0.6 + damageScore * 0.4;

  // 2. Normalize Volatility (ATR)
  // ATR usually ranges from 0.001 to 0.02 (0.1% to 2%)
  const normalizedATR = clamp(atrPercent * 20, 0, 1); // 5% ATR = 1.0

  // 3. Normalize Leverage
  const normalizedLeverage = clamp(leverage / 100, 0, 1);

  // 4. Calculate Final ADS (0.0 to 1.0)
  const ads = playerPerformance * 0.4 + normalizedATR * 0.3 + normalizedLeverage * 0.3;

  // 5. Convert to Difficulty Multiplier (0.7 to 2.5)
  // If ADS is 0.5 (average), multiplier is 1.0
  // If ADS is 1.0 (perfect player, high volatility, 100x), multiplier is ~2.2
  const multiplier = 0.7 + ads * 1.5;

  return multiplier;
}
