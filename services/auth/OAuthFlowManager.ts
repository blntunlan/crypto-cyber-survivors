/**
 * OAuthFlowManager - Railway-native compatibility layer.
 *
 * OAuth linking will be implemented through Railway API endpoints later.
 */

import { Logger } from '../system/Logger';
import type { AuthProvider, AuthUser } from './types';
import type { OAuthOptions } from './RailwayAuthService';

export class OAuthFlowManager {
  async signInWithOAuth(
    _options: OAuthOptions
  ): Promise<{ success: boolean; error?: string }> {
    return {
      success: false,
      error: 'OAuth is not available in Railway-native auth yet',
    };
  }

  async linkOAuthProvider(
    _provider: AuthProvider,
    currentUser: AuthUser | null
  ): Promise<{ success: boolean; error?: string }> {
    if (!currentUser) {
      return { success: false, error: 'Must be signed in to link providers' };
    }

    return {
      success: false,
      error: 'OAuth is not available in Railway-native auth yet',
    };
  }

  async getLinkedProviders(user: AuthUser | null): Promise<AuthProvider[]> {
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
    Logger.warn('[RailwayAuth] Provider unlinking requires backend implementation');
    return {
      success: false,
      error: 'Provider unlinking requires Railway backend implementation',
    };
  }
}
