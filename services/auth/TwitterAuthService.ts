/**
 * TwitterAuthService - Handles Twitter OAuth 2.0 authentication
 *
 * Uses Twitter API v2 with PKCE flow for secure authentication.
 * Integrates with Supabase for identity linking.
 *
 * @see https://developer.twitter.com/en/docs/authentication/oauth-2-0
 */

import { Logger } from '../system/Logger';
import { isSupabaseConfigured } from '../supabase/client';
import { railwayClient } from '../api/RailwayClient';
import { UserSessionService } from './UserSessionService';
import { EventBus } from '../core/EventBus';

// Twitter OAuth 2.0 Configuration
interface TwitterAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

// Twitter User Profile from API
interface TwitterUserProfile {
  id: string;
  name: string;
  username: string; // @handle
  profile_image_url?: string;
  verified?: boolean;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
}

// Auth State for PKCE flow
interface AuthState {
  codeVerifier: string;
  state: string;
  timestamp: number;
}

const STORAGE_KEY = 'twitter_auth_state';
const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

class TwitterAuthServiceClass {
  private static instance: TwitterAuthServiceClass | null = null;

  private config: TwitterAuthConfig | null = null;

  static getInstance(): TwitterAuthServiceClass {
    return (TwitterAuthServiceClass.instance ??= new TwitterAuthServiceClass());
  }

  /**
   * Initialize Twitter Auth with configuration
   */
  initialize(): void {
    const clientId = import.meta.env.VITE_TWITTER_CLIENT_ID as string | undefined;
    const redirectUri = import.meta.env.VITE_TWITTER_REDIRECT_URI as string | undefined;

    if (!clientId) {
      Logger.warn(
        '[TwitterAuth] Missing VITE_TWITTER_CLIENT_ID - Twitter login disabled'
      );
      return;
    }

    this.config = {
      clientId,
      redirectUri: redirectUri ?? `${window.location.origin}/auth/twitter/callback`,
      scopes: ['tweet.read', 'users.read', 'offline.access'],
    };

    Logger.info(
      '[TwitterAuth] Initialized with redirect URI:',
      this.config.redirectUri
    );
  }

  /**
   * Check if Twitter Auth is configured
   */
  isConfigured(): boolean {
    return this.config !== null;
  }

  /**
   * Generate PKCE code verifier and challenge
   */
  private async generatePKCE(): Promise<{
    codeVerifier: string;
    codeChallenge: string;
  }> {
    // Generate random code verifier (43-128 chars)
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const codeVerifier = this.base64UrlEncode(array);

    // Generate code challenge (SHA256 hash of verifier)
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const codeChallenge = this.base64UrlEncode(new Uint8Array(digest));

    return { codeVerifier, codeChallenge };
  }

