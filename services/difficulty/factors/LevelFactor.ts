/**
 * LevelFactor - Scales difficulty based on player level
 * Higher leverage increases the scaling steepness.
 */

export function calculateLevelFactor({
  level,
  leverage,
}: {
  level: number;
  leverage: number;
}): number {
  if (level <= 1) return 1.0;

  // Base: +5% per level (more conservative than initial 10%)
  const baseIncrease = 0.05;

  // Leverage modifier: 1x=1.0, 10x=1.15, 100x=1.3
  const leverageModifier = 1.0 + Math.log10(leverage || 1) * 0.15;

  // Level 1 = 1.0, Level 10 = 1.0 + 9 * 0.05 * 1.0 = 1.45
  const factor = 1.0 + (level - 1) * baseIncrease * leverageModifier;

  // Cap at 2.0x for predictability
  return Math.min(2.0, factor);
}

/**
 * Get recommended level cap for a given leverage
 * Higher leverage = lower level cap where difficulty hits 2.0
 */
export function getLevelCapForLeverage(leverage: number): number {
  const leverageModifier = 1.0 + Math.log10(leverage || 1) * 0.15;
  const baseIncrease = 0.05;
  // 2.0 = 1.0 + (Cap - 1) * baseIncrease * leverageModifier
  // 1.0 = (Cap - 1) * baseIncrease * leverageModifier
  // Cap - 1 = 1.0 / (baseIncrease * leverageModifier)
  return Math.floor(1.0 / (baseIncrease * leverageModifier) + 1);
}
