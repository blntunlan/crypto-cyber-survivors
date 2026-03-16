/**
 * ProfileService - Handles player profile management, validation, and persistence
 *
 * This service ensures that player profiles are:
 * - Properly created and linked to authentication providers
 * - Validated on each session
 * - Synchronized with Railway API
 */

import { supabase, isSupabaseConfigured } from '../supabase/client';
import { railwayClient } from '../api/RailwayClient';
import { Logger } from '../system/Logger';

interface DBProfile {
  id: string;
  auth_user_id?: string | null;
  nickname?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  wallet_address?: string | null;
  primary_auth_provider?: string | null;
  last_seen_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PlayerProfile {
  id: string;
  authUserId?: string;
  displayName: string;
  username?: string;
  email?: string;
  emailVerified?: boolean;
  avatarUrl?: string;
  highScore: number;
  level: number;
  xp: number;
  isBanned: boolean;
  isTester: boolean;
  totalSessions: number;
  createdAt: string;
  lastSeenAt: string;
  // Auth metadata (from identities table or metadata)
  authProvider?: string;
  isVerified: boolean;
}

export interface ProfileValidationResult {
  isValid: boolean;
  profile?: PlayerProfile;
  error?: string;
  needsNickname?: boolean;
}

export class ProfileService {
  private static instance: ProfileService | null = null;
  private currentProfile: PlayerProfile | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): ProfileService {
    ProfileService.instance ??= new ProfileService();
    return ProfileService.instance;
  }

