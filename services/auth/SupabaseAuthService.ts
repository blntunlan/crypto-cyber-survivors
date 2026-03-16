/**
 * SupabaseAuthService - Unified authentication service for Supabase
 *
 * Supports:
 * - Email/Password authentication
 * - OAuth providers (Twitter, Google, Discord, GitHub, Apple, Twitch)
 * - Magic Link (passwordless)
 * - Password reset flow
 * - Session management
 * - Profile synchronization
 *
 * @see https://supabase.com/docs/guides/auth
 */

import { supabase, isSupabaseConfigured } from '../supabase/client';
import { Logger } from '../system/Logger';
import { EventBus } from '../core/EventBus';
import type { AuthChangeEvent, Session, User, Provider } from '@supabase/supabase-js';

// ============================================
// Types
// ============================================

export interface AuthResult {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
  needsEmailConfirmation?: boolean;
}

export interface ProfileData {
  id: string;
  authUserId: string | null;
  email: string | null;
  emailVerified: boolean;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  level: number;
  xp: number;
  isTester: boolean;
  isBanned: boolean;
  primaryAuthProvider: string;
  createdAt: string;
  lastSeenAt: string;
  updatedAt: string;
}

export type AuthProvider =
  | 'twitter'
  | 'google'
  | 'discord'
  | 'github'
  | 'apple'
  | 'twitch';

export interface SignUpOptions {
  email: string;
  password: string;
  displayName?: string;
  redirectTo?: string;
}

export interface SignInOptions {
  email: string;
  password: string;
}

export interface OAuthOptions {
  provider: AuthProvider;
  redirectTo?: string;
  scopes?: string;
}

// ============================================
// Service Class
// ============================================

class SupabaseAuthServiceClass {
  private static instance: SupabaseAuthServiceClass | null = null;
  private unsubscribe: (() => void) | null = null;

  static getInstance(): SupabaseAuthServiceClass {
    return (SupabaseAuthServiceClass.instance ??= new SupabaseAuthServiceClass());
  }

  // ============================================
  // Initialization
  // ============================================

