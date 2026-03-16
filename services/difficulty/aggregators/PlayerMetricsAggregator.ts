import { type PlayerInputSlice } from '../types';

/**
 * PlayerMetricsAggregator — owns player-state inputs.
 *
 * Unlike market data, player metrics are updated via direct method calls
 * from the hot path (not events) for zero-overhead updates.
 *
 * Hot-path safe: pre-allocated slice, mutated in-place.
 */
class PlayerMetricsAggregatorClass {
  private static instance: PlayerMetricsAggregatorClass | null = null;

  /** Pre-allocated slice — mutated in-place */
  public readonly slice: PlayerInputSlice =
    PlayerMetricsAggregatorClass.getDefaultSlice();

  private constructor() {}

  static getInstance(): PlayerMetricsAggregatorClass {
    return (PlayerMetricsAggregatorClass.instance ??=
      new PlayerMetricsAggregatorClass());
  }

  /** Update combat state (called from game loop) */
  updateCombatState(killStreak: number, timeSinceLastKill: number): void {
    this.slice.killStreak = killStreak;
    this.slice.timeSinceLastKill = timeSinceLastKill;
  }

  /** Update HP (called from game loop) */
  updateHP(hpPercent: number): void {
    this.slice.hpPercent = hpPercent;
  }

  /** Update level */
  updateLevel(level: number): void {
    this.slice.level = level;
  }

  /** Batch update for partial slice data */
  updatePartial(updates: Partial<PlayerInputSlice>): void {
    Object.assign(this.slice, updates);
  }

  reset(): void {
    const defaults = PlayerMetricsAggregatorClass.getDefaultSlice();
    Object.assign(this.slice, defaults);
    // Reset nested stress object in-place
    this.slice.stress.score = 0;
    this.slice.stress.damageRate = 0;
    this.slice.stress.dashUsage = 0;
    this.slice.stress.nearDeathDuration = 0;
  }

  private static getDefaultSlice(): PlayerInputSlice {
    return {
      level: 1,
      hpPercent: 1.0,
      killStreak: 0,
      timeSinceLastKill: -1,
      accuracy: 1.0,
      damageTakenFrequency: 0,
      performanceScore: 1.0,
      dps: 0,
      enemyHealthPool: 0,
      screenDensity: 0,
      upgradeEfficiency: 0.5,
      movementEntropy: 0.5,
      stress: {
        score: 0,
        damageRate: 0,
        dashUsage: 0,
        nearDeathDuration: 0,
      },
    };
  }

  static resetForTesting(): void {
    if (this.instance) {
      this.instance.reset();
      this.instance = null;
    }
  }
}

export const PlayerMetricsAggregator = PlayerMetricsAggregatorClass.getInstance();
