/**
 * RailwayAuthService - Railway-native authentication facade.
 *
 * Runtime auth source is Railway API + RailwayAuthTokenStore.
 */

import { isRailwayApiConfigured, railwayClient } from '../api/RailwayClient';
import {
  RailwayAuthTokenStore,
  type RailwayStoredAuth,
} from '../api/RailwayAuthTokenStore';
import { Logger } from '../system/Logger';
import {
  type AuthProvider,
  type AuthSession,
  type AuthUser,
} from './types';

export type { AuthProvider } from './types';

export type AuthResult = {
  success: boolean;
  user?: AuthUser;
  session?: AuthSession;
  error?: string;
  needsEmailConfirmation?: boolean;
};

export type ProfileData = {
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
};

export type SignUpOptions = {
  email: string;
  password: string;
  displayName?: string;
  redirectTo?: string;
};

export type SignInOptions = {
  email: string;
  password: string;
};

export type OAuthOptions = {
  provider: AuthProvider;
  redirectTo?: string;
  scopes?: string;
};

type RailwayAnonymousAuthResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  account: {
    id: string;
    type: 'anonymous' | 'registered' | 'service';
  };
  profile: {
    id: string;
    displayName: string;
  };
  wallet: {
    id: string;
    balance: number;
    currency: string;
  };
};

class RailwayAuthServiceClass {
  private static instance: RailwayAuthServiceClass | null = null;

  static getInstance(): RailwayAuthServiceClass {
    return (RailwayAuthServiceClass.instance ??= new RailwayAuthServiceClass());
  }

  initialize(): void {
    Logger.debug('[RailwayAuth] Browser auth listener is not required');
  }

  async signUp(_options: SignUpOptions): Promise<AuthResult> {
    return this.unsupportedEmailAuth();
  }

  async signIn(_options: SignInOptions): Promise<AuthResult> {
    return this.unsupportedEmailAuth();
  }

  async signInAnonymously(nickname: string): Promise<AuthResult> {
    if (!isRailwayApiConfigured()) {
      return { success: false, error: 'Auth service not configured' };
    }

    return this.signInAnonymouslyWithRailway(nickname);
  }

  async signOut(): Promise<{ success: boolean; error?: string }> {
    const hadRailwayAuth = RailwayAuthTokenStore.get() !== null;
    RailwayAuthTokenStore.clear();

    if (hadRailwayAuth || isRailwayApiConfigured()) {
      return { success: true };
    }

    return { success: false, error: 'Auth service not configured' };
  }

  async signInWithOAuth(
    _options: OAuthOptions
  ): Promise<{ success: boolean; error?: string }> {
    return this.unsupportedProviderAuth();
  }

  async linkOAuthProvider(
    _provider: AuthProvider
  ): Promise<{ success: boolean; error?: string }> {
    const user = await this.getUser();
    if (!user) {
      return { success: false, error: 'Must be signed in to link providers' };
    }

    return this.unsupportedProviderAuth();
  }

  async getLinkedProviders(): Promise<AuthProvider[]> {
    const user = await this.getUser();
    if (!user?.identities) return [];

    const allowedProviders: AuthProvider[] = [
      'email',
      'anonymous',
      'nickname',
      'twitter',
      'google',
      'discord',
      'github',
      'apple',
      'twitch',
    ];

    return user.identities
      .map(identity => identity.provider)
      .filter((provider): provider is AuthProvider =>
        allowedProviders.includes(provider as AuthProvider)
      );
  }

  async unlinkProvider(
    _provider: AuthProvider
  ): Promise<{ success: boolean; error?: string }> {
    return {
      success: false,
      error: 'Provider unlinking requires Railway backend implementation',
    };
  }

  async sendMagicLink(
    _email: string,
    _redirectTo?: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.unsupportedEmailAction();
  }

  async sendOtpCode(_email: string): Promise<{ success: boolean; error?: string }> {
    return this.unsupportedEmailAction();
  }

