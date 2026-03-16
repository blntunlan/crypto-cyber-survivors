import { clamp } from '../utils';
import { type DifficultyRule, type RuleContext } from './DifficultyRule';

/**
 * ATRSpeedRule — normalizes ATR percent and computes speed multiplier.
 * Writes atrNorm and atrSpeedMult to shared state.
 */
export class ATRSpeedRule implements DifficultyRule {
  readonly id = 'atrSpeed';

  apply(ctx: RuleContext): void {
    const atrNorm = clamp((ctx.inputs.atrPercent - 0.002) / (0.03 - 0.002), 0, 1);
    ctx.shared.atrNorm = atrNorm;
    ctx.shared.atrSpeedMult = 0.9 + atrNorm * (1.35 - 0.9);
  }
}
