/**
 * GameSessionService - Manages game session lifecycle via Supabase Edge Functions.
 *
 * Handles starting a session on the server to get a unique session secret
 * and ending it to verify the results and replay data.
 */

import { supabase, isSupabaseConfigured } from '../Supabase';
import { Logger } from '../Logger';
import { UserSessionService } from './UserSessionService';
import { type MarketPosition } from '../../types';
import { type CryptoPair } from '../../types/crypto';

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

    try {
      if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase not configured');
      }

      const { data, error } = await supabase.functions.invoke('start-session', {
        body: {
          userId: nickname,
          pair,
          leverage,
          position,
        },
      });

      if (error) {
        throw error;
      }

      this.currentSessionId = data.sessionId;
      this.currentSessionSecret = data.sessionSecret;

      Logger.info(`[GameSession] Server session started: ${this.currentSessionId}`);

      return data as ServerSessionResponse;
    } catch (error) {
      Logger.error('[GameSession] Failed to start server session', error);

      // Fallback for local development or connection issues
      if (import.meta.env.DEV) {
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

      return null;
    } finally {
      this.isStarting = false;
    }
  }

  /**
   * Submit session results for verification and reward processing.
   * This is the "Data Bridge" that closes the loop between game and DB.
   */
  static async submitSession(results: {
    level: number;
    kills: number;
    survivalTimeMs: number;
    exitPrice: number;
    pnlPercent: number;
    endReason: string;
    replayData?: any;
    performance?: any;
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
        `[GameSession] Submitting results for session: ${this.currentSessionId}`
      );

      const { data, error } = await supabase.functions.invoke('submit-score', {
        body: {
          sessionId: this.currentSessionId,
          sessionSecret: this.currentSessionSecret,
          results: {
            ...results,
            // Ensure numbers are sanitized
            level: Math.floor(results.level),
            kills: Math.floor(results.kills),
            survivalTimeMs: Math.floor(results.survivalTimeMs),
          },
        },
      });

      if (error) throw error;

      Logger.info('[GameSession] Results submitted and verified successfully', data);

      // Clear session after successful submission
      this.clearSession();

      return {
        success: true,
        reward: data.rewardAmount,
      };
    } catch (error) {
      Logger.error('[GameSession] Failed to submit session results', error);

      // In DEV mode, we simulate success to allow UI testing
      if (import.meta.env.DEV) {
        Logger.warn('[GameSession] DEV mode: Simulating successful submission');
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
