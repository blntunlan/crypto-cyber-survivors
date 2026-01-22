/**
 * CycleFactor - Exponential growth per N-minute cycle
 * Cycle 1: 1.0, Cycle 2: 1.5, Cycle 3: 2.25
 * After Cycle 3, growth becomes linear to prevent explosion.
 */

export function calculateCycleFactor({
  elapsedSeconds,
  cycleDuration,
}: {
  elapsedSeconds: number;
  cycleDuration: number;
}): number {
  if (!cycleDuration || cycleDuration <= 0) return 1.0;

  const currentCycle = Math.floor(elapsedSeconds / cycleDuration) + 1;

  if (currentCycle <= 3) {
    // 1.5^(n-1) => 1.0, 1.5, 2.25
    return Math.pow(1.5, currentCycle - 1);
  }

  // Linear growth rate after cycle 3
  // At cycle 3 we are at 2.25. Each cycle adds 0.475
  const LINEAR_GROWTH_RATE = 0.475;
  return 2.25 + (currentCycle - 3) * LINEAR_GROWTH_RATE;
}

/**
 * Get current cycle number (1-indexed)
 */
export function getCurrentCycle(elapsedSeconds: number, cycleDuration = 300): number {
  return Math.floor(elapsedSeconds / cycleDuration) + 1;
}

/**
 * Get progress within current cycle (0.0 to 1.0)
 */
export function getCycleProgress(elapsedSeconds: number, cycleDuration = 300): number {
  return (elapsedSeconds % cycleDuration) / cycleDuration;
}

/**
 * Get seconds remaining in current cycle
 */
export function getTimeRemainingInCycle(
  elapsedSeconds: number,
  cycleDuration = 300
): number {
  return cycleDuration - (elapsedSeconds % cycleDuration);
}
