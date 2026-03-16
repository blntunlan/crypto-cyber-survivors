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
   * @param rawCoins Raw coins accumulated
   * @param enemyDropCoins Coins from enemy drops
   * @param maxStreak Max kill streak achieved
   */
  calculate(
    exitType: 'portal' | 'death' | 'afk_death',
    portalType: PortalType | null,
    currentPnL: number,
    rawCoins: number,
    enemyDropCoins: number,
    maxStreak: number
  ): CoinRewardResult {
    const survivalTime = TimeService.getGameTimeSeconds();
    const approximateKills = Math.floor((rawCoins + enemyDropCoins) / 5);

    const calculator = new RewardCalculator();
    const result = calculator.calculate({
      survivalTimeSeconds: survivalTime,
      kills: approximateKills,
      level: 1,
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
