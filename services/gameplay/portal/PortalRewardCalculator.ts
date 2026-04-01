import { TimeService } from '../../core/TimeService';
import { type PortalType, type CoinRewardResult } from '../PortalSystemV2';
import { RewardCalculator } from '../RewardCalculator';

/**
 * PortalRewardCalculator — pure function for coin reward calculation.
 *
 * Extracted from PortalSystemV2.calculateReward().
 */
export class PortalRewardCalculator {
  /**
   * Calculate final coin reward.
   *
   * @param exitType How the player exited (portal, death, afk_death)
   * @param portalType Type of portal used (or null for death)
   * @param currentPnL Current PnL ratio
   * @param rawCoins Raw coins accumulated (unused, kept for caller compat)
   * @param enemyDropCoins Coins from enemy drops (unused, kept for caller compat)
   * @param maxStreak Max kill streak achieved
   * @param kills Exact kill count
   * @param level Current player level
   */
  calculate(
    exitType: 'portal' | 'death' | 'afk_death',
    portalType: PortalType | null,
    currentPnL: number,
    _rawCoins: number,
    _enemyDropCoins: number,
    maxStreak: number,
    kills: number = 0,
    level: number = 1
  ): CoinRewardResult {
    const survivalTime = TimeService.getGameTimeSeconds();

    const calculator = new RewardCalculator();
    const result = calculator.calculate({
      survivalTimeSeconds: survivalTime,
      kills,
      level,
      pnl: currentPnL,
      maxStreak,
      exitType,
      portalType,
    });

    return {
      total: result.total,
      breakdown: {
        raw: result.killBonus,
        enemyDrops: 0,
        survivalBonus: result.base,
        portalBonus: result.portalBonus,
        comboBonus: result.streakBonus,
      },
      exitType,
      portalType,
    };
  }
}
