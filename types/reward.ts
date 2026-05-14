/**
 * Reward Pipeline DTOs — shared types for reward calculation,
 * verification, and session reconciliation.
 */

// ---------------------------------------------------------------------------
// Enums / Unions
// ---------------------------------------------------------------------------

export type PortalType = 'TAKE_PROFIT' | 'STOP_LOSS' | 'FLOW_EXIT' | 'FORCED';

export type ExitType = 'portal' | 'death' | 'afk_death' | 'cycle_complete';

// ---------------------------------------------------------------------------
// Breakdown
// ---------------------------------------------------------------------------

export type RewardBreakdown = {
  base: number;
  survival: number;
  kill: number;
  level: number;
  market: number;
  streak: number;
  portal: number;
};

// ---------------------------------------------------------------------------
// Payload
// ---------------------------------------------------------------------------

export type RewardPayload = {
  kills: number;
  level: number;
  survivalSeconds: number;
  pnlPercent: number;
  maxStreak: number;
  exitType: ExitType;
  portalType: PortalType | null;
  rawCoins: number;
  enemyDropCoins: number;
  totalCoins: number;
  breakdown: RewardBreakdown;
};

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

export type RewardVerificationResponse = {
  verified: boolean;
  reward: number;
  metaShare: number;
};
