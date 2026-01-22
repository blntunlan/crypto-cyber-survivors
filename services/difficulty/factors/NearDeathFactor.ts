/**
 * NearDeathFactor - "Mercy" mechanic
 * Reduces difficulty when player is low on health.
 */

export function calculateNearDeathFactor({ hpPercent }: { hpPercent: number }): number {
  // Only apply below 30% HP
  if (hpPercent >= 0.3) return 1.0;

  // Minimum multiplier is 0.5, hit at 5% HP or lower
  if (hpPercent <= 0.05) return 0.5;

  // Linear scale between 30% (1.0 factor) and 5% (0.5 factor)
  // Distance = 0.25
  const range = 0.3 - 0.05;
  const pos = hpPercent - 0.05;
  const factor = 0.5 + (pos / range) * 0.5;

  return Math.max(0.5, Math.min(1.0, factor));
}

/**
 * Get descriptive danger level based on HP
 */
export function getHealthDangerLevel(hpPercent: number) {
  if (hpPercent > 0.3) return 'safe';
  if (hpPercent > 0.2) return 'warning';
  if (hpPercent > 0.1) return 'danger';
  return 'critical';
}

/**
 * Quick check if mercy should be active
 */
export function shouldApplyMercy(hpPercent: number): boolean {
  return hpPercent < 0.3;
}
