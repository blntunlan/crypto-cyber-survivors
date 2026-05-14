/**
 * Shared Reward Calculation Logic
 * Used by BOTH the client-side UI (CoinService) and server-side validation (verify-game)
 * Ensures consistency and prevents cheating.
 */

export interface CoinRates {
  perSecond: number;
  perKill: number;
  perLevel: number;
  pnlMultiplier: number;
  streakMilestoneBonus: number;
  maxStreakBonus: number;
}

export const DEFAULT_REWARD_RATES: CoinRates = {
  perSecond: 2,
  perKill: 5,
  perLevel: 50,
  pnlMultiplier: 100, // 1% pnl = 1 coin
  streakMilestoneBonus: 25,
  maxStreakBonus: 250,
};

export type ExitType = 'portal' | 'death' | 'afk_death' | 'cycle_complete';
export type PortalType = 'TAKE_PROFIT' | 'STOP_LOSS' | 'FLOW_EXIT' | 'FORCED';

export interface RewardCalculationParams {
  survivalTimeSeconds: number;
  kills: number;
  level: number;
  pnl: number; // Decimal, e.g., 0.05 = 5%
  maxStreak: number;
  exitType?: ExitType;
  portalType?: PortalType | null;
}

export interface RewardCalculationResult {
  base: number;
  killBonus: number;
  levelBonus: number;
  marketBonus: number;
  streakBonus: number;
  portalBonus: number;
  total: number;
  breakdown: Record<string, number>;
}

export class RewardCalculator {
  constructor(private rates: CoinRates = DEFAULT_REWARD_RATES) {}

  /**
   * Calculate coins earned for a run
   */
  public calculate(params: RewardCalculationParams): RewardCalculationResult {
    // Make sure we have valid numbers
    const survivalTimeSeconds = Math.max(0, params.survivalTimeSeconds || 0);
    const kills = Math.max(0, params.kills || 0);
    const level = Math.max(0, params.level || 0);
    let pnl = params.pnl;
    if (!pnl) {
      pnl = 0;
    }

    let maxStreakInput = params.maxStreak;
    if (!maxStreakInput) {
      maxStreakInput = 0;
    }
    const maxStreak = Math.max(0, maxStreakInput);

    const exitType = params.exitType ?? 'cycle_complete';
    const portalType = params.portalType ?? null;

    // Base: survival time
    let base = Math.floor(survivalTimeSeconds * this.rates.perSecond);

    // Kill bonus
    let killBonus = kills * this.rates.perKill;

    // Level bonus
    let levelBonus = level * this.rates.perLevel;

    // Market bonus (only for positive PnL)
    let marketBonus = pnl > 0 ? Math.floor(pnl * 100 * this.rates.pnlMultiplier) : 0;

    // Streak bonus (per 10-kill milestone)
    const streakMilestones = Math.floor(maxStreak / 10);
    let streakBonus = Math.min(
      streakMilestones * this.rates.streakMilestoneBonus,
      this.rates.maxStreakBonus
    );

    let portalBonusAmount = 0;

    // Apply exit type modifiers
    if (exitType === 'portal' && portalType) {
      switch (portalType) {
        case 'TAKE_PROFIT':
          // +20% bonus to everything
          portalBonusAmount = Math.floor((base + killBonus + marketBonus) * 0.2);
          break;
        case 'STOP_LOSS':
          // No survival bonus or market bonus
          base = 0;
          marketBonus = 0;
          break;
        case 'FLOW_EXIT':
        case 'FORCED':
          // 50% survival bonus
          base = Math.floor(base * 0.5);
          break;
      }
    } else if (exitType === 'death') {
      // 50% penalty on kills and levels, no survival/market bonus
      killBonus = Math.floor(killBonus * 0.5);
      levelBonus = Math.floor(levelBonus * 0.5);
      base = 0;
      marketBonus = 0;
      streakBonus = 0;
    } else if (exitType === 'afk_death') {
      // Zero rewards
      base = 0;
      killBonus = 0;
      levelBonus = 0;
      marketBonus = 0;
      streakBonus = 0;
    }

    const total = Math.floor(
      base + killBonus + levelBonus + marketBonus + streakBonus + portalBonusAmount
    );

    return {
      base,
      killBonus,
      levelBonus,
      marketBonus,
      streakBonus,
      portalBonus: portalBonusAmount,
      total,
      breakdown: {
        'Survival Time': base,
        Kills: killBonus,
        'Level Bonus': levelBonus,
        'Market Profit': marketBonus,
        'Kill Streak': streakBonus,
        'Portal Bonus': portalBonusAmount,
      },
    };
  }

  public setRates(rates: Partial<CoinRates>): void {
    this.rates = { ...this.rates, ...rates };
  }
}
