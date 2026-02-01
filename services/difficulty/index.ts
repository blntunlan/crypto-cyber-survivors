/**
 * Difficulty System V2 - Main Export
 *
 * Modular, layered difficulty system with pure function calculators.
 *
 * NOTE: Wave phases have been REMOVED in AI Director V2.
 * Difficulty is now driven by market conditions and player flow state.
 *
 * @see docs/AI_DIRECTOR_V2_DESIGN.md
 *
 * @example
 * // Using the context (recommended)
 * import { difficultyContext } from './services/difficulty';
 * const ctx = difficultyContext.getContext();
 * const spawnRate = ctx.aggregates.core * ctx.inputs.leverageScale.spawn;
 *
 * @example
 * // Using individual factor calculators (for testing or custom logic)
 * import { calculatePnLFactor, calculateCycleFactor } from './services/difficulty';
 * const pnl = calculatePnLFactor({ pnlPercent: -0.05, leverage: 10 });
 */

// Main context
export { difficultyContext } from './DifficultyContext';

// Types
export type {
  DifficultyInputs,
  DifficultyContextState,
  DifficultyOutputV2,
  WavePhase, // @deprecated - kept for legacy compatibility
  LiquidationWarning,
  LeverageScale,
} from './types';

// Constants
export {
  DIFFICULTY_CONFIG,
  LEVERAGE_TIERS,
  WAVE_PHASES, // @deprecated - kept for legacy compatibility
  getNearestLeverageTier,
  getLeverageScale,
} from './constants';

// Utilities
export { clamp, getDefaultInputs, calculateLiquidationPrice } from './utils';

// Factor calculators (pure functions)
export {
  // Cycle
  calculateCycleFactor,
  getCurrentCycle,
  getCycleProgress,
  getTimeRemainingInCycle,
  // PnL
  calculatePnLFactor,
  getPnLStatus,
  // Level
  calculateLevelFactor,
  getLevelCapForLeverage,
  // Wave - DEPRECATED (kept for legacy compatibility)
  // calculateWaveFactor,
  // getPhaseConfig,
  // isInBossWave,
  // isInResolutionPhase,
  // getPhaseTimeline,
  // Liquidation
  calculateLiquidationFactor,
  getLiquidationDistance,
  isLiquidationImminent,
  // Streak
  calculateStreakFactor,
  getStreakTier,
  getKillsToNextThreshold,
  // Shock
  calculateShockFactor,
  getShockDirection,
  getShockIntensity,
  // Near Death
  calculateNearDeathFactor,
  getHealthDangerLevel,
  shouldApplyMercy,
  // RSI
  calculateRSIFactor,
  // Volume
  calculateVolumeFactor,
  // ATR
  calculateATRFactor,
} from './factors';
