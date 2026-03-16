/**
 * GameSessionService - Manages game session lifecycle via Railway API.
 *
 * Migrated from Supabase Edge Functions to Railway Express endpoints.
 */

import { Logger } from '../system/Logger';
import { UserSessionService } from './UserSessionService';
import { type MarketPosition } from '../../types';
import { type CryptoPair } from '../../types/crypto';
import { signPayload } from '../../utils/crypto';
import { getMarketSyncQueue } from '../market/sync';
import { railwayClient } from '../api/RailwayClient';

export interface ServerSessionResponse {
  sessionId: string;
  startTime: string;
  sessionSecret: string;
}

export class GameSessionService {
  private static currentSessionId: string | null = null;
  private static currentSessionSecret: string | null = null;
  private static isStarting = false;
  private static isSubmitting = false;

  private static async flushRuntimeAuditQueue(reason: string): Promise<void> {
    try {
      const result = await getMarketSyncQueue().flushAll();
      Logger.info(`[GameSession] Runtime sync queue flushed (${reason})`, result);
    } catch (error) {
      Logger.warn('[GameSession] Runtime sync queue flush failed', {
        reason,
        error: error instanceof Error ? error.message : String(error),
      });
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
        userId: nickname,
        pair,
        leverage,
        position,
      };

      Logger.info('[GameSession] STARTING SESSION WITH', payload);

      const data = await railwayClient.post<ServerSessionResponse>(
        '/api/v1/sessions/start',
        payload
      );

      if (!data?.sessionId) {
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
  static async submitSession(results: {
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
    replayData?: unknown;
    performance?: unknown;
  }): Promise<{ success: boolean; reward?: number; error?: string }> {
    if (!this.currentSessionId || !this.currentSessionSecret) {
      Logger.warn('[GameSession] Cannot submit: No active session found');
      return { success: false, error: 'NO_ACTIVE_SESSION' };
    }

    if (this.isSubmitting) {
      Logger.warn('[GameSession] Result submission already in progress');
      return { success: false, error: 'SUBMISSION_IN_PROGRESS' };
    }

    this.isSubmitting = true;

    try {
      Logger.info(
        `[GameSession] Submitting results to verify session: ${this.currentSessionId}`
      );

      await this.flushRuntimeAuditQueue('before_submit');

      const payload = {
        sessionId: this.currentSessionId,
        pair: results.pair,
        position: results.position,
        leverage: results.leverage,
        claimedEntryPrice: results.entryPrice,
        claimedExitPrice: results.exitPrice,
        claimedPnL: results.pnlPercent,
        kills: results.kills,
        level: results.level,
        survivalSeconds: Math.floor(results.survivalTimeMs / 1000),
        exitType: results.exitType ?? 'death',
        portalType: results.portalType ?? null,
      };

      // Generate HMAC signature
      const signature = await signPayload(
        JSON.stringify(payload),
        this.currentSessionSecret
      );

      const data = await railwayClient.post<{
        verified: boolean;
        reward: number;
        pnl: number;
      }>('/api/v1/sessions/verify', {
        sessionId: this.currentSessionId,
        signature,
        payload,
      });

      Logger.info('[GameSession] Results verified successfully', data);

      this.clearSession();

      return {
        success: true,
        reward: data.reward,
      };
    } catch (error) {
      Logger.error('[GameSession] Failed to submit session results', error);

      if (import.meta.env.DEV) {
        Logger.warn('[GameSession] DEV mode fallback: Simulating success');
        this.clearSession();
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

  static getCurrentSessionSecret(): string | null {
    return this.currentSessionSecret;
  }

  static clearSession(): void {
    void this.flushRuntimeAuditQueue('clear_session');
    this.currentSessionId = null;
    this.currentSessionSecret = null;
  }
}
