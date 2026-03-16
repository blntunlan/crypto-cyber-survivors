import { clamp } from '../utils';
import { type DifficultyRule, type RuleContext } from './DifficultyRule';

/**
 * TrendAlignmentRule — computes MACD trend alignment and lootbox drop chance.
 */
export class TrendAlignmentRule implements DifficultyRule {
  readonly id = 'trendAlignment';

  apply(ctx: RuleContext): void {
    const { macdHistogram, side } = ctx.inputs;
    const { outputs } = ctx;

    outputs.trendAlignment = this.computeTrendAlignment(macdHistogram, side);

    const baseLootboxChance = 0.03;
    outputs.lootboxDropChance =
      outputs.trendAlignment === 'with_player'
        ? clamp(baseLootboxChance * 1.5, 0, 0.1)
        : outputs.trendAlignment === 'against_player'
          ? clamp(baseLootboxChance * 0.8, 0, 0.1)
          : baseLootboxChance;
  }

  private computeTrendAlignment(
    macdHistogram: number,
    side: 'long' | 'short'
  ): 'with_player' | 'against_player' | 'neutral' {
    if (macdHistogram === 0 || !Number.isFinite(macdHistogram)) {
      return 'neutral';
    }
    if (side === 'long') {
      return macdHistogram > 0 ? 'with_player' : 'against_player';
    }
    return macdHistogram < 0 ? 'with_player' : 'against_player';
  }
}
