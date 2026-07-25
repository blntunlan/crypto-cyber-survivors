/**
 * Game Mode Types
 *
 * Defines different game modes:
 * - CASUAL: Classic endless survival, no cycle completion
 * - COMPETITIVE: 5-minute cycles with leaderboard and coin rewards
 */

export enum GameMode {
  CASUAL = 'CASUAL',
  COMPETITIVE = 'COMPETITIVE',
}

export interface GameModeConfig {
  mode: GameMode;
  displayName: string;
  description: string;
  hasCycles: boolean;
  hasLeaderboard: boolean;
  hasCoinRewards: boolean;
  cycleDurationSeconds: number;
}

export const GAME_MODE_CONFIGS: Record<GameMode, GameModeConfig> = {
  [GameMode.CASUAL]: {
    mode: GameMode.CASUAL,
    displayName: 'Casual',
    description: 'Classic endless survival. Play at your own pace.',
    hasCycles: false,
    hasLeaderboard: false,
    hasCoinRewards: false,
    cycleDurationSeconds: 0,
  },
  [GameMode.COMPETITIVE]: {
    mode: GameMode.COMPETITIVE,
    displayName: 'Competitive',
    description: '5-minute cycles. Compete for leaderboard and earn rewards.',
    hasCycles: true,
    hasLeaderboard: true,
    hasCoinRewards: true,
    cycleDurationSeconds: 300,
  },
};

export interface CycleCompleteData {
  cycleNumber: number;
  survivalTimeSeconds: number;
  totalKills: number;
  level: number;
  pnl: number;
  effectivePnl: number;
}

export type CashOutOfferData = {
  cycle: CycleCompleteData;
  quote: {
    quoteId: string;
    sessionId: string;
    canonicalSequence: number;
    rewardPoints: number;
    issuedAtSeconds: number;
    expiresAtSeconds: number;
  };
  signature: string;
  safeExitOnly: boolean;
  greedLevel: number;
};
