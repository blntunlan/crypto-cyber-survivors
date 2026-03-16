import { type DifficultyRule, type RuleContext } from './DifficultyRule';

/**
 * MarketVolumeRule — computes volume boost for spawn rate scaling.
 * Writes to shared state for SpawnRule to consume.
 */
export class MarketVolumeRule implements DifficultyRule {
  readonly id = 'marketVolume';

  apply(ctx: RuleContext): void {
    ctx.shared.volumeBoost = ctx.inputs.volumeNorm * 1.5;
  }
}
