/**
 * ShockFactor - Sudden burst difficulty on rapid price moves
 * Compares recent PnL average vs older PnL average to detect shocks.
 */

export function calculateShockFactor({
  pnlHistory,
  leverage,
}: {
  pnlHistory: number[];
  leverage: number;
}): { factor: number; triggered: boolean } {
  // Need at least 6 values to compare recent (3) vs historical (3)
  if (pnlHistory.length < 6) {
    return { factor: 1.0, triggered: false };
  }

  const recent = pnlHistory.slice(-3);
  const older = pnlHistory.slice(-6, -3);

  const recentAvg = recent.reduce((a, b) => a + b, 0) / 3;
  const olderAvg = older.reduce((a, b) => a + b, 0) / 3;

  // Detect underlying price move (normalized by leverage)
  const pnlDiff = Math.abs(recentAvg - olderAvg);
  const underlyingMove = pnlDiff / Math.max(1, leverage);

  const SHOCK_THRESHOLD = 0.005; // 0.5% underlying move within window

  if (underlyingMove > SHOCK_THRESHOLD) {
    // Intensity scales: threshold=1.2x, 5x threshold=2.0x
    const intensity = Math.min(2.0, 1.0 + (underlyingMove / SHOCK_THRESHOLD) * 0.2);
    return { factor: intensity, triggered: true };
  }

  return { factor: 1.0, triggered: false };
}

/**
 * Get direction of the shock
 */
export function getShockDirection(pnlHistory: number[]): 'up' | 'down' | 'none' {
  if (pnlHistory.length < 6) return 'none';

  const recent = pnlHistory.slice(-3);
  const older = pnlHistory.slice(-6, -3);

  const recentAvg = recent.reduce((a, b) => a + b, 0) / 3;
  const olderAvg = older.reduce((a, b) => a + b, 0) / 3;

  return recentAvg > olderAvg ? 'up' : 'down';
}

/**
 * Get intensity percentage (0.0 to 1.0) for UI effects
 */
export function getShockIntensity({
  pnlHistory,
  leverage,
}: {
  pnlHistory: number[];
  leverage: number;
}): number {
  const result = calculateShockFactor({ pnlHistory, leverage });
  if (!result.triggered) return 0;

  // Map 1.0-2.0 factor to 0.0-1.0 intensity
  return Math.max(0, Math.min(1, (result.factor - 1.0) / 1.0));
}
