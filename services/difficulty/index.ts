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
  type UnifiedInputs,
  type UnifiedOutputs,
} from './UnifiedDirector';

export { difficultyContext } from './DifficultyContext';
export { FlowStateManager } from './FlowStateManager';

export type {
  DifficultyInputs,
  DifficultyContextState,
  DifficultyOutputV2,
  WavePhase,
  LiquidationWarning,
  LeverageScale,
  MarketInputSlice,
  PlayerInputSlice,
  LeverageInputSlice,
} from './types';

export {
  MarketInputAggregator,
  PlayerMetricsAggregator,
  LeverageStateProvider,
} from './aggregators';

export {
  DIFFICULTY_CONFIG,
  LEVERAGE_TIERS,
  getNearestLeverageTier,
  getLeverageScale,
} from './constants';

export { clamp, getDefaultInputs, calculateLiquidationPrice } from './utils';