  /**
   * Base64 URL encode (RFC 4648)
   */
  private base64UrlEncode(buffer: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...buffer));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /**
   * Generate random state parameter
   */
  private generateState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return this.base64UrlEncode(array);
  }

  /**
   * Start Twitter OAuth flow - redirects user to Twitter
   */
  async startAuthFlow(): Promise<void> {
    if (!this.config) {
      Logger.error('[TwitterAuth] Not configured - call initialize() first');
      throw new Error('Twitter Auth not configured');
    }

    const { codeVerifier, codeChallenge } = await this.generatePKCE();
    const state = this.generateState();

    // Store auth state for callback verification
    const authState: AuthState = {
      codeVerifier,
      state,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(authState));

    // Build Twitter authorization URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;

    Logger.info('[TwitterAuth] Redirecting to Twitter authorization...');
    window.location.href = authUrl;
  }

  /**
   * Handle OAuth callback - exchange code for tokens
   */
  async handleCallback(
    code: string,
    state: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.config) {
      return { success: false, error: 'Twitter Auth not configured' };
    }

    // Retrieve and validate stored state
    const storedStateJson = sessionStorage.getItem(STORAGE_KEY);
    if (!storedStateJson) {
      return { success: false, error: 'No auth state found - session expired' };
    }

    const storedState: AuthState = JSON.parse(storedStateJson);
    sessionStorage.removeItem(STORAGE_KEY); // Clear after use

    // Validate state parameter
    if (state !== storedState.state) {
      Logger.error('[TwitterAuth] State mismatch - possible CSRF attack');
      return { success: false, error: 'Invalid state parameter' };
    }

    // Check expiry
    if (Date.now() - storedState.timestamp > STATE_EXPIRY_MS) {
      return { success: false, error: 'Auth session expired - please try again' };
    }

    try {
      // Exchange code for tokens via backend (to protect client secret)
      const tokenResponse = await this.exchangeCodeForTokens(
        code,
        storedState.codeVerifier
      );

      if (!tokenResponse.access_token) {
        return { success: false, error: 'Failed to obtain access token' };
      }

      // Fetch Twitter user profile
      const userProfile = await this.fetchUserProfile(tokenResponse.access_token);

      // Link Twitter identity to player profile
      await this.linkTwitterIdentity(userProfile, tokenResponse);

      EventBus.emit('twitterLoginSuccess', {
        username: userProfile.username,
        displayName: userProfile.name,
      });

      Logger.info(`[TwitterAuth] Successfully linked @${userProfile.username}`);
      return { success: true };
    } catch (error) {
      Logger.error('[TwitterAuth] Callback error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Exchange authorization code for tokens (via backend)
   */
  private async exchangeCodeForTokens(
    code: string,
    codeVerifier: string
  ): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }> {
    // Call backend endpoint to exchange code (protects client_secret)
    const response = await fetch('/api/auth/twitter/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        code_verifier: codeVerifier,
        redirect_uri: this.config!.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      let errorMsg = error.message ?? 'Token exchange failed';
      if (error && typeof error === 'object' && 'error' in error) {
        errorMsg = (error as { error: string }).error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMsg = (error as { message: string }).message;
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }

  /**
   * Fetch user profile from Twitter API
   */
  private async fetchUserProfile(accessToken: string): Promise<TwitterUserProfile> {
    const response = await fetch(
      'https://api.twitter.com/2/users/me?user.fields=profile_image_url,verified,public_metrics',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Twitter profile');
    }

    const { data } = await response.json();
    return data as TwitterUserProfile;
  }

  /**
   * Link Twitter identity to existing player profile in Supabase
   */
  private async linkTwitterIdentity(
    profile: TwitterUserProfile,
    _tokens: { access_token: string; refresh_token?: string }
  ): Promise<void> {
    if (!isSupabaseConfigured()) {
      Logger.warn('[TwitterAuth] Supabase not configured - storing locally only');
      // Store in local session for offline mode
      localStorage.setItem(
        'twitter_linked_profile',
        JSON.stringify({
          id: profile.id,
          username: profile.username,
          name: profile.name,
        })
      );
      return;
    }

    const currentUser = UserSessionService.getLegacyStoredUser();
    if (!currentUser) {
      Logger.error('[TwitterAuth] No logged-in user to link Twitter account');
      throw new Error('Please log in first before connecting Twitter');
    }

    // Upsert identity record via Railway API
    try {
      await railwayClient.post('/api/v1/identities', {
        provider: 'twitter',
        provider_user_id: profile.id,
        provider_username: profile.username,
      });
    } catch (error) {
      Logger.error('[TwitterAuth] Failed to link identity:', error);
      throw error;
    }
  }

  /**
   * Check if current user has Twitter linked
   */
  async hasTwitterLinked(): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return localStorage.getItem('twitter_linked_profile') !== null;
    }

    try {
      const profile = await this.getLinkedTwitterProfile();
      return profile !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get linked Twitter profile info
   */
  async getLinkedTwitterProfile(): Promise<{
    username: string;
    name: string;
    profileImageUrl?: string;
  } | null> {
    if (!isSupabaseConfigured()) {
      const stored = localStorage.getItem('twitter_linked_profile');
      return stored ? JSON.parse(stored) : null;
    }

    try {
      // Railway identities route returns identity data; we'd need a GET endpoint
      // For now, use localStorage fallback since GET /identities isn't implemented
      const stored = localStorage.getItem('twitter_linked_profile');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * Unlink Twitter from current user
   */
  async unlinkTwitter(): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      localStorage.removeItem('twitter_linked_profile');
      return { success: true };
    }

    try {
      await railwayClient.del('/api/v1/identities/twitter');
      EventBus.emit('twitterUnlinked', {});
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unlink',
      };
    }
  }

  /**
   * Reset service state (for testing)
   */
  reset(): void {
    this.config = null;
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

export const TwitterAuthService = TwitterAuthServiceClass.getInstance();
