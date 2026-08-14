/**
 * services/api/types/contracts.ts — Unified Client-Server Contract Definitions
 *
 * Strongly typed interface contracts aligning the React/Vite client
 * with railway-market-server & railway-market-aggregator routes and Zod schemas.
 */

import { type CryptoPair } from '../../../types/crypto';
import { type MarketPosition } from '../../../types';

// =============================================================================
// ENUMS & PRIMITIVES
// =============================================================================

export type ExitType = 'portal' | 'death' | 'afk_death' | 'cycle_complete';
export type PortalType = 'TAKE_PROFIT' | 'STOP_LOSS' | 'FLOW_EXIT' | 'FORCED';
export type AccountType = 'anonymous' | 'registered' | 'service';
export type AccountStatus = 'active' | 'banned' | 'suspended';

// =============================================================================
// SESSIONS CONTRACT
// =============================================================================

export interface StartSessionRequest {
  pair: string;
  leverage: number;
  position: 'LONG' | 'SHORT';
  userId?: string;
}

export interface StartSessionResponse {
  sessionId: string;
  startTime: string;
  sessionSecret: string;
}

export interface VerifySessionPayload {
  sessionId: string;
  pair: string;
  position: string;
  leverage: number;
  claimedEntryPrice: number;
  claimedExitPrice: number;
  claimedPnL: number;
  kills: number;
  level: number;
  survivalSeconds: number;
  exitType: ExitType;
  portalType?: PortalType | null;
  maxStreak: number;
  rawCoins?: number;
  enemyDropCoins?: number;
  totalCoins?: number;
  pnlPercent?: number;
  breakdown?: {
    base: number;
    survival: number;
    kill: number;
    level: number;
    market: number;
    streak: number;
    portal: number;
  };
}

export interface VerifySessionRequest {
  sessionId: string;
  signature: string;
  payload: VerifySessionPayload;
}

export interface VerifySessionResponse {
  success: boolean;
  verified: boolean;
  reward: number;
  metaShare?: number;
  newlyUnlockedAchievements?: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    rewardCoins: number;
    rewardType: string;
  }>;
  error?: string;
}

// =============================================================================
// ECONOMY & CASH-OUT CONTRACT
// =============================================================================

export interface CashOutQuoteRequest {
  sessionId: string;
  pair: CryptoPair;
  position: MarketPosition;
  leverage: number;
  entryPrice: number;
  exitPrice: number;
  kills: number;
  survivalSeconds: number;
  level: number;
  streakCount: number;
  reason: 'player_initiated' | 'margin_call' | 'timeout';
}

export interface CashOutQuoteResponse {
  quote: {
    quoteId: string;
    sessionId: string;
    canonicalSequence: number;
    rewardPoints: number;
    issuedAtSeconds: number;
    expiresAtSeconds: number;
  };
  signature: string;
  shouldForceRecovery: boolean;
  safeExitOnly: boolean;
  greedLevel: number;
}

export interface CashOutDecisionRequest {
  quoteId: string;
  decision: 'accept' | 'reject' | 'safe_exit' | 'timeout';
  clientActionSequence: number;
  timestamp: number;
}

export interface CashOutDecisionResponse {
  state: 'active' | 'settled' | 'failed';
  rewardPoints: number;
  greedDelta: number;
  greedLevel: number;
  canonicalSequence: number;
}

// =============================================================================
// AUTH & PROFILE CONTRACT
// =============================================================================

export interface AnonymousAuthRequest {
  display_name?: string;
  device_fingerprint?: string;
}

export interface AnonymousAuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  account: {
    id: string;
    type: AccountType;
  };
  profile: {
    id: string;
    displayName: string;
  };
  wallet: {
    id: string;
    balance: number;
    currency: string;
  };
}

export interface ProfileResponse {
  id: string;
  accountId: string;
  displayName: string;
  nickname?: string;
  avatarUrl?: string | null;
  level: number;
  xp: number;
  coins: number;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// MARKET RUNTIME BATCH CONTRACT
// =============================================================================

export interface MarketRuntimeBatchItem {
  runId?: string;
  seq: number;
  runConstants?: Record<string, unknown>;
  tick?: Record<string, unknown>;
  snapshot?: Record<string, unknown>;
}

export interface MarketRuntimeBatchRequest {
  runId?: string | null;
  count: number;
  items: MarketRuntimeBatchItem[];
}

export interface MarketRuntimeBatchResponse {
  runId: string | null;
  received: number;
  accepted: number;
  duplicates: number;
}

// =============================================================================
// TELEMETRY CONTRACT
// =============================================================================

export interface DeviceProfileTelemetryRequest {
  fingerprint: string;
  device_type?: string;
  browser?: string;
  screen_width?: number;
  screen_height?: number;
  hardware_concurrency?: number;
  device_memory?: number;
  recommended_profile?: string;
  benchmark_score?: number;
}

export interface PerformanceMetricsTelemetryRequest {
  sessionId?: string;
  fpsAverage: number;
  fpsMin: number;
  frameDrops: number;
  renderTimeMs: number;
  drawCalls: number;
  poolSize: number;
}