  /**
   * Initialize and validate the current user's profile
   */
  async initialize(): Promise<ProfileValidationResult> {
    // Check if Supabase Auth is configured
    if (!isSupabaseConfigured()) {
      Logger.warn('[ProfileService] Supabase not configured');
      return { isValid: false, error: 'Backend not configured' };
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Logger.info('[ProfileService] No authenticated user found');
        return { isValid: false, error: 'Not authenticated' };
      }

      // Fetch profile from Railway API
      try {
        const profile = await railwayClient.get<DBProfile>('/api/v1/profile');
        if (profile) {
          this.currentProfile = this.mapToPlayerProfile(profile, user);

          // Update last_seen_at
          await railwayClient.patch('/api/v1/profile', {}).catch(() => {});

          this.isInitialized = true;
          Logger.info(
            '[ProfileService] Profile loaded:',
            this.currentProfile.displayName
          );
          return { isValid: true, profile: this.currentProfile };
        }
      } catch {
        // Profile not found — new user flow
      }

      // NEW USER FLOW: No existing profile found, force nickname creation
      Logger.info('[ProfileService] No profile found, forcing nickname screen');
      return {
        isValid: false,
        needsNickname: true,
        error: 'Profile needs to be created',
      };
    } catch (error) {
      Logger.error('[ProfileService] Initialization error:', error);
      return { isValid: false, error: 'Profile initialization failed' };
    }
  }

  /**
   * Create a new player profile
   */
  async createProfile(params: {
    userId: string;
    displayName: string;
    avatarUrl?: string;
    email?: string;
    emailVerified?: boolean;
    authProvider?: string;
  }): Promise<ProfileValidationResult> {
    if (!isSupabaseConfigured()) {
      return { isValid: false, error: 'Backend not configured' };
    }

    try {
      const newProfile = await railwayClient.post<DBProfile>('/api/v1/profile', {
        nickname: params.displayName,
        avatar_url: params.avatarUrl,
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { isValid: false, error: 'User not found' };
      }

      this.currentProfile = this.mapToPlayerProfile(newProfile, user);
      this.isInitialized = true;

      Logger.info('[ProfileService] Profile created:', this.currentProfile.displayName);
      return { isValid: true, profile: this.currentProfile };
    } catch (error) {
      // Check for nickname conflict
      if (error instanceof Error && error.message.includes('409')) {
        return { isValid: false, error: 'Nickname already taken' };
      }
      Logger.error('[ProfileService] Create profile error:', error);
      return { isValid: false, error: 'Profile creation failed' };
    }
  }

  /**
   * Validate current session and profile
   */
  async validateSession(): Promise<ProfileValidationResult> {
    if (!isSupabaseConfigured()) {
      return { isValid: false, error: 'Backend not configured' };
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        this.currentProfile = null;
        return { isValid: false, error: 'No active session' };
      }

      // Re-validate profile
      if (!this.currentProfile || !this.isInitialized) {
        return await this.initialize();
      }

      // Verify profile still exists via Railway API
      try {
        await railwayClient.get<DBProfile>('/api/v1/profile');
      } catch {
        this.currentProfile = null;
        return { isValid: false, error: 'Profile not found' };
      }

      return { isValid: true, profile: this.currentProfile };
    } catch (error) {
      Logger.error('[ProfileService] Session validation error:', error);
      return { isValid: false, error: 'Session validation failed' };
    }
  }

  /**
   * Get current profile (cached)
   */
  getProfile(): PlayerProfile | null {
    return this.currentProfile;
  }

  /**
   * Update profile display name
   */
  async updateDisplayName(newDisplayName: string): Promise<ProfileValidationResult> {
    if (!this.currentProfile) {
      return { isValid: false, error: 'No profile loaded' };
    }

    try {
      await railwayClient.patch('/api/v1/profile', {
        nickname: newDisplayName,
      });

      this.currentProfile.displayName = newDisplayName;
      return { isValid: true, profile: this.currentProfile };
    } catch (error) {
      if (error instanceof Error && error.message.includes('409')) {
        return { isValid: false, error: 'Display name already taken' };
      }
      Logger.error('[ProfileService] Update display name error:', error);
      return { isValid: false, error: 'Display name update failed' };
    }
  }

  /**
   * Link a legacy nickname profile to an authenticated user
   */
  async linkLegacyProfile(_legacyProfileId: string): Promise<ProfileValidationResult> {
    // Legacy profile linking is handled server-side during profile creation
    // Re-initialize to pick up any linked profile
    return this.initialize();
  }

  /**
   * Clear profile (on logout)
   */
  clearProfile(): void {
    this.currentProfile = null;
    this.isInitialized = false;
    Logger.info('[ProfileService] Profile cleared');
  }

  /**
   * Check if user is authenticated with a verified provider
   */
  isVerifiedAuth(): boolean {
    return this.currentProfile?.isVerified ?? false;
  }

  // Private helper methods
  private extractAuthProvider(user: {
    app_metadata?: { provider?: string };
    user_metadata?: { wallet_address?: string };
  }): string {
    if (user.user_metadata?.wallet_address) {
      return 'phantom';
    }
    return user.app_metadata?.provider ?? 'anonymous';
  }

  private mapToPlayerProfile(
    dbProfile: DBProfile,
    user: {
      id: string;
      app_metadata?: { provider?: string };
      user_metadata?: { wallet_address?: string };
    }
  ): PlayerProfile {
    const authProvider =
      dbProfile.primary_auth_provider ?? this.extractAuthProvider(user);
    return {
      id: dbProfile.id,
      authUserId: dbProfile.auth_user_id ?? undefined,
      displayName: dbProfile.display_name ?? dbProfile.nickname ?? 'Player',
      avatarUrl: dbProfile.avatar_url ?? undefined,
      highScore: 0,
      level: 1,
      xp: 0,
      isBanned: false,
      isTester: false,
      totalSessions: 0,
      createdAt: dbProfile.created_at ?? new Date().toISOString(),
      lastSeenAt: dbProfile.last_seen_at ?? new Date().toISOString(),
      authProvider,
      isVerified: authProvider !== 'anonymous' && authProvider !== 'nickname',
    };
  }

  // Testing support
  static resetInstance(): void {
    ProfileService.instance = null;
  }
}

// Export singleton getter for convenience
export const profileService = ProfileService.getInstance();
