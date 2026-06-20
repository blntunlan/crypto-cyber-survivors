import { SEASON_CONFIG } from '../../config/SeasonConfig';

export type SeasonPointsInput = {
  survivalSeconds: number;
  kills: number;
  level: number;
  questCompletions?: number;
  walletConnected?: boolean;
};

export type SeasonPointsBreakdown = {
  seasonId: string;
  survivalPoints: number;
  killPoints: number;
  levelPoints: number;
  questPoints: number;
  walletIdentityBonus: number;
  totalPoints: number;
};

class SeasonServiceClass {
  getActiveSeason(): typeof SEASON_CONFIG {
    return SEASON_CONFIG;
  }

  calculatePoints(input: SeasonPointsInput): SeasonPointsBreakdown {
    const scoring = SEASON_CONFIG.scoring;
    const survivalSeconds = Math.max(0, Math.floor(input.survivalSeconds));
    const kills = Math.max(0, Math.floor(input.kills));
    const level = Math.max(1, Math.floor(input.level));
    const questCompletions = Math.max(0, Math.floor(input.questCompletions ?? 0));

    const survivalPoints = survivalSeconds * scoring.survivalSecondPoints;
    const killPoints = kills * scoring.killPoints;
    const levelPoints = Math.max(0, level - 1) * scoring.levelPoints;
    const questPoints = questCompletions * scoring.questCompletionPoints;
    const walletIdentityBonus = input.walletConnected ? scoring.walletIdentityBonus : 0;

    const uncappedTotal =
      survivalPoints + killPoints + levelPoints + questPoints + walletIdentityBonus;

    return {
      seasonId: SEASON_CONFIG.id,
      survivalPoints,
      killPoints,
      levelPoints,
      questPoints,
      walletIdentityBonus,
      totalPoints: Math.min(uncappedTotal, scoring.maxRunPoints),
    };
  }
}

export const SeasonService = new SeasonServiceClass();
