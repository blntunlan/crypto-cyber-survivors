/**
 * GameSessionService - Manages game session lifecycle via Supabase Edge Functions.
 *
 * Handles starting a session on the server to get a unique session secret
 * and ending it to verify the results and replay data.
 */

import { supabase, isSupabaseConfigured } from '../core/Supabase';
import { Logger } from '../system/Logger';
import { UserSessionService } from './UserSessionService';
import { type MarketPosition } from '../../types';
import { type CryptoPair } from '../../types/crypto';

import { signPayload } from '../../utils/crypto';

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
      return null;
    }

    this.isStarting = true;
    Logger.info(`[GameSession] Starting server session for ${nickname} (${pair})...`);

    try {
      if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase not configured on this client');
      }

      const payload = {
        userId: nickname,
        pair,
        leverage,
        position,
      };

      Logger.info('[GameSession] STARTING SESSION WITH', payload);

      const { data, error } = await supabase.functions.invoke('start-session', {
        body: payload,
      });

      if (error) {
        let errorMsg = 'Unknown Error';
        try {
          const body = await error.context.json();
          errorMsg = (body.error ?? body.message ?? JSON.stringify(body)) as string;
        } catch {
          errorMsg = error.message;
        }

        // Handle specific 'Profile/Player not found' error - common during initial setup or dev
        const isProfileNotFound =
          errorMsg.includes('Profile not found') ||
          errorMsg.includes('Player not found');

        if (isProfileNotFound) {
          if (import.meta.env.DEV) {
            Logger.warn(
              `[GameSession] Player '${nickname}' not found on server yet. Using local fallback.`
            );
            return this.triggerDevFallback();
          } else {
            // Production: Clear invalid session and redirect to nickname screen
            Logger.error(
              `[GameSession] Profile '${nickname}' not found in production. Clearing session.`
            );
            UserSessionService.clearUser();
            throw new Error('PROFILE_NOT_FOUND');
          }
        }

        Logger.error(`[GameSession] start-session failed: ${errorMsg}`, error);

        if (import.meta.env.DEV) {
          Logger.warn(
            '[GameSession] DEV mode: Falling back to local session after error'
          );
          return this.triggerDevFallback();
        }

        throw new Error(errorMsg);
      }

      if (!data?.sessionId) {
        Logger.error('[GameSession] start-session returned empty data:', data);
        throw new Error('Invalid response from start-session');
      }

      this.currentSessionId = data.sessionId;
      this.currentSessionSecret = data.sessionSecret;

      Logger.info(`[GameSession] Server session started: ${this.currentSessionId}`);

      return data as ServerSessionResponse;
    } catch (error) {
      Logger.error('[GameSession] Failed to start server session', error);

      // Fallback for local development or connection issues
      if (import.meta.env.DEV) {
        return this.triggerDevFallback();
      }

      return null;
    } finally {
      this.isStarting = false;
    }
  }

  /**
   * Triggers a local session fallback for development mode.
   */
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
      if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase not configured');
      }

      Logger.info(
        `[GameSession] Submitting results to verify-game-v2 for session: ${this.currentSessionId}`
      );

      // Prepare payload to match server requirements
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
      };

      // Generate HMAC signature
      const signature = await signPayload(
        JSON.stringify(payload),
        this.currentSessionSecret
      );

      const { data, error } = await supabase.functions.invoke('verify-game-v2', {
        body: {
          sessionId: this.currentSessionId,
          signature,
          payload,
        },
      });

      if (error) {
        let errorMsg = 'Verification failed';
        try {
          const body = await error.context.json();
          errorMsg = body.error || body.message || error.message;
        } catch {
          errorMsg = error.message;
        }
        throw new Error(errorMsg);
      }

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

  /**
   * Get the current session ID.
   */
  static getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Get the current session secret.
   */
  static getCurrentSessionSecret(): string | null {
    return this.currentSessionSecret;
  }

  /**
   * Clear session data.
   */
  static clearSession(): void {
    this.currentSessionId = null;
    this.currentSessionSecret = null;
  }
}
