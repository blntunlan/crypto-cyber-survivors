/**
 * GameSessionService - Manages game session lifecycle via Railway API.
 *
 * Railway Express endpoint client for game session verification.
 */

import { Logger } from '../system/Logger';
import { UserSessionService } from './UserSessionService';
import { type MarketPosition } from '../../types';
import { type CryptoPair } from '../../types/crypto';
import {
  type RewardPayload,
  type RewardVerificationResponse,
  type UnlockedAchievement,
} from '../../types/reward';
import { signPayload, createSignablePayload } from '../../utils/crypto';
import { getMarketSyncQueue } from '../market/sync';
import { railwayClient } from '../api/RailwayClient';
import { SessionValidator } from '../validators/SessionValidator';
import { type SessionValidationInput } from '../validators/types';
import { EventBus } from '../core/EventBus';
import { ProductAnalyticsService } from '../analytics/ProductAnalyticsService';

export interface ServerSessionResponse {
  sessionId: string;
  startTime: string;
  sessionSecret: string;
}

export type CashOutDecision = 'accept' | 'reject' | 'safe_exit' | 'timeout';

export type CashOutQuoteResponse = {
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
};

export type CashOutDecisionResponse = {
  state: 'active' | 'settled' | 'failed';
  rewardPoints: number;
  greedDelta: number;
  greedLevel: number;
  canonicalSequence: number;
};

export type CashOutFailureResponse = {
  state: 'failed';
  primaryRewardPoints: 0;
  shards: number;
};

type RuntimeAuditFlushResult = {
  ok: boolean;
  batches: number;
  acked: number;
  retried: number;
  remaining: number;
  error?: string;
};

export class GameSessionService {
  private static currentSessionId: string | null = null;
  private static currentSessionSecret: string | null = null;
  private static isStarting = false;
  private static isSubmitting = false;

