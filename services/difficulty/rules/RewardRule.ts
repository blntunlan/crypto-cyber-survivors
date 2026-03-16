import { clamp } from '../utils';
import { type DifficultyRule, type RuleContext } from './DifficultyRule';

/**
 * RewardRule — computes gem drop rate and XP multiplier.
 */
export class RewardRule implements DifficultyRule {
  readonly id = 'reward';

  apply(ctx: RuleContext): void {
    const { inputs, shared, outputs } = ctx;

    outputs.gemDropRate = clamp(
      1.0 + inputs.killsPerMin * 0.5 + shared.mercy * 2.0,
      1.0,
      5.0
    );

    outputs.xpMultiplier = clamp(
      1.0 + inputs.leverage * 1.0 + inputs.killsPerMin * 0.5,
      1.0,
      5.0
    );
  }
}
