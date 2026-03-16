export {
  type DifficultyRule,
  type RuleContext,
  type RuleSharedState,
  getDefaultSharedState,
} from './DifficultyRule';
export { MercyRule } from './MercyRule';
export { MarketVolumeRule } from './MarketVolumeRule';
export { ATRSpeedRule } from './ATRSpeedRule';
export { PnLSpeedRule } from './PnLSpeedRule';
export { TimePressureRule } from './TimePressureRule';
export { LeverageRule } from './LeverageRule';
export { SpawnRule } from './SpawnRule';
export { EnemyStatsRule } from './EnemyStatsRule';
export { WhaleRule } from './WhaleRule';
export { RewardRule } from './RewardRule';
export { ChaosRule } from './ChaosRule';
export { TrendAlignmentRule } from './TrendAlignmentRule';

import { type DifficultyRule } from './DifficultyRule';
import { MercyRule } from './MercyRule';
import { MarketVolumeRule } from './MarketVolumeRule';
import { ATRSpeedRule } from './ATRSpeedRule';
import { PnLSpeedRule } from './PnLSpeedRule';
import { TimePressureRule } from './TimePressureRule';
import { LeverageRule } from './LeverageRule';
import { SpawnRule } from './SpawnRule';
import { EnemyStatsRule } from './EnemyStatsRule';
import { WhaleRule } from './WhaleRule';
import { RewardRule } from './RewardRule';
import { ChaosRule } from './ChaosRule';
import { TrendAlignmentRule } from './TrendAlignmentRule';

/**
 * Default execution order for difficulty rules.
 * Mercy runs first so other rules can reference `shared.mercy`.
 * Shared-state producers (ATR, PnL, Time, Leverage, Volume) run before consumers (Spawn, EnemyStats).
 */
export const DEFAULT_RULE_ORDER: readonly DifficultyRule[] = Object.freeze([
  new MercyRule(),
  new MarketVolumeRule(),
  new ATRSpeedRule(),
  new PnLSpeedRule(),
  new TimePressureRule(),
  new LeverageRule(),
  new SpawnRule(),
  new EnemyStatsRule(),
  new WhaleRule(),
  new RewardRule(),
  new ChaosRule(),
  new TrendAlignmentRule(),
]);