  private static async flushRuntimeAuditQueue(
    reason: string
  ): Promise<RuntimeAuditFlushResult> {
    try {
      const result = await getMarketSyncQueue().flushAll();
      Logger.info(`[GameSession] Runtime sync queue flushed (${reason})`, result);
      return {
        ok: result.remaining === 0,
        ...result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Logger.warn('[GameSession] Runtime sync queue flush failed', {
        reason,
        error: message,
      });
      return {
        ok: false,
        batches: 0,
        acked: 0,
        retried: 0,
        remaining: 1,
        error: message,
      };
    }
  }

  /**
   * Start a new validated session on the server.
   */
  static async startSession(
    pair: CryptoPair,
    leverage: number,
    position: MarketPosition
  ): Promise<ServerSessionResponse | null> {
    if (this.isStarting) {
      Logger.warn('[GameSession] Session start already in progress');
      return null;
    }

    const nickname = UserSessionService.getNickname();
    if (!nickname) {
      Logger.error('[GameSession] Cannot start session: No nickname found');
      throw new Error('NICKNAME_REQUIRED');
    }

    this.isStarting = true;
    Logger.info(`[GameSession] Starting server session for ${nickname} (${pair})...`);

    try {
      const payload = {
        pair,
        leverage,
        position,
      };

      Logger.info('[GameSession] STARTING SESSION WITH', payload);

      const data = await railwayClient.post<ServerSessionResponse>(
        '/api/v1/sessions/start',
        payload
      );

      if (!data.sessionId) {
        Logger.error('[GameSession] start-session returned empty data:', data);
        throw new Error('Invalid response from start-session');
      }

      this.currentSessionId = data.sessionId;
      this.currentSessionSecret = data.sessionSecret;

      Logger.info(`[GameSession] Server session started: ${this.currentSessionId}`);

      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      Logger.error('[GameSession] Failed to start server session', error);

      // Handle specific 'Profile/Player not found' error
      const isProfileNotFound =
        errorMsg.includes('Profile not found') || errorMsg.includes('Player not found');

      if (isProfileNotFound) {
        if (import.meta.env.DEV) {
          Logger.warn(
            `[GameSession] Player '${nickname}' not found on server yet. Using local fallback.`
          );
          return this.triggerDevFallback();
        } else {
          Logger.error(
            `[GameSession] Profile '${nickname}' not found in production. Clearing session.`
          );
          UserSessionService.clearUser();
          throw new Error('PROFILE_NOT_FOUND');
        }
      }

      if (
        error instanceof Error &&
        (error.message === 'PROFILE_NOT_FOUND' || error.message === 'NICKNAME_REQUIRED')
      ) {
        throw error;
      }

      if (import.meta.env.DEV) {
        return this.triggerDevFallback();
      }

      return null;
    } finally {
      this.isStarting = false;
    }
  }

  private static triggerDevFallback(): ServerSessionResponse {
    Logger.warn('[GameSession] DEV mode fallback active');
    const fallbackId = `local-${Date.now()}`;
    const fallbackSecret = `secret-${Math.random().toString(36).slice(2)}`;
    this.currentSessionId = fallbackId;
    this.currentSessionSecret = fallbackSecret;

    return {
      sessionId: fallbackId,
      startTime: new Date().toISOString(),
      sessionSecret: fallbackSecret,
    };
  }

  /**
   * Submit session results for verification and reward processing.
   */
  static async submitSession(
    results: {
      level: number;
      kills: number;
      survivalTimeMs: number;
      entryPrice: number;
      exitPrice: number;
      pnlPercent: number;
      pair: CryptoPair;
      position: MarketPosition;
      leverage: number;
      endReason: string;
      exitType?: 'portal' | 'death' | 'afk_death' | 'cycle_complete';
      portalType?: 'TAKE_PROFIT' | 'STOP_LOSS' | 'FLOW_EXIT' | 'FORCED' | null;
      maxStreak?: number;
      replayData?: unknown;
      performance?: unknown;
    },
    rewardPayload?: RewardPayload
  ): Promise<{
    success: boolean;
    reward?: number;
    metaShare?: number;
    verified?: boolean;
    error?: string;
    newlyUnlockedAchievements?: UnlockedAchievement[];
  }> {
    const sessionId = this.currentSessionId;
    const sessionSecret = this.currentSessionSecret;
    if (!sessionId || !sessionSecret) {
      Logger.warn('[GameSession] Cannot submit: No active session found');
      return { success: false, error: 'NO_ACTIVE_SESSION' };
    }

    if (this.isSubmitting) {
      Logger.warn('[GameSession] Result submission already in progress');
      return { success: false, error: 'SUBMISSION_IN_PROGRESS' };
    }

    this.isSubmitting = true;

    try {
      Logger.info(`[GameSession] Submitting results to verify session: ${sessionId}`);

      const auditFlush = await this.flushRuntimeAuditQueue('before_submit');
      if (!auditFlush.ok) {
        const error =
          auditFlush.error === undefined
            ? 'MARKET_SYNC_PENDING'
            : 'MARKET_SYNC_FLUSH_FAILED';
        Logger.warn(
          '[GameSession] Submission paused until runtime sync flush completes',
          {
            sessionId,
            auditFlush,
            error,
          }
        );
        EventBus.emit('verification:queued', {
          sessionId,
          source: 'market_sync',
          error,
          auditFlush,
        });
        return { success: false, error };
      }

      const survivalSeconds = Math.floor(
        rewardPayload?.survivalSeconds ?? Math.floor(results.survivalTimeMs / 1000)
      );

      const payload = {
        sessionId,
        pair: results.pair,
        position: results.position,
        leverage: results.leverage,
        claimedEntryPrice: results.entryPrice,
        claimedExitPrice: results.exitPrice,
        claimedPnL: results.pnlPercent,
        kills: rewardPayload?.kills ?? results.kills,
        level: rewardPayload?.level ?? results.level,
        survivalSeconds,
        exitType: rewardPayload?.exitType ?? results.exitType ?? 'death',
        portalType: rewardPayload?.portalType ?? results.portalType ?? null,
        maxStreak: rewardPayload?.maxStreak ?? results.maxStreak ?? 0,
        // Reward coin fields (included when rewardPayload is provided)
        ...(rewardPayload && {
          rawCoins: rewardPayload.rawCoins,
          enemyDropCoins: rewardPayload.enemyDropCoins,
          totalCoins: rewardPayload.totalCoins,
          pnlPercent: rewardPayload.pnlPercent,
          breakdown: rewardPayload.breakdown,
        }),
      };

      // Run client-side validators (advisory — never blocks submission)
      const validationInput: SessionValidationInput = {
        kills: payload.kills as number,
        level: payload.level as number,
        survivalSeconds: payload.survivalSeconds as number,
        entryPrice: results.entryPrice,
        exitPrice: results.exitPrice,
        pnlPercent: results.pnlPercent,
        leverage: results.leverage,
        position: results.position,
        maxStreak: payload.maxStreak as number,
        exitType: payload.exitType as string,
        portalType: payload.portalType,
        totalCoins: rewardPayload?.totalCoins,
        rawCoins: rewardPayload?.rawCoins,
        enemyDropCoins: rewardPayload?.enemyDropCoins,
        breakdown: rewardPayload?.breakdown,
      };
      const validation = SessionValidator.validate(validationInput);
      if (validation.severity === 'fail') {
        Logger.warn('[GameSession] Client validation failed (advisory)', {
          findings: validation.findings.filter(f => f.severity === 'fail'),
        });
      }

      // Generate HMAC signature over deterministic field subset (must match server)
      const signature = await signPayload(
        createSignablePayload(payload as unknown as Record<string, unknown>),
        sessionSecret
      );

      const data = await railwayClient.post<
        RewardVerificationResponse & { pnl?: number }
      >('/api/v1/sessions/verify', {
        sessionId,
        signature,
        payload,
      });

      Logger.info('[GameSession] Results verified successfully', data);

      void ProductAnalyticsService.track({
        eventType: 'leaderboard_submitted',
        sessionId,
        metadata: {
          pair: results.pair,
          position: results.position,
          leverage: results.leverage,
          verified: data.verified,
          reward: data.reward,
        },
      });

      this.clearSession(sessionId);

      return {
        success: true,
        verified: data.verified,
        reward: data.reward,
        metaShare: data.metaShare,
        newlyUnlockedAchievements: data.newlyUnlockedAchievements,
      };
    } catch (error) {
      Logger.error('[GameSession] Failed to submit session results', error);

      if (import.meta.env.DEV) {
        Logger.warn('[GameSession] DEV mode fallback: Simulating success');
        this.clearSession(sessionId);
        return { success: true, reward: 0 };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      };
    } finally {
      this.isSubmitting = false;
    }
  }

  static getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  static async requestCashOutQuote(): Promise<CashOutQuoteResponse> {
    if (!this.currentSessionId || this.currentSessionId.startsWith('local-')) {
      throw new Error('NO_SERVER_SESSION');
    }

    return railwayClient.post<CashOutQuoteResponse>('/api/v1/economy/cash-out/quote', {
      session_id: this.currentSessionId,
    });
  }

  static async decideCashOut(
    quoteId: string,
    signature: string,
    decision: CashOutDecision,
    idempotencyKey: string
  ): Promise<CashOutDecisionResponse> {
    if (!this.currentSessionId || this.currentSessionId.startsWith('local-')) {
      throw new Error('NO_SERVER_SESSION');
    }

    return railwayClient.post<CashOutDecisionResponse>(
      '/api/v1/economy/cash-out/decision',
      {
        quote_id: quoteId,
        signature,
        decision,
        idempotency_key: idempotencyKey,
      }
    );
  }

  static async recordCashOutFailure(
    failureType: 'death' | 'liquidation',
    idempotencyKey: string
  ): Promise<CashOutFailureResponse> {
    if (!this.currentSessionId || this.currentSessionId.startsWith('local-')) {
      throw new Error('NO_SERVER_SESSION');
    }

    return railwayClient.post<CashOutFailureResponse>(
      '/api/v1/economy/cash-out/failure',
      {
        session_id: this.currentSessionId,
        failure_type: failureType,
        idempotency_key: idempotencyKey,
      }
    );
  }

  static getCurrentSessionSecret(): string | null {
    return this.currentSessionSecret;
  }

  static clearSession(expectedSessionId?: string): void {
    if (
      expectedSessionId !== undefined &&
      this.currentSessionId !== expectedSessionId
    ) {
      return;
    }
    void this.flushRuntimeAuditQueue('clear_session');
    this.currentSessionId = null;
    this.currentSessionSecret = null;
  }
}
