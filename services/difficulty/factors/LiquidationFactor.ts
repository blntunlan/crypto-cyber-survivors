import { type LiquidationWarning } from '../types';
import { type MarketPosition } from '../../../types';

interface LiquidationFactorOutput {
  factor: number;
  warningLevel: LiquidationWarning;
  fovReduction: number;
}

interface LiquidationInputs {
  currentPrice: number;
  entryPrice: number;
  liquidationPrice: number;
  position: MarketPosition;
}

/**
 * LiquidationFactor - Increases difficulty as player approaches liquidation
 */
export function calculateLiquidationFactor({
  currentPrice,
  entryPrice,
  liquidationPrice,
  position,
}: LiquidationInputs): LiquidationFactorOutput {
  if (entryPrice <= 0 || currentPrice <= 0) {
    return { factor: 1.0, warningLevel: 'NONE', fovReduction: 0 };
  }

  // Prevent division by zero
  const denominator =
    position === 'LONG' ? entryPrice - liquidationPrice : liquidationPrice - entryPrice;

  if (Math.abs(denominator) < 0.01) {
    return { factor: 2.0, warningLevel: 'CRITICAL', fovReduction: 0.4 };
  }

  // Calculate distance: 0.0 = liquidation, 1.0 = entry (or better)
  const distance =
    position === 'LONG'
      ? (currentPrice - liquidationPrice) / denominator
      : (liquidationPrice - currentPrice) / denominator;

  const safeDistance = Math.max(0, Math.min(1, distance));

  if (safeDistance > 0.3) {
    return { factor: 1.0, warningLevel: 'NONE', fovReduction: 0 };
  } else if (safeDistance > 0.2) {
    return { factor: 1.3, warningLevel: 'CAUTION', fovReduction: 0.1 };
  } else if (safeDistance > 0.1) {
    return { factor: 1.6, warningLevel: 'DANGER', fovReduction: 0.25 };
  } else {
    // CRITICAL: Very close to liquidation
    return { factor: 2.0, warningLevel: 'CRITICAL', fovReduction: 0.4 };
  }
}

/**
 * Get distance to liquidation as a percentage (0-100+)
 */
export function getLiquidationDistance({
  currentPrice,
  entryPrice,
  liquidationPrice,
  position,
}: LiquidationInputs): number {
  const denominator =
    position === 'LONG' ? entryPrice - liquidationPrice : liquidationPrice - entryPrice;

  if (Math.abs(denominator) < 0.01) return 0;

  const distance =
    position === 'LONG'
      ? (currentPrice - liquidationPrice) / denominator
      : (liquidationPrice - currentPrice) / denominator;

  return Math.max(0, distance * 100);
}

/**
 * Quick check if liquidation is imminent (< 10% distance)
 */
export function isLiquidationImminent(inputs: LiquidationInputs): boolean {
  const distance = getLiquidationDistance(inputs);
  return distance < 10;
}
