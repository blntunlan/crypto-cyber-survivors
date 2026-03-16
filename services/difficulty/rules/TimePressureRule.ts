import { type DifficultyRule, type RuleContext } from './DifficultyRule';

/**
 * TimePressureRule — computes time-based difficulty scaling.
 */
export class TimePressureRule implements DifficultyRule {
  readonly id = 'timePressure';

  apply(ctx: RuleContext): void {
    ctx.shared.timePressure = ctx.inputs.elapsedMinutes * 0.3;
  }
}
