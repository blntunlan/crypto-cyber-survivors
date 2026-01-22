/**
 * ATRFactor - Correlates volatility to enemy aggression and speed
 */
export function calculateATRFactor({ atrPercent }: { atrPercent: number }): number {
  // Intensity score relative to 0.5% ATR base
  const intensity = Math.max(0, (atrPercent || 0) / 0.5);

  // Log-scaled growth to prevent excessive spikes
  return 1.0 + Math.log1p(intensity) * 0.45; // Max ~1.5x at extreme volatility
}