  async verifyOtpCode(_email: string, _token: string): Promise<AuthResult> {
    return this.unsupportedEmailAuth();
  }

  async resetPassword(
    _email: string,
    _redirectTo?: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.unsupportedEmailAction();
  }

  async updatePassword(
    _newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.unsupportedEmailAction();
  }

  async getSession(): Promise<AuthSession | null> {
    const railwayAuth = RailwayAuthTokenStore.get();
    return railwayAuth ? this.mapRailwayAuthToSession(railwayAuth) : null;
  }

  async getUser(): Promise<AuthUser | null> {
    const railwayAuth = RailwayAuthTokenStore.get();
    return railwayAuth ? this.mapRailwayAuthToUser(railwayAuth) : null;
  }

  async isAuthenticated(): Promise<boolean> {
    return (await this.getSession()) !== null;
  }

  async refreshSession(): Promise<{
    success: boolean;
    session?: AuthSession;
    error?: string;
  }> {
    if (!isRailwayApiConfigured()) {
      return { success: false, error: 'Auth service not configured' };
    }

    const railwayAuth = RailwayAuthTokenStore.get();
    if (!railwayAuth) {
      return { success: false, error: 'No active Railway session' };
    }

    return {
      success: true,
      session: this.mapRailwayAuthToSession(railwayAuth),
    };
  }

  async getProfile(): Promise<ProfileData | null> {
    if (!isRailwayApiConfigured() || !RailwayAuthTokenStore.get()) return null;

    try {
      const profileData =
        await railwayClient.get<Record<string, unknown>>('/api/v1/profile');
      return this.mapProfileData(profileData);
    } catch {
      return null;
    }
  }

  async updateProfile(updates: {
    displayName?: string;
    username?: string;
    avatarUrl?: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!isRailwayApiConfigured() || !RailwayAuthTokenStore.get()) {
      return { success: false, error: 'Auth service not configured' };
    }

    if (updates.username) {
      const usernameRegex = /^[a-zA-Z0-9_]{3,16}$/;
      if (!usernameRegex.test(updates.username)) {
        return {
          success: false,
          error: 'Username must be 3-16 alphanumeric characters or underscores',
        };
      }
    }

    try {
      const patchData: Record<string, unknown> = {};
      if (updates.displayName) patchData.nickname = updates.displayName;
      if (updates.avatarUrl) patchData.avatar_url = updates.avatarUrl;

      if (Object.keys(patchData).length > 0) {
        await railwayClient.patch('/api/v1/profile', patchData);
      }

      Logger.info('[RailwayAuth] Profile updated');
      return { success: true };
    } catch (err) {
      Logger.error('[RailwayAuth] Update profile exception:', err);
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      return { success: false, error: message };
    }
  }

  async getCurrentProfile(): Promise<ProfileData | null> {
    return this.getProfile();
  }

  async updateProfileWithAuth(
    updates: Partial<ProfileData>
  ): Promise<{ success: boolean; profile?: ProfileData; error?: string }> {
    if (!isRailwayApiConfigured() || !RailwayAuthTokenStore.get()) {
      return { success: false, error: 'Auth service not configured' };
    }

    try {
      const patchData: Record<string, unknown> = {};
      if (updates.displayName) patchData.nickname = updates.displayName;
      if (updates.avatarUrl) patchData.avatar_url = updates.avatarUrl;

      const data = await railwayClient.patch<Record<string, unknown>>(
        '/api/v1/profile',
        patchData
      );

      return { success: true, profile: this.mapProfileData(data) };
    } catch (err) {
      Logger.error('[RailwayAuth] Update profile with auth error:', err);
      return { success: false, error: 'Failed to update profile' };
    }
  }

  dispose(): void {
    // No browser auth listener is registered for Railway-native auth.
  }

  static resetInstance(): void {
    RailwayAuthServiceClass.instance = null;
  }

