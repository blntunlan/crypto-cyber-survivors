/**
 * Shared Reward Calculation Logic
 * Used by BOTH the client-side UI (CoinService) and server-side validation (verify-game)
 * Ensures consistency and prevents cheating.
 *
 * Shared reward calculator for Railway-native session verification.
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

export const MAX_REWARDABLE_LEVEL = 100;

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

  public calculate(params: RewardCalculationParams): RewardCalculationResult {
    const survivalTimeSeconds = Math.max(0, params.survivalTimeSeconds || 0);
    const kills = Math.max(0, params.kills || 0);
    const level = Math.min(
      MAX_REWARDABLE_LEVEL,
      Math.max(0, params.level || 0)
    );
    const pnl = params.pnl || 0;
    const maxStreak = Math.max(0, params.maxStreak || 0);
    const exitType = params.exitType || 'cycle_complete';
    const portalType = params.portalType || null;

    let base = Math.floor(survivalTimeSeconds * this.rates.perSecond);
    let killBonus = kills * this.rates.perKill;
    let levelBonus = level * this.rates.perLevel;
    let marketBonus = pnl > 0 ? Math.floor(pnl * 100 * this.rates.pnlMultiplier) : 0;

    const streakMilestones = Math.floor(maxStreak / 10);
    let streakBonus = Math.min(
      streakMilestones * this.rates.streakMilestoneBonus,
      this.rates.maxStreakBonus
    );

    let portalBonusAmount = 0;

    if (exitType === 'portal' && portalType) {
      switch (portalType) {
        case 'TAKE_PROFIT':
          portalBonusAmount = Math.floor((base + killBonus + marketBonus) * 0.2);
          break;
        case 'STOP_LOSS':
          base = 0;
          marketBonus = 0;
          break;
        case 'FLOW_EXIT':
        case 'FORCED':
          base = Math.floor(base * 0.5);
          break;
      }
    } else if (exitType === 'death') {
      killBonus = Math.floor(killBonus * 0.5);
      levelBonus = Math.floor(levelBonus * 0.5);
      base = 0;
      marketBonus = 0;
      streakBonus = 0;
    } else if (exitType === 'afk_death') {
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
}
