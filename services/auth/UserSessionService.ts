/**
 * UserSessionService - Manages player identity and session state.
 *
 * Handles localStorage persistence for the player's identity and
 * provides accessors for player information across the application.
 */

import { Logger } from '../system/Logger';
import { type LegacyStoredUser } from './types';
import { nanoid } from 'nanoid';
import { UserPersistenceService } from './UserPersistenceService';
import { SecurityUtils } from './SecurityUtils';

export class UserSessionService {
  /**
   * Check if a user is already stored.
   */
  static hasLegacyStoredUser(): boolean {
    return UserPersistenceService.getLegacyStoredUser() !== null;
  }

  /**
   * Get the stored user data.
   */
  static getLegacyStoredUser(): LegacyStoredUser | null {
    return UserPersistenceService.getLegacyStoredUser();
  }

  /**
   * Get the profile ID for metrics tracking.
   * If no user is stored, returns a temporary anonymous ID.
   */
  static getProfileId(): string {
    const user = this.getLegacyStoredUser();
    if (user) return user.profileId;

    // Return a temporary ID if not logged in (for pre-login metrics)
    return 'anon_' + nanoid(10);
  }

  /**
   * Get the player's nickname.
   */
  static getNickname(): string | null {
    const user = this.getLegacyStoredUser();
    return user ? user.nickname : null;
  }

  /**
   * Save a new user to storage after successful registration/login.
   */
  static saveUser(profileId: string, nickname: string): void {
    const now = Date.now();
    const user: LegacyStoredUser = {
      profileId,
      nickname,
      createdAt: now,
      lastSeenAt: now,
    };

    UserPersistenceService.saveUser(user);
    Logger.info(`[UserSession] User saved: ${nickname} (${profileId})`);
  }

  /**
   * Register a new nickname in Supabase and save to local storage.
   */
  static async registerNickname(
    nickname: string
  ): Promise<{ success: boolean; error?: string }> {
    const { supabase, isSupabaseConfigured } = await import('../core/Supabase');

    if (!isSupabaseConfigured() || !supabase || SecurityUtils.isLocalEnvironment()) {
      Logger.warn('[UserSession] Local environment detected, using local-only mode');
      const mockProfileId = '00000000-0000-4000-a000-000000000000';
      this.saveUser(mockProfileId, nickname);
      return { success: true };
    }

    try {
      const { SupabaseAuthService } = await import('./SupabaseAuthService');

      // Use Anonymous Sign-In for production
      // This creates a proper auth user and triggers the profile creation via database triggers
      const result = await SupabaseAuthService.signInAnonymously(nickname);

      if (result.success && result.user) {
        this.saveUser(result.user.id, nickname);
        return { success: true };
      }

      return {
        success: false,
        error: result.error ?? 'Failed to register nickname',
      };
    } catch (error) {
      Logger.error('[UserSession] Registration error', error);
      return { success: false, error: 'Connection error. Please try again.' };
    }
  }

  /**
   * Update the last seen timestamp in storage and optionally Supabase.
   */
  static async updateLastSeen(): Promise<void> {
    const user = this.getLegacyStoredUser();
    if (user) {
      const now = Date.now();
      const updatedUser = { ...user, lastSeenAt: now };

      UserPersistenceService.saveUser(updatedUser);

      const { supabase, isSupabaseConfigured } = await import('../core/Supabase');
      if (isSupabaseConfigured() && supabase && !SecurityUtils.isLocalEnvironment()) {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', user.profileId);

          if (error) {
            Logger.error('[UserSession] Failed to update profile last seen:', error);
          }
        } catch (err) {
          Logger.error('[UserSession] Profile update exception:', err);
        }
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
