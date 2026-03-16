import { type UnifiedInputs, type UnifiedOutputs } from '../UnifiedDirector';

/**
 * Context passed to each rule in the pipeline.
 * Pre-allocated by UnifiedDirector — rules mutate `outputs` in-place.
 */
export interface RuleContext {
  inputs: UnifiedInputs;
  outputs: UnifiedOutputs;
  /** Intermediate values shared between rules (e.g. atrNorm, timePressure) */
  shared: RuleSharedState;
}

/** Intermediate values computed by early rules, consumed by later ones */
export interface RuleSharedState {
  mercy: number;
  atrNorm: number;
  timePressure: number;
  leverageBoost: number;
  volumeBoost: number;
  pnlSpeedMult: number;
  atrSpeedMult: number;
  underwaterPenalty: number;
}

/** Interface that all difficulty rules implement */
export interface DifficultyRule {
  /** Unique identifier for this rule */
  readonly id: string;
  /** Apply this rule, mutating context.outputs and/or context.shared in-place */
  apply(ctx: RuleContext): void;
}

/** Create a fresh default shared state (pre-allocated) */
export function getDefaultSharedState(): RuleSharedState {
  return {
    mercy: 0,
    atrNorm: 0,
    timePressure: 0,
    leverageBoost: 0,
    volumeBoost: 0,
    pnlSpeedMult: 1,
    atrSpeedMult: 1,
    underwaterPenalty: 0,
  };
}
