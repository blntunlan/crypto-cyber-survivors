import { type WavePhase, type LeverageScale } from './types';
import {
  WAVE_CONFIG,
  DIFFICULTY_CONFIG as GLOBAL_DIFFICULTY_CONFIG,
  LEVERAGE_TIERS as TIERS,
} from '../../config';

export const DIFFICULTY_CONFIG = {
  /** Cycle duration (seconds) */
  cycleDuration: WAVE_CONFIG.TOTAL_DURATION,

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
 * Wave phase definitions
 * Mapping for V2 system
 */
export const WAVE_PHASES: Array<{
  name: WavePhase;
  duration: number;
  multiplier: number;
}> = WAVE_CONFIG.PHASES;

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
