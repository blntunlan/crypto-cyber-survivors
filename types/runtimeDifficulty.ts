/**
 * Runtime Difficulty Snapshot - Single Source of Truth
 *
 * All gameplay systems read multipliers from this snapshot.
 * Produced by UnifiedDirector each frame.
 */

export type PositionSide = 'long' | 'short';
export type TrendAlignment = 'with_player' | 'against_player' | 'neutral';

export interface RuntimeDifficultySnapshot {
  ts: number;
  leverage: number;
  pnlPercent: number;
  fragilityMult: number;
  enemySpeedMult: number;
  enemyDamageMult: number;
  spawnRateMult: number;
  gemXpMult: number;
  lootboxDropChance: number;
  trendAlignment: TrendAlignment;
  marketTimedOut: boolean;
}
