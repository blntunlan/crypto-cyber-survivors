import { clamp } from '../utils';
import { type DifficultyRule, type RuleContext } from './DifficultyRule';

/**
 * SpawnRule — computes spawn rate from time, volume, leverage, and mercy.
 */
export class SpawnRule implements DifficultyRule {
  readonly id = 'spawn';

  apply(ctx: RuleContext): void {
    const { timePressure, volumeBoost, leverageBoost, mercy } = ctx.shared;
    ctx.outputs.spawnRate = clamp(
      1.0 + timePressure + volumeBoost + leverageBoost - mercy,
      0.5,
      5.0
    );
  }
}
