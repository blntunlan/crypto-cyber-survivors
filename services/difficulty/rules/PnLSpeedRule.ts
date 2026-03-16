import { clamp } from '../utils';
import { type DifficultyRule, type RuleContext } from './DifficultyRule';

/**
 * PnLSpeedRule — computes PnL-driven speed multiplier and underwater penalty.
 */
export class PnLSpeedRule implements DifficultyRule {
  readonly id = 'pnlSpeed';

  apply(ctx: RuleContext): void {
    const { pnlRatio } = ctx.inputs;

    ctx.shared.pnlSpeedMult =
      pnlRatio < 0
        ? 1 + clamp(-pnlRatio, 0, 0.6) * 0.55
        : 1 - clamp(pnlRatio, 0, 0.4) * 0.15;

    ctx.shared.underwaterPenalty = pnlRatio < 0 ? Math.abs(pnlRatio) * 1.5 : 0;
  }
}
