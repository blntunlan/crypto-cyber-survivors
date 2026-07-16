/**
 * Difficulty runtime public exports.
 *
 * Modular, layered difficulty system with pure function calculators.
 *
 * NOTE: Wave phases have been REMOVED in AI Director V2.
 * Difficulty is now driven by market conditions and player flow state.
 *
 * @see docs/AI_DIRECTOR_V2_DESIGN.md
 *
 * @example
 * import { createDifficultyRuntime } from './services/difficulty';
 * const runtime = createDifficultyRuntime('modular');
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

export {
  createDifficultyRuntime,
  DifficultyRuntime,
  type DifficultyBoundaryInput,
  type DifficultyPhaseDecision,
  type DifficultyRuntimeOptions,
} from './runtime/DifficultyRuntime';
export { DifficultyV2CompatibilityAdapter } from './runtime/DifficultyV2CompatibilityAdapter';
export {
  ShadowComparisonRecorder,
  type CurrentDirectorSnapshot,
  type ShadowComparisonRecord,
} from './runtime/ShadowComparisonRecorder';

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
