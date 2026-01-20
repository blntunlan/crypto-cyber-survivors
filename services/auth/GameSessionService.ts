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
