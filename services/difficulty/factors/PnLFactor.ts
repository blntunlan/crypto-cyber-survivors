/**
 * PnLFactor - Difficulty based on session profit/loss
 * Loss: Increase difficulty (log-scaled cap at 3.0)
 * Profit: Decrease difficulty (min floor at 0.7)
 */

export interface PnLInputs {
  pnlPercent: number;
  leverage: number;
}

export function calculatePnLFactor({ pnlPercent, leverage }: PnLInputs): number {
  const leveragedPnL = pnlPercent * leverage;

  if (leveragedPnL < 0) {
    // LOSS: Difficulty increases
    const lossMagnitude = Math.abs(leveragedPnL);
    // 1.0 + log(1 + magnitude * 10) * 0.4
    // Provides rapid initial increase that levels off
    return Math.min(3.0, 1.0 + Math.log1p(lossMagnitude * 10) * 0.4);
  } else {
    // PROFIT: Difficulty decreases
    const profitMagnitude = leveragedPnL;
    // 1.0 - log(1 + magnitude * 5) * 0.15
    // Provides gradual decrease
    return Math.max(0.7, 1.0 - Math.log1p(profitMagnitude * 5) * 0.15);
  }
}

/**
 * Get descriptive status of PnL for UI/feedback
 */
export function getPnLStatus(pnlPercent: number, leverage: number) {
  const leveragedPnL = pnlPercent * leverage;

  if (leveragedPnL > 0.01) {
    return { status: 'profit' as const, leveragedPnL };
  } else if (leveragedPnL < -0.01) {
    return { status: 'loss' as const, leveragedPnL };
  } else {
    return { status: 'neutral' as const, leveragedPnL };
  }
}
