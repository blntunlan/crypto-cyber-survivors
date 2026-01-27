/**
 * UserSessionService - Manages player identity and session state.
 *
 * Handles localStorage persistence for the player's identity and
 * provides accessors for player information across the application.
 */

import { Logger } from '../system/Logger';
import { type StoredUser } from './types';
import { nanoid } from 'nanoid';
import { UserPersistenceService } from './UserPersistenceService';
import { SecurityUtils } from './SecurityUtils';

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
   * Get the profile ID for metrics tracking.
   * If no user is stored, returns a temporary anonymous ID.
   */
  static getProfileId(): string {
    const user = this.getStoredUser();
    if (user) return user.profileId;

    // Return a temporary ID if not logged in (for pre-login metrics)
    return 'anon_' + nanoid(10);
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
  static saveUser(profileId: string, nickname: string): void {
    const now = Date.now();
    const user: StoredUser = {
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
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('display_name', nickname)
        .single();

      if (existingProfile) {
        this.saveUser(existingProfile.id, nickname);
        // Update last seen directly
        await supabase
          .from('profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', existingProfile.id);
        return { success: true };
      }

      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert({
          display_name: nickname,
          is_tester: true, // Auto-mark as tester in development/beta
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'Nickname already taken' };
        }
        throw error;
      }

      this.saveUser(newProfile.id, nickname);
      return { success: true };
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

      const { supabase, isSupabaseConfigured } = await import('../core/Supabase');
      if (isSupabaseConfigured() && supabase && !SecurityUtils.isLocalEnvironment()) {
        void supabase
          .from('profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', user.profileId);
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
