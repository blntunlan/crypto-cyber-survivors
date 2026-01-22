import { MarketPosition } from '../../../types';

/**
 * RSIFactor - Rewards trend-reversal positions, punishes FOMO
 */
export function calculateRSIFactor({
  rsiState,
  position,
}: {
  rsiState: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';
  position: MarketPosition;
}): number {
  if (rsiState === 'NEUTRAL') return 1.0;

  // Favorable: Entering near reversal points
  const isFavorable =
    (position === MarketPosition.LONG && rsiState === 'OVERSOLD') ||
    (position === MarketPosition.SHORT && rsiState === 'OVERBOUGHT');

  if (isFavorable) {
    return 0.8; // 20% easier
  }

  // Unfavorable: FOMO into peaks/bottoms
  return 1.35; // 35% harder
}
