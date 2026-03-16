import { clamp } from '../utils';
import { type DifficultyRule, type RuleContext } from './DifficultyRule';

/**
 * ChaosRule — computes chaos level, enemy variety, and pressure intensity.
 */
export class ChaosRule implements DifficultyRule {
  readonly id = 'chaos';

  apply(ctx: RuleContext): void {
    const { inputs, shared, outputs } = ctx;

    outputs.chaosLevel = clamp(shared.atrNorm + Math.abs(inputs.priceChange), 0, 1);
    outputs.enemyVariety = clamp(1.0 + shared.timePressure, 1.0, 2.0);
    outputs.pressureIntensity = clamp(shared.timePressure + shared.volumeBoost, 0, 1);
  }
}