  /**
   * Initialize auth state listener
   * Call this once when app starts
   */
  initialize(): void {
    if (!isSupabaseConfigured()) {
      Logger.warn('[SupabaseAuth] Not configured - auth features disabled');
      return;
    }

    // Set up auth state listener
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      this.handleAuthStateChange(event, session);
    });

    this.unsubscribe = () => data.subscription.unsubscribe();

    Logger.info('[SupabaseAuth] Initialized and listening for auth changes');
  }

  /**
   * Handle auth state changes
   */
  private handleAuthStateChange(event: AuthChangeEvent, session: Session | null): void {
    Logger.info(`[SupabaseAuth] Auth state changed: ${event}`);

    switch (event) {
      case 'SIGNED_IN':
        EventBus.emit('authStateChanged', {
          type: 'signIn',
          user: session?.user ?? null,
          session,
        });
        if (session?.user) {
          void this.updateLastSeen(session.user.id).catch(err =>
            Logger.error('[SupabaseAuth] Failed to update last seen:', err)
          );
        }

        break;

      case 'SIGNED_OUT':
        EventBus.emit('authStateChanged', {
          type: 'signOut',
          user: null,
          session: null,
        });
        break;

      case 'TOKEN_REFRESHED':
        EventBus.emit('authStateChanged', {
          type: 'tokenRefreshed',
          user: session?.user ?? null,
          session,
        });
        break;

      case 'USER_UPDATED':
        EventBus.emit('authStateChanged', {
          type: 'userUpdated',
          user: session?.user ?? null,
          session,
        });
        break;

      case 'PASSWORD_RECOVERY':
        EventBus.emit('authStateChanged', {
          type: 'passwordRecovery',
          user: session?.user ?? null,
          session,
        });
        break;
    }
  }

  // ============================================
  // Email/Password Authentication
  // ============================================

  /**
   * Sign up with email and password
   */
  async signUp(options: SignUpOptions): Promise<AuthResult> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Auth service not configured' };
    }

    const { email, password, displayName, redirectTo } = options;

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: displayName ?? email.split('@')[0],
            display_name: displayName ?? email.split('@')[0],
          },
          emailRedirectTo: redirectTo ?? `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        Logger.error('[SupabaseAuth] SignUp error:', error);
        return { success: false, error: this.mapAuthError(error.message) };
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        Logger.info('[SupabaseAuth] Email confirmation required');
        return {
          success: true,
          user: data.user,
          needsEmailConfirmation: true,
        };
      }

      if (data.session && data.user) {
        Logger.info('[SupabaseAuth] SignUp successful');
        return {
          success: true,
          user: data.user,
          session: data.session,
        };
      }

      return { success: false, error: 'Unknown error during signup' };
    } catch (err) {
      Logger.error('[SupabaseAuth] SignUp exception:', err);
      return { success: false, error: 'Connection error' };
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(options: SignInOptions): Promise<AuthResult> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Auth service not configured' };
    }

    const { email, password } = options;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Logger.error('[SupabaseAuth] SignIn error:', error);
        return { success: false, error: this.mapAuthError(error.message) };
      }

      Logger.info('[SupabaseAuth] SignIn successful');
      return {
        success: true,
        user: data.user as User,
        session: data.session as Session,
      };
    } catch (err) {
      Logger.error('[SupabaseAuth] SignIn exception:', err);
      return { success: false, error: 'Connection error' };
    }
  }

  /**
   * Sign in anonymously (for nickname-only access)
   * This creates a real Supabase user but without email/password
   */
  async signInAnonymously(nickname: string): Promise<AuthResult> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Auth service not configured' };
    }

    try {
      const { data, error } = await supabase.auth.signInAnonymously({
        options: {
          data: {
            display_name: nickname,
            name: nickname,
          },
        },
      });

      if (error) {
        Logger.error('[SupabaseAuth] Anonymous SignIn error:', error);
        return { success: false, error: this.mapAuthError(error.message) };
      }

      Logger.info('[SupabaseAuth] Anonymous SignIn successful');
      return {
        success: true,
        user: data.user as User,
        session: data.session as Session,
      };
    } catch (err) {
      Logger.error('[SupabaseAuth] Anonymous SignIn exception:', err);
      return { success: false, error: 'Connection error' };
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Auth service not configured' };
    }

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        Logger.error('[SupabaseAuth] SignOut error:', error);
        return { success: false, error: error.message };
      }

      Logger.info('[SupabaseAuth] SignOut successful');
      return { success: true };
    } catch (err) {
      Logger.error('[SupabaseAuth] SignOut exception:', err);
      return { success: false, error: 'Failed to sign out' };
    }
  }

  // ============================================
  // OAuth Authentication
  // ============================================

  /**
   * Sign in with OAuth provider
   * This will redirect the user to the provider's login page
   */
  async signInWithOAuth(
    options: OAuthOptions
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Auth service not configured' };
    }

    const { provider, redirectTo, scopes } = options;

    // Default scopes per provider
    const defaultScopes: Record<AuthProvider, string> = {
      twitter: 'tweet.read users.read',
      google: 'email profile',
      discord: 'identify email',
      github: 'read:user user:email',
      apple: 'email name',
      twitch: 'user:read:email',
    };

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as Provider,
        options: {
          redirectTo: redirectTo ?? `${window.location.origin}/auth/callback`,
          scopes: scopes ?? defaultScopes[provider],
        },
      });

      if (error) {
        Logger.error(`[SupabaseAuth] ${provider} OAuth error:`, error);
        return { success: false, error: error.message };
      }

      // OAuth redirects, so we won't reach here normally
      Logger.info(`[SupabaseAuth] Redirecting to ${provider} OAuth...`);
      return { success: true };
    } catch (err) {
      Logger.error(`[SupabaseAuth] ${provider} OAuth exception:`, err);
      return { success: false, error: 'OAuth failed' };
    }
  }

  /**
   * Link additional OAuth provider to existing account
   */
  async linkOAuthProvider(
    provider: AuthProvider
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Auth service not configured' };
    }

    const user = await this.getUser();
    if (!user) {
      return { success: false, error: 'Must be signed in to link providers' };
    }

    // For now, linking is done by signing in with the provider
    // Supabase will automatically link if the email matches
    return this.signInWithOAuth({ provider });
  }

  // ============================================
  // Magic Link (Passwordless)
  // ============================================

  /**
   * Send magic link to email
   */
  async sendMagicLink(
    email: string,
    redirectTo?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Auth service not configured' };
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo ?? `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        Logger.error('[SupabaseAuth] Magic link error:', error);
        return { success: false, error: this.mapAuthError(error.message) };
      }

      Logger.info('[SupabaseAuth] Magic link sent');
      return { success: true };
    } catch (err) {
      Logger.error('[SupabaseAuth] Magic link exception:', err);
      return { success: false, error: 'Failed to send magic link' };
    }
  }

  /**
   * Send OTP code to email (same as magic link but expects code verification)
   */
  async sendOtpCode(email: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Auth service not configured' };
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        Logger.error('[SupabaseAuth] Send OTP error:', error);
        return { success: false, error: this.mapAuthError(error.message) };
      }

      Logger.info('[SupabaseAuth] OTP code sent');
      return { success: true };
    } catch (err) {
      Logger.error('[SupabaseAuth] Send OTP exception:', err);
      return { success: false, error: 'Failed to send OTP code' };
    }
  }

  /**
   * Verify OTP code and create session
   */
  async verifyOtpCode(email: string, token: string): Promise<AuthResult> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Auth service not configured' };
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) {
        Logger.error('[SupabaseAuth] Verify OTP error:', error);
        return { success: false, error: this.mapAuthError(error.message) };
      }

      if (data.session && data.user) {
        Logger.info('[SupabaseAuth] OTP verification successful');
        return {
          success: true,
          user: data.user,
          session: data.session,
        };
      }

      return { success: false, error: 'Invalid or expired OTP code' };
    } catch (err) {
      Logger.error('[SupabaseAuth] Verify OTP exception:', err);
      return { success: false, error: 'Failed to verify OTP code' };
    }
  }

  // ============================================
  // Password Reset
  // ============================================

  /**
   * Send password reset email
   */
  async resetPassword(
    email: string,
    redirectTo?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Auth service not configured' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo ?? `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        Logger.error('[SupabaseAuth] Reset password error:', error);
        return { success: false, error: this.mapAuthError(error.message) };
      }

      Logger.info('[SupabaseAuth] Password reset email sent');
      return { success: true };
    } catch (err) {
      Logger.error('[SupabaseAuth] Reset password exception:', err);
      return { success: false, error: 'Failed to send reset email' };
    }
  }

  /**
   * Update password (after reset or while logged in)
   */
  async updatePassword(
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Auth service not configured' };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        Logger.error('[SupabaseAuth] Update password error:', error);
        return { success: false, error: this.mapAuthError(error.message) };
      }

      Logger.info('[SupabaseAuth] Password updated');
      return { success: true };
    } catch (err) {
      Logger.error('[SupabaseAuth] Update password exception:', err);
      return { success: false, error: 'Failed to update password' };
    }
  }

  // ============================================
  // Session Management
  // ============================================

  /**
   * Get current session
   */
  async getSession(): Promise<Session | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data } = await supabase.auth.getSession();
      return data.session;
    } catch {
      return null;
    }
  }

  /**
   * Get current authenticated user
   */
  async getUser(): Promise<User | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data } = await supabase.auth.getUser();
      return data.user;
    } catch {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return session !== null;
  }

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<{
    success: boolean;
    session?: Session;
    error?: string;
  }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Auth service not configured' };
    }

    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, session: data.session ?? undefined };
    } catch (err) {
      Logger.error('[SupabaseAuth] Refresh session exception:', err);
      return { success: false, error: 'Failed to refresh session' };
    }
  }

  // ============================================
  // Profile Management
  // ============================================

  /**
   * Get current user's profile from profiles table
   */
  async getProfile(): Promise<ProfileData | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const user = await this.getUser();
      if (!user) return null;

      // Direct query to profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (profileError) return null;

      return this.mapProfileData(profileData as Record<string, unknown>);
    } catch {
      return null;
    }
  }

  /**
   * Update current user's profile
   */
  async updateProfile(updates: {
    displayName?: string;
    username?: string;
    avatarUrl?: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Auth service not configured' };
    }

    try {
      const user = await this.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Validate username format and update directly
      if (updates.username) {
        // Username validation: 3-16 alphanumeric + underscore
        const usernameRegex = /^[a-zA-Z0-9_]{3,16}$/;
        if (!usernameRegex.test(updates.username)) {
          return {
            success: false,
            error: 'Username must be 3-16 alphanumeric characters or underscores',
          };
        }

        // Check if username is taken
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', updates.username)
          .neq('auth_user_id', user.id)
          .single();

        if (existing) {
          return { success: false, error: 'Username already taken' };
        }
      }

      // Direct update for fields
      const updateData: Record<string, unknown> = {};
      if (updates.displayName) updateData.display_name = updates.displayName;
      if (updates.avatarUrl) updateData.avatar_url = updates.avatarUrl;
      if (updates.username) updateData.username = updates.username;

      if (Object.keys(updateData).length > 1) {
        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('auth_user_id', user.id);

        if (error) {
          return { success: false, error: error.message };
        }
      }

      Logger.info('[SupabaseAuth] Profile updated');
      return { success: true };
    } catch (err) {
      Logger.error('[SupabaseAuth] Update profile exception:', err);
      return { success: false, error: 'Failed to update profile' };
    }
  }

  /**
   * Alias for getProfile - used by ProfileSettings component
   */
  async getCurrentProfile(): Promise<ProfileData | null> {
    return this.getProfile();
  }

  /**
   * Get list of linked OAuth providers for current user
   */
  async getLinkedProviders(): Promise<AuthProvider[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const user = await this.getUser();
      if (!user) return [];

      // Get identities from Supabase auth
      const identities = user.identities ?? [];

      // Map to AuthProvider type
      const providers: AuthProvider[] = identities
        .map(identity => identity.provider as AuthProvider)
        .filter(provider =>
          [
            'email',
            'twitter',
            'google',
            'discord',
            'github',
            'apple',
            'twitch',
          ].includes(provider)
        );

      return providers;
    } catch (err) {
      Logger.error('[SupabaseAuth] Get linked providers error:', err);
      return [];
    }
  }

  /**
   * Unlink an OAuth provider from current user
   * Note: Supabase doesn't directly support unlinking, so this is limited
   */
  async unlinkProvider(
    _provider: AuthProvider
  ): Promise<{ success: boolean; error?: string }> {
    // Supabase doesn't have a direct unlink API
    // This would require a custom Edge Function
    Logger.warn('[SupabaseAuth] Unlink provider not fully implemented yet');
    return {
      success: false,
      error: 'Provider unlinking requires backend implementation',
    };
  }

  /**
   * Update profile with linked profile data after OAuth callback
   */
  async updateProfileWithAuth(
    updates: Partial<ProfileData>
  ): Promise<{ success: boolean; profile?: ProfileData; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Auth service not configured' };
    }

    try {
      const user = await this.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const updateData: Record<string, unknown> = {};
      if (updates.displayName) updateData.display_name = updates.displayName;
      if (updates.avatarUrl) updateData.avatar_url = updates.avatarUrl;
      if (updates.username) updateData.username = updates.username;
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('auth_user_id', user.id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      const profile = this.mapProfileData(data as Record<string, unknown>);
      return { success: true, profile };
    } catch (err) {
      Logger.error('[SupabaseAuth] Update profile with auth error:', err);
      return { success: false, error: 'Failed to update profile' };
    }
  }

  private mapProfileData(data: Record<string, unknown>): ProfileData {
    const id = data.id as string;
    const emailVerified = data.email_verified as boolean | undefined;
    const level = data.level as number | undefined;
    const xp = data.xp as number | undefined;
    const isTester = data.is_tester as boolean | undefined;
    const isBanned = data.is_banned as boolean | undefined;
    const primaryAuthProvider = data.primary_auth_provider as string | undefined;
    const updatedAt = data.updated_at as string | undefined;
    const createdAt = data.created_at as string;

    return {
      id,
      authUserId: data.auth_user_id as string | null,
      email: data.email as string | null,
      emailVerified: emailVerified ?? false,
      displayName: data.display_name as string,
      username: data.username as string | null,
      avatarUrl: data.avatar_url as string | null,
      level: level ?? 1,
      xp: xp ?? 0,
      isTester: isTester ?? false,
      isBanned: isBanned ?? false,
      primaryAuthProvider: primaryAuthProvider ?? 'email',
      createdAt,
      lastSeenAt: data.last_seen_at as string,
      updatedAt: updatedAt ?? createdAt,
    };
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Update last seen timestamp
   */
  private async updateLastSeen(_authUserId: string): Promise<void> {
    try {
      const { railwayClient } = await import('../api/RailwayClient');
      await railwayClient.patch('/api/v1/profile', {});
    } catch {
      // Silent fail - not critical
    }
  }

  /**
   * Map Supabase auth errors to user-friendly messages
   */
  private mapAuthError(message: string): string {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Email veya şifre hatalı',
      'Email not confirmed': 'Lütfen email adresinizi doğrulayın',
      'User already registered': 'Bu email zaten kayıtlı',
      'Password should be at least 6 characters': 'Şifre en az 6 karakter olmalı',
      'Unable to validate email address: invalid format': 'Geçersiz email formatı',
      'For security purposes, you can only request this once every 60 seconds':
        'Güvenlik nedeniyle 60 saniye beklemeniz gerekiyor',
      'Email rate limit exceeded': 'Çok fazla deneme yaptınız, lütfen bekleyin',
      'New password should be different from the old password':
        'Yeni şifre eskisinden farklı olmalı',
      'Auth session missing!': 'Oturum bulunamadı, lütfen tekrar giriş yapın',
    };

    return errorMap[message] ?? message;
  }

  // ============================================
  // Cleanup
  // ============================================

  /**
   * Dispose auth listener (call on app unmount)
   */
  dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Reset for testing
   */
  static resetInstance(): void {
    if (SupabaseAuthServiceClass.instance) {
      SupabaseAuthServiceClass.instance.dispose();
      SupabaseAuthServiceClass.instance = null;
    }
  }
}

// Export singleton instance
export const SupabaseAuthService = SupabaseAuthServiceClass.getInstance();

// Export class for testing
export { SupabaseAuthServiceClass };