  private unsupportedEmailAuth(): AuthResult {
    return {
      success: false,
      error: 'Email auth is not available in Railway-native auth yet',
    };
  }

  private unsupportedEmailAction(): { success: boolean; error: string } {
    return {
      success: false,
      error: 'Email auth is not available in Railway-native auth yet',
    };
  }

  private unsupportedProviderAuth(): { success: boolean; error: string } {
    return {
      success: false,
      error: 'OAuth is not available in Railway-native auth yet',
    };
  }

  private mapProfileData(data: Record<string, unknown>): ProfileData {
    const id = data.id as string;
    const createdAt = (data.created_at ??
      data.createdAt ??
      new Date().toISOString()) as string;

    return {
      id,
      authUserId: (data.auth_user_id ?? data.authUserId) as string | null,
      email: (data.email as string | null) ?? null,
      emailVerified:
        ((data.email_verified ?? data.emailVerified) as boolean | undefined) ??
        false,
      displayName: (data.display_name ??
        data.displayName ??
        data.nickname ??
        'Player') as string,
      username: (data.username ?? data.nickname) as string | null,
      avatarUrl: (data.avatar_url ?? data.avatarUrl) as string | null,
      level: ((data.level as number | undefined) ?? 1),
      xp: ((data.xp as number | undefined) ?? 0),
      isTester:
        ((data.is_tester ?? data.isTester) as boolean | undefined) ?? false,
      isBanned:
        ((data.is_banned ?? data.isBanned) as boolean | undefined) ?? false,
      primaryAuthProvider:
        ((data.primary_auth_provider ?? data.primaryAuthProvider) as
          | string
          | undefined) ?? 'railway_anonymous',
      createdAt,
      lastSeenAt: (data.last_seen_at ?? data.lastSeenAt ?? createdAt) as string,
      updatedAt: (data.updated_at ?? data.updatedAt ?? createdAt) as string,
    };
  }

  private async signInAnonymouslyWithRailway(nickname: string): Promise<AuthResult> {
    try {
      const response = await railwayClient.post<RailwayAnonymousAuthResponse>(
        '/api/v1/auth/anonymous',
        { display_name: nickname }
      );

      const storedAuth: RailwayStoredAuth = {
        accessToken: response.accessToken,
        tokenType: response.tokenType,
        expiresAt: Date.now() + response.expiresIn * 1000,
        account: response.account,
        profile: response.profile,
      };
      RailwayAuthTokenStore.save(storedAuth);

      Logger.info('[RailwayAuth] Anonymous sign-in successful');
      return {
        success: true,
        user: this.mapRailwayAuthToUser(storedAuth),
        session: this.mapRailwayAuthToSession(storedAuth),
      };
    } catch (err) {
      Logger.error('[RailwayAuth] Anonymous sign-in exception:', err);
      const message = err instanceof Error ? err.message : 'Connection error';
      return { success: false, error: message };
    }
  }

  private mapRailwayAuthToUser(auth: RailwayStoredAuth): AuthUser {
    return {
      id: auth.profile.id,
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {
        provider: `railway_${auth.account.type}`,
      },
      user_metadata: {
        account_id: auth.account.id,
        display_name: auth.profile.displayName,
        name: auth.profile.displayName,
      },
      identities: [{ provider: auth.account.type }],
      created_at: new Date().toISOString(),
    };
  }

  private mapRailwayAuthToSession(auth: RailwayStoredAuth): AuthSession {
    return {
      access_token: auth.accessToken,
      token_type: auth.tokenType,
      expires_in: Math.max(0, Math.floor((auth.expiresAt - Date.now()) / 1000)),
      expires_at: Math.floor(auth.expiresAt / 1000),
      refresh_token: '',
      user: this.mapRailwayAuthToUser(auth),
    };
  }
}

export const RailwayAuthService = RailwayAuthServiceClass.getInstance();
export { RailwayAuthServiceClass };
