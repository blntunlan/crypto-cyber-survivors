/**
 * Challenge System Types
 */

export interface ChallengeDefinition {
  id: string;
  type: 'daily' | 'weekly';
  name: string;
  description: string;
  constraints: ChallengeConstraint[];
  objectives: ChallengeObjective[];
  reward: ChallengeReward;
  expiresAt: string;
  seed: number;
}

export interface ChallengeConstraint {
  type: 'position' | 'leverage_min' | 'leverage_max' | 'game_mode';
  value: string | number;
}

export interface ChallengeObjective {
  type:
    | 'survive_seconds'
    | 'kill_count'
    | 'reach_level'
    | 'survive_liquidation_zone'
    | 'whale_kill_count';
  target: number;
  current: number;
  completed: boolean;
}

export interface ChallengeReward {
  metaCoins: number;
  bonusXp: number;
}

export interface ChallengeStatus {
  dailyCompleted: boolean;
  weeklyCompleted: boolean;
}
