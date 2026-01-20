/**
 * UserSessionService - Manages player identity and session state.
 *
 * Handles localStorage persistence for the player's identity and
 * provides accessors for player information across the application.
 */

import { Logger } from '../Logger';
import { type StoredUser } from './types';
import { nanoid } from 'nanoid';
import { UserPersistenceService } from './UserPersistenceService';

export class UserSessionService {
  /**
   * Check if a user is already stored.
   */
  static hasStoredUser(): boolean {
    return UserPersistenceService.getStoredUser() !== null;
  }

  /**
   * Get the stored user data.
   */
  static getStoredUser(): StoredUser | null {
    return UserPersistenceService.getStoredUser();
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

    UserPersistenceService.saveUser(user);
    Logger.info(`[UserSession] User saved: ${nickname} (${playerId})`);
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
      Logger.warn('[UserSession] Local environment detected, using local-only mode');
      const mockPlayerId = '00000000-0000-4000-a000-000000000000';
      this.saveUser(mockPlayerId, nickname);
      return { success: true };
    }

    try {
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .ilike('display_name', nickname)
        .single();

      if (existingPlayer) {
        this.saveUser(existingPlayer.id, nickname);
        await supabase.rpc('update_player_last_seen', {
          p_player_id: existingPlayer.id,
        });
        return { success: true };
      }

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
      const updatedUser = { ...user, lastSeenAt: now };

      UserPersistenceService.saveUser(updatedUser);

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
    }
  }

  /**
   * Clear user data from storage (logout/debug).
   */
  static clearUser(): void {
    UserPersistenceService.clear();
  }

  /**
   * Reset for testing purposes.
   */
  static resetForTesting(): void {
    UserPersistenceService.clear();
  }
}
