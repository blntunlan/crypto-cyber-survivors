import { clamp } from '../utils';
import { type DifficultyRule, type RuleContext } from './DifficultyRule';

/**
 * WhaleRule — computes whale spawn probability from volume and trend.
 */
export class WhaleRule implements DifficultyRule {
  readonly id = 'whale';

  apply(ctx: RuleContext): void {
    ctx.outputs.whaleProbability = clamp(
      ctx.inputs.volumeNorm * 0.05 + ctx.inputs.trendStrength * 0.02,
      0,
      0.1
    );
  }
}
