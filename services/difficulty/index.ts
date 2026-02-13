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
 * // Using the UnifiedDirector (recommended for AI Director V2)
 * import { UnifiedDirector } from './services/difficulty';
 * const outputs = UnifiedDirector.getOutputs();
 *
 * @example
 * // Using the FlowStateManager for player state
 * import { FlowStateManager } from './services/difficulty';
 * const analysis = FlowStateManager.update(playerHP);
 *
 * @example
 * // Using the legacy context
 * import { difficultyContext } from './services/difficulty';
 * const ctx = difficultyContext.getContext();
 * const spawnRate = ctx.aggregates.core * ctx.inputs.leverageScale.spawn;
 *
 * @example
 * // Using individual factor calculators (for testing or custom logic)
 * import { calculatePnLFactor, calculateCycleFactor } from './services/difficulty';
 * const pnl = calculatePnLFactor({ pnlPercent: -0.05, leverage: 10 });
 */

// AI Director V2 - Unified Brain
export {
  UnifiedDirector,
  UNIFIED_DIRECTOR_CONFIG,
  type UnifiedInputs,
  type UnifiedOutputs,
} from './UnifiedDirector';

// AI Director V2 - Flow State Manager
export {
  FlowStateManager,
  createFlowStateManager,
  FLOW_STATE_CONFIG,
  type FlowState,
  type PlayerMetrics,
  type FlowStateAnalysis,
  type FlowStateCorrections,
} from './FlowStateManager';

// Main context (legacy)
export { difficultyContext } from './DifficultyContext';

// Types
export type {
  DifficultyInputs,
  DifficultyContextState,
  DifficultyOutputV2,
  WavePhase, // Legacy Support
  LiquidationWarning,
  LeverageScale,
} from './types';

// Constants
export {
  DIFFICULTY_CONFIG,
  LEVERAGE_TIERS,
  WAVE_PHASES, // Legacy Support
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
