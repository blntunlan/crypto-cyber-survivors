import { clamp } from '../utils';
import { type DifficultyRule, type RuleContext } from './DifficultyRule';

/**
 * MercyRule — reduces difficulty when player HP is low.
 * Must run first so other rules can reference `shared.mercy`.
 */
export class MercyRule implements DifficultyRule {
  readonly id = 'mercy';

  apply(ctx: RuleContext): void {
    const { inputs } = ctx;
    let mercy = 0;

    if (inputs.hpPercent < 0.35) {
      const leverageMercyBoost = 1.0 + inputs.leverage * 0.3;
      mercy =
        clamp(1.0 - inputs.hpPercent * 2.86, 0, 1) *
        0.85 *
        Math.min(leverageMercyBoost, 1.5);
    }

    ctx.shared.mercy = mercy;
    ctx.outputs.mercyFactor = mercy;
  }
}
