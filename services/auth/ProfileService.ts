/**
 * ProfileService - Handles player profile management, validation, and persistence
 *
 * This service ensures that player profiles are:
 * - Properly created and linked to authentication providers
 * - Validated on each session
 * - Synchronized with Supabase
 */

import { supabase, isSupabaseConfigured } from '../core/Supabase';
import { Logger } from '../system/Logger';

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
    // Check if Supabase is configured
    if (!isSupabaseConfigured() || !supabase) {
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

      // Check if profile exists using auth_user_id (modern auth flow)
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        Logger.error('[ProfileService] Error fetching profile:', fetchError);
        return { isValid: false, error: 'Failed to fetch profile' };
      }

      if (existingProfile) {
        // Profile exists - validate and update last seen
        this.currentProfile = this.mapToPlayerProfile(existingProfile, user);

        await supabase
          .from('profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('auth_user_id', user.id);

        this.isInitialized = true;
        Logger.info(
          '[ProfileService] Profile loaded:',
          this.currentProfile.displayName
        );
        return { isValid: true, profile: this.currentProfile };
      }

      // No profile exists - check if we have enough info to create one
      const suggestedNickname = this.extractNickname(user);

      if (suggestedNickname) {
        // Auto-create profile for OAuth users with displayName
        const createResult = await this.createProfile({
          userId: user.id,
          displayName: suggestedNickname,
          avatarUrl: user.user_metadata?.avatar_url as string | undefined,
          email: user.email ?? undefined,
          emailVerified: !!user.email_confirmed_at,
          authProvider: user.app_metadata?.provider ?? 'email',
        });

        if (createResult.isValid) {
          this.isInitialized = true;
          return createResult;
        }
      }

      // Need user to provide nickname
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
    if (!supabase) {
      return { isValid: false, error: 'Backend not configured' };
    }

    try {
      // Validate nickname uniqueness
      const { data: existingNickname } = await supabase
        .from('profiles')
        .select('id')
        .eq('display_name', params.displayName)
        .maybeSingle();

      if (existingNickname) {
        return { isValid: false, error: 'Nickname already taken' };
      }

      // Create profile with auth_user_id and OAuth data
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          // id is auto-generated UUID
          auth_user_id: params.userId,
          display_name: params.displayName,
          avatar_url: params.avatarUrl,
          email: params.email,
          email_verified: params.emailVerified ?? false,
          primary_auth_provider: params.authProvider ?? 'email',
          last_seen_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        Logger.error('[ProfileService] Profile creation error:', createError);
        return { isValid: false, error: 'Failed to create profile' };
      }

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
      Logger.error('[ProfileService] Create profile error:', error);
      return { isValid: false, error: 'Profile creation failed' };
    }
  }

  /**
   * Validate current session and profile
   */
  async validateSession(): Promise<ProfileValidationResult> {
    if (!supabase) {
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

      // Verify profile still exists in DB
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, is_banned')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!profile) {
        this.currentProfile = null;
        return { isValid: false, error: 'Profile not found' };
      }

      if (profile.is_banned) {
        this.currentProfile = null;
        return { isValid: false, error: 'Account is banned' };
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
    if (!this.currentProfile || !supabase) {
      return { isValid: false, error: 'No profile loaded' };
    }

    try {
      // Check uniqueness
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('display_name', newDisplayName)
        .neq('id', this.currentProfile.id)
        .maybeSingle();

      if (existing) {
        return { isValid: false, error: 'Display name already taken' };
      }

      const { error } = await supabase
        .from('profiles')
        .update({ display_name: newDisplayName })
        .eq('id', this.currentProfile.id);

      if (error) {
        return { isValid: false, error: 'Failed to update display name' };
      }

      this.currentProfile.displayName = newDisplayName;
      return { isValid: true, profile: this.currentProfile };
    } catch (error) {
      Logger.error('[ProfileService] Update display name error:', error);
      return { isValid: false, error: 'Display name update failed' };
    }
  }

  /**
   * Link a legacy nickname profile to an authenticated user
   * This allows existing anonymous players to "upgrade" their account
   */
  async linkLegacyProfile(legacyProfileId: string): Promise<ProfileValidationResult> {
    if (!supabase) {
      return { isValid: false, error: 'Backend not configured' };
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { isValid: false, error: 'Not authenticated' };
      }

      // Check if user already has a linked profile
      const { data: existingLink } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (existingLink) {
        return { isValid: false, error: 'Account already has a linked profile' };
      }

      // Get the legacy profile
      const { data: legacyProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', legacyProfileId)
        .is('auth_user_id', null)
        .maybeSingle();

      if (fetchError || !legacyProfile) {
        return { isValid: false, error: 'Legacy profile not found or already linked' };
      }

      // Link the profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          auth_user_id: user.id,
          email: user.email,
          email_verified: !!user.email_confirmed_at,
          primary_auth_provider: user.app_metadata?.provider ?? 'email',
          avatar_url: legacyProfile.avatar_url || user.user_metadata?.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', legacyProfileId);

      if (updateError) {
        Logger.error('[ProfileService] Link legacy profile error:', updateError);
        return { isValid: false, error: 'Failed to link profile' };
      }

      // Refresh profile
      const result = await this.initialize();
      Logger.info('[ProfileService] Legacy profile linked:', legacyProfileId);
      return result;
    } catch (error) {
      Logger.error('[ProfileService] Link legacy profile error:', error);
      return { isValid: false, error: 'Profile linking failed' };
    }
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
  private extractNickname(user: {
    user_metadata?: {
      full_name?: string;
      name?: string;
      preferred_username?: string;
      user_name?: string;
    };
  }): string | null {
    const metadata = user.user_metadata;
    if (!metadata) return null;

    // Try various common username fields from OAuth providers
    return (
      metadata.preferred_username ??
      metadata.user_name ??
      metadata.name ??
      metadata.full_name ??
      null
    );
  }

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
    dbProfile: {
      id: string;
      auth_user_id?: string | null;
      display_name: string;
      username?: string | null;
      email?: string | null;
      email_verified?: boolean | null;
      avatar_url?: string | null;
      high_score?: number | null;
      level?: number | null;
      xp?: number | null;
      is_banned?: boolean | null;
      is_tester?: boolean | null;
      total_sessions?: number | null;
      created_at?: string | null;
      last_seen_at?: string | null;
      primary_auth_provider?: string | null;
    },
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
      displayName: dbProfile.display_name,
      username: dbProfile.username ?? undefined,
      email: dbProfile.email ?? undefined,
      emailVerified: dbProfile.email_verified ?? false,
      avatarUrl: dbProfile.avatar_url ?? undefined,
      highScore: dbProfile.high_score ?? 0,
      level: dbProfile.level ?? 1,
      xp: dbProfile.xp ?? 0,
      isBanned: dbProfile.is_banned ?? false,
      isTester: dbProfile.is_tester ?? false,
      totalSessions: dbProfile.total_sessions ?? 0,
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
