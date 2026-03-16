import { type DifficultyRule, type RuleContext } from './DifficultyRule';

/**
 * LeverageRule — computes leverage boost for shared state.
 */
export class LeverageRule implements DifficultyRule {
  readonly id = 'leverage';

  apply(ctx: RuleContext): void {
    ctx.shared.leverageBoost = ctx.inputs.leverage * 0.5;
  }
}
