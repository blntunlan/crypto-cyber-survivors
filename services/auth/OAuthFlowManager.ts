/**
 * OAuthFlowManager - Handles OAuth sign-in, provider linking, and provider queries.
 */

import { supabase, isSupabaseConfigured } from '../supabase/client';
import { Logger } from '../system/Logger';
import type { Provider, User } from '@supabase/supabase-js';
import type { AuthProvider, OAuthOptions } from './SupabaseAuthService';

/** Default scopes per OAuth provider */
const DEFAULT_SCOPES: Record<AuthProvider, string> = {
  twitter: 'tweet.read users.read',
  google: 'email profile',
  discord: 'identify email',
  github: 'read:user user:email',
  apple: 'email name',
  twitch: 'user:read:email',
};

export class OAuthFlowManager {
  /**
   * Sign in with an OAuth provider (redirects to provider login page).
   */
  async signInWithOAuth(
    options: OAuthOptions
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Auth service not configured' };
    }

    const { provider, redirectTo, scopes } = options;

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as Provider,
        options: {
          redirectTo: redirectTo ?? `${window.location.origin}/auth/callback`,
          scopes: scopes ?? DEFAULT_SCOPES[provider],
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
   * Link additional OAuth provider to existing account.
   */
  async linkOAuthProvider(
    provider: AuthProvider,
    currentUser: User | null
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Auth service not configured' };
    }

    if (!currentUser) {
      return { success: false, error: 'Must be signed in to link providers' };
    }

    // For now, linking is done by signing in with the provider
    // Supabase will automatically link if the email matches
    return this.signInWithOAuth({ provider });
  }

  /**
   * Get list of linked OAuth providers for a user.
   */
  async getLinkedProviders(user: User | null): Promise<AuthProvider[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      if (!user) return [];

      const identities = user.identities ?? [];

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
   * Unlink an OAuth provider from current user.
   * Note: Supabase doesn't directly support unlinking, so this is limited.
   */
  async unlinkProvider(
    _provider: AuthProvider
  ): Promise<{ success: boolean; error?: string }> {
    Logger.warn('[SupabaseAuth] Unlink provider not fully implemented yet');
    return {
      success: false,
      error: 'Provider unlinking requires backend implementation',
    };
  }
}
