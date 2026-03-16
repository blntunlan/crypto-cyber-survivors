import { clamp } from '../utils';
import { type DifficultyRule, type RuleContext } from './DifficultyRule';

/**
 * EnemyStatsRule — computes enemy speed, HP, and damage.
 */
export class EnemyStatsRule implements DifficultyRule {
  readonly id = 'enemyStats';

  apply(ctx: RuleContext): void {
    const { inputs, shared, outputs } = ctx;
    const {
      atrSpeedMult,
      pnlSpeedMult,
      leverageBoost,
      mercy,
      timePressure,
      underwaterPenalty,
    } = shared;

    // Speed: multiplicative leverage, not additive
    outputs.enemySpeed = clamp(
      atrSpeedMult * pnlSpeedMult * (1.0 + leverageBoost * 0.3) - mercy * 0.4,
      0.5,
      2.5
    );

    // HP scales with player power
    outputs.enemyHP = clamp(
      1.0 + inputs.playerLevel * 1.2 + inputs.playerDPS * 0.3,
      0.5,
      4.0
    );

    // Damage: moderate leverage impact, capped to prevent one-shots
    outputs.enemyDamage = clamp(
      1.0 + timePressure + leverageBoost * 1.5 + underwaterPenalty - mercy * 0.3,
      0.5,
      4.0
    );
  }
}
