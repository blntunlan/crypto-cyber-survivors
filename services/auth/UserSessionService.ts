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
import { SupabaseAuthService } from './SupabaseAuthService';
import { railwayClient } from '../api/RailwayClient';

export class UserSessionService {
  private static instance: UserSessionService | null = null;

  private constructor() {}

  public static getInstance(): UserSessionService {
    return (UserSessionService.instance ??= new UserSessionService());
  }

  /**
   * Check if a user is already stored.
   */
  hasLegacyStoredUser(): boolean {
    return UserPersistenceService.getLegacyStoredUser() !== null;
  }

  static hasLegacyStoredUser(): boolean {
    return this.getInstance().hasLegacyStoredUser();
  }

  /**
   * Get the stored user data.
   */
  getLegacyStoredUser(): LegacyStoredUser | null {
    return UserPersistenceService.getLegacyStoredUser();
  }

  static getLegacyStoredUser(): LegacyStoredUser | null {
    return this.getInstance().getLegacyStoredUser();
  }

  /**
   * Get the profile ID for metrics tracking.
   * If no user is stored, returns a temporary anonymous ID.
   */
  getProfileId(): string {
    const user = this.getLegacyStoredUser();
    if (user) return user.profileId;

    // Return a temporary ID if not logged in (for pre-login metrics)
    return 'anon_' + nanoid(10);
  }

  static getProfileId(): string {
    return this.getInstance().getProfileId();
  }

  /**
   * Get the player's nickname.
   */
  getNickname(): string | null {
    const user = this.getLegacyStoredUser();
    return user ? user.nickname : null;
  }

  static getNickname(): string | null {
    return this.getInstance().getNickname();
  }

  /**
   * Save a new user to storage after successful registration/login.
   */
  saveUser(profileId: string, nickname: string): void {
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

  static saveUser(profileId: string, nickname: string): void {
    this.getInstance().saveUser(profileId, nickname);
  }

  /**
   * Register a new nickname in Supabase and save to local storage.
   */
  async registerNickname(
    nickname: string
  ): Promise<{ success: boolean; error?: string }> {
    const { isSupabaseConfigured } = await import('../core/Supabase');

    if (!isSupabaseConfigured() || SecurityUtils.isLocalEnvironment()) {
      Logger.warn('[UserSession] Local environment detected, using local-only mode');
      const mockProfileId = '00000000-0000-4000-a000-000000000000';
      this.saveUser(mockProfileId, nickname);

      // Clear any existing Supabase session to prevent 401 errors from stale tokens on local
      const { supabase } = await import('../core/Supabase');
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (supabase?.auth) {
        void supabase.auth.signOut().catch(() => {});
      }

      return { success: true };
    }

    try {
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

  static async registerNickname(
    nickname: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.getInstance().registerNickname(nickname);
  }

  /**
   * Update the last seen timestamp in storage and optionally Supabase.
   */
  async updateLastSeen(): Promise<void> {
    const user = this.getLegacyStoredUser();
    if (user) {
      const now = Date.now();
      const updatedUser = { ...user, lastSeenAt: now };

      UserPersistenceService.saveUser(updatedUser);

      if (!SecurityUtils.isLocalEnvironment()) {
        try {
          await railwayClient.patch('/api/v1/profile', {});
        } catch (err) {
          Logger.error('[UserSession] Profile update exception:', err);
        }
      }
    }
  }

  static async updateLastSeen(): Promise<void> {
    return this.getInstance().updateLastSeen();
  }

  /**
   * Clear user data from storage (logout/debug).
   */
  clearUser(): void {
    UserPersistenceService.clear();
  }

  static clearUser(): void {
    this.getInstance().clearUser();
  }

  /**
   * Reset for testing purposes.
   */
  resetForTesting(): void {
    UserPersistenceService.clear();
  }

  static resetForTesting(): void {
    this.instance = null!; // Reset singleton
    UserPersistenceService.clear();
  }
}
