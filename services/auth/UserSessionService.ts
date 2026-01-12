/**
 * UserSessionService - Manages player identity and session state.
 *
 * Handles localStorage persistence for the player's identity and
 * provides accessors for player information across the application.
 */

import { Logger } from '../Logger';
import { type StoredUser } from './types';
import { nanoid } from 'nanoid';

const STORAGE_KEY = 'crypto_survivors_user';

export class UserSessionService {
  private static cachedUser: StoredUser | null = null;

  /**
   * Check if a user is already stored in localStorage.
   */
  static hasStoredUser(): boolean {
    return this.getStoredUser() !== null;
  }

  /**
   * Get the stored user data from localStorage.
   */
  static getStoredUser(): StoredUser | null {
    if (this.cachedUser) return this.cachedUser;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.cachedUser = JSON.parse(stored) as StoredUser;
        return this.cachedUser;
      }
    } catch (error) {
      Logger.error('[UserSession] Failed to load user from storage', error);
    }

    return null;
  }

  /**
   * Get the player ID for metrics tracking.
   * If no user is stored, returns a temporary anonymous ID.
   */
  static getPlayerId(): string {
    const user = this.getStoredUser();
    if (user) return user.playerId;

    // Return a temporary ID if not logged in (for pre-login metrics)
    return 'anon-' + nanoid(10);
  }

  /**
   * Get the player's nickname.
   */
  static getNickname(): string | null {
    const user = this.getStoredUser();
    return user ? user.nickname : null;
  }

  /**
   * Save a new user to storage after successful registration/login.
   */
  static saveUser(playerId: string, nickname: string): void {
    const now = Date.now();
    const user: StoredUser = {
      playerId,
      nickname,
      createdAt: now,
      lastSeenAt: now,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      this.cachedUser = user;
      Logger.info(`[UserSession] User saved: ${nickname} (${playerId})`);
    } catch (error) {
      Logger.error('[UserSession] Failed to save user to storage', error);
    }
  }

  /**
   * Register a new nickname in Supabase and save to local storage.
   */
  static async registerNickname(
    nickname: string
  ): Promise<{ success: boolean; error?: string }> {
    const { supabase, isSupabaseConfigured } = await import('../Supabase');

    if (
      !isSupabaseConfigured() ||
      !supabase ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    ) {
      // Fallback for local-only development if Supabase isn't ready or on localhost
      Logger.warn('[UserSession] Local environment detected, using local-only mode');
      // Use a consistent mock UUID to avoid 'invalid input syntax for type uuid'
      const mockPlayerId = '00000000-0000-4000-a000-000000000000';
      this.saveUser(mockPlayerId, nickname);
      return { success: true };
    }

    try {
      // 1. Check if nickname exists
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .ilike('display_name', nickname) // Case insensitive check
        .single();

      if (existingPlayer) {
        // If it exists, we'll "log in" as that player for the beta
        // In a real app we'd need auth, but for beta this is simplified
        this.saveUser(existingPlayer.id, nickname);

        // Update last seen
        await supabase.rpc('update_player_last_seen', {
          p_player_id: existingPlayer.id,
        });

        return { success: true };
      }

      // 2. Create new player
      const { data: newPlayer, error } = await supabase
        .from('players')
        .insert({
          display_name: nickname,
          total_sessions: 1,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'Nickname already taken' };
        }
        throw error;
      }

      if (newPlayer) {
        this.saveUser(newPlayer.id, nickname);
        return { success: true };
      }

      return { success: false, error: 'Failed to create player' };
    } catch (error) {
      Logger.error('[UserSession] Registration error', error);
      return { success: false, error: 'Connection error. Please try again.' };
    }
  }

  /**
   * Update the last seen timestamp in storage and optionally Supabase.
   */
  static async updateLastSeen(): Promise<void> {
    const user = this.getStoredUser();
    if (user) {
      const now = Date.now();
      user.lastSeenAt = now;

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        this.cachedUser = user;

        // Async sync to Supabase (fire and forget)
        const { supabase, isSupabaseConfigured } = await import('../Supabase');
        if (
          isSupabaseConfigured() &&
          supabase &&
          window.location.hostname !== 'localhost' &&
          window.location.hostname !== '127.0.0.1'
        ) {
          void supabase.rpc('update_player_last_seen', {
            p_player_id: user.playerId,
          });
        }
      } catch (error) {
        Logger.error('[UserSession] Failed to update lastSeenAt', error);
      }
    }
  }

  /**
   * Clear user data from storage (logout/debug).
   */
  static clearUser(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.cachedUser = null;
    Logger.info('[UserSession] User identity cleared');
  }

  /**
   * Reset for testing purposes.
   */
  static resetForTesting(): void {
    this.cachedUser = null;
    localStorage.clear();
  }
}
