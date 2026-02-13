import { type LeverageScale } from './types';
import {
  DIFFICULTY_CONFIG as GLOBAL_DIFFICULTY_CONFIG,
  LEVERAGE_TIERS as TIERS,
} from '../../config';

export const DIFFICULTY_CONFIG = {
  /**
   * Default cycle duration (seconds) - Used for time-based calculations
   * Note: Wave phases have been removed in AI Director V2
   */
  cycleDuration: 300, // 5 minutes default

  /** PnL history buffer size */
  pnlHistorySize: GLOBAL_DIFFICULTY_CONFIG.PNL_HISTORY_SIZE,

  /** Kill streak timeout (ms) */
  streakTimeoutMs: GLOBAL_DIFFICULTY_CONFIG.STREAK_TIMEOUT_MS,

  /** Shock detection threshold (underlying price %) */
  shockThreshold: GLOBAL_DIFFICULTY_CONFIG.SHOCK_THRESHOLD,

  /** Clamp limits */
  limits: GLOBAL_DIFFICULTY_CONFIG.LIMITS,
};

export const LEVERAGE_TIERS: Record<number, LeverageScale> = TIERS;

/**
 * Legacy V1 Support: Wave phases removed
 * Difficulty is now driven by market conditions and player flow state.
 * Keeping this for legacy compatibility - will be removed in future version.
 */
export const WAVE_PHASES: Array<{
  name: string;
  duration: number;
  multiplier: number;
}> = [
  { name: 'active', duration: 300, multiplier: 1.0 }, // Single "active" phase
];

/**
 * Get nearest leverage tier
 */
export function getNearestLeverageTier(leverage: number): number {
  const tiers = [1, 2, 5, 10, 25, 50, 100];
  return tiers.reduce((prev, curr) =>
    Math.abs(curr - leverage) < Math.abs(prev - leverage) ? curr : prev
  );
}

/**
 * Get leverage scale config
 */
export function getLeverageScale(leverage: number): LeverageScale {
  const tier = getNearestLeverageTier(leverage);
  return LEVERAGE_TIERS[tier] ?? LEVERAGE_TIERS[5]!;
}
