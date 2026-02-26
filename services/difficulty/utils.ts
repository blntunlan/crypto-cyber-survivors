import { type DifficultyInputs } from './types';
import { DIFFICULTY_CONFIG } from './constants';
import { MarketPosition } from '../../types';

/**
 * Clamp numeric value within a range
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Calculate liquidation price based on entry, leverage and position
 */
export function calculateLiquidationPrice(
  entryPrice: number,
  leverage: number,
  position: 'LONG' | 'SHORT'
): number {
  if (entryPrice <= 0) return 0;

  // Standard liquidation formula: Price change of 1/leverage wipes 100% of margin
  // We use 0.9 to give a 10% safety buffer before absolute zero equity
  const marginWipeChange = 1 / Math.max(1, leverage);
  const liquidationThreshold = marginWipeChange * 0.9;

  if (position === 'LONG') {
    return entryPrice * (1 - liquidationThreshold);
  } else {
    return entryPrice * (1 + liquidationThreshold);
  }
}

/**
 * Get default inputs for game start
 */
export function getDefaultInputs(): DifficultyInputs {
  return {
    // Time
    elapsedSeconds: 0,
    cycleDuration: DIFFICULTY_CONFIG.cycleDuration,

    // Market
    pnlPercent: 0,
    currentPrice: 0,
    entryPrice: 0,
    liquidationPrice: 0,

    // Market Indicators
    rsi: 50,
    rsiState: 'NEUTRAL',
    normalizedVolume: 0,
    whaleTier: 0,
    atrPercent: 0,

    // Player
    level: 1,
    leverage: 5,
    hpPercent: 1.0,
    position: MarketPosition.LONG,

    // Combat
    killStreak: 0,
    timeSinceLastKill: -1,

    // Performance (ADS)
    accuracy: 1.0,
    damageTakenFrequency: 0,
    performanceScore: 1.0,
    dps: 0,
    enemyHealthPool: 0,
    screenDensity: 0,
    upgradeEfficiency: 0.5,
    movementEntropy: 0.5,

    // History
    pnlHistory: [],

    // Sensors V2
    macd: {
      histogram: 0,
      signal: 0,
      macd: 0,
      value: 0,
    },
    stress: {
      score: 0,
      damageRate: 0,
      dashUsage: 0,
      nearDeathDuration: 0,
    },
  };
}
