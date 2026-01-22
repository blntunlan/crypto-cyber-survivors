/**
 * StreakFactor - Short-term difficulty spike for skilled play
 * Every 5 kills adds 5% bonus difficulty up to +30%.
 * Streak expires after 3 seconds of no kills.
 */

export function calculateStreakFactor({
  killStreak,
  timeSinceLastKill,
}: {
  killStreak: number;
  timeSinceLastKill: number;
}): number {
  if (killStreak <= 0 || timeSinceLastKill > 3000 || timeSinceLastKill === -1) {
    return 1.0;
  }

  // Every 5 kills adds 0.05
  const bonus = Math.floor(killStreak / 5) * 0.05;

  // Cap at 30% bonus (1.3 total)
  return Math.min(1.3, 1.0 + bonus);
}

/**
 * Get tier name for current streak
 */
export function getStreakTier(killStreak: number) {
  if (killStreak < 5) return 'none';
  if (killStreak < 15) return 'hot';
  if (killStreak < 30) return 'blazing';
  if (killStreak < 50) return 'unstoppable';
  return 'godlike';
}

/**
 * Get kills needed for next bonus threshold
 */
export function getKillsToNextThreshold(killStreak: number): number {
  return 5 - (killStreak % 5);
}
