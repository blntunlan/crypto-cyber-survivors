/**
 * User and Session related types for the Authentication System.
 * Supports both legacy nickname-based auth and new OAuth auth.
 */

// ============================================
// Legacy Types (for backward compatibility)
// ============================================

/**
 * LegacyStoredUser - Storage format for nickname-based identities.
 * Keeping for backward compatibility with local storage.
 */
export interface LegacyStoredUser {
  profileId: string; // UUID from Railway profiles table
  nickname: string; // Display name (3-16 chars)
  createdAt: number; // First login timestamp
  lastSeenAt: number; // Last session timestamp
}

// ============================================
// Modern Auth Types
// ============================================

/**
 * Supported OAuth providers
 */
export type AuthProvider =
  | 'email'
  | 'anonymous'
  | 'nickname'
  | 'twitter'
  | 'google'
  | 'discord'
  | 'github'
  | 'apple'
  | 'twitch';

export interface AuthIdentity {
  provider: AuthProvider | string;
  [key: string]: unknown;
}

export interface AuthUser {
  id: string;
  aud?: string;
  role?: string;
  email?: string | null;
  app_metadata?: {
    provider?: string;
    [key: string]: unknown;
  };
  user_metadata?: {
    account_id?: string;
    display_name?: string;
    name?: string;
    wallet_address?: string;
    [key: string]: unknown;
  };
  identities?: AuthIdentity[];
  created_at?: string;
}

export interface AuthSession {
  access_token: string;
  token_type: 'Bearer' | string;
  expires_in: number;
  expires_at?: number;
  refresh_token: string;
  user: AuthUser;
}

/**
 * Auth method types
 */
export type AuthMethod = 'email_password' | 'magic_link' | 'oauth' | 'phone';

/**
 * User profile from Railway profiles table
 */
export interface UserProfile {
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
  primaryAuthProvider: AuthProvider;
  createdAt: string;
  lastSeenAt: string;
  updatedAt: string;
}

/**
 * Linked OAuth identity
 */
export interface LinkedIdentity {
  id: string;
  profileId: string;
  provider: AuthProvider;
  providerId: string;
  identityData: Record<string, unknown>;
  lastLoginAt: string;
  createdAt: string;
}

/**
 * Auth state for React context
 */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  } | null;
  linkedProviders: AuthProvider[];
}

/**
 * Auth context actions
 */
export interface AuthActions {
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<AuthActionResult>;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signInWithOAuth: (provider: AuthProvider) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
  sendMagicLink: (email: string) => Promise<AuthActionResult>;
  resetPassword: (email: string) => Promise<AuthActionResult>;
  updatePassword: (newPassword: string) => Promise<AuthActionResult>;
  updateProfile: (
    updates: Partial<Pick<UserProfile, 'displayName' | 'username' | 'avatarUrl'>>
  ) => Promise<AuthActionResult>;
  linkProvider: (provider: AuthProvider) => Promise<AuthActionResult>;
  unlinkProvider: (provider: AuthProvider) => Promise<AuthActionResult>;
  refreshSession: () => Promise<AuthActionResult>;
}

/**
 * Result of auth actions
 */
export interface AuthActionResult {
  success: boolean;
  error?: string;
  needsEmailConfirmation?: boolean;
  user?: UserProfile;
}

/**
 * Auth event types for EventBus
 */
export type AuthEventType =
  | 'signIn'
  | 'signOut'
  | 'signUp'
  | 'tokenRefreshed'
  | 'userUpdated'
  | 'passwordRecovery'
  | 'providerLinked'
  | 'providerUnlinked';

/**
 * Auth event payload
 */
export interface AuthEventPayload {
  type: AuthEventType;
  user: UserProfile | null;
  session?: {
    accessToken: string;
    refreshToken: string;
  } | null;
  provider?: AuthProvider;
}

// ============================================
// OAuth Provider Specific Types
// ============================================

/**
 * Twitter user data from OAuth
 */
export interface TwitterUserData {
  id: string;
  username: string; // @handle
  name: string;
  profileImageUrl?: string;
  verified?: boolean;
  followersCount?: number;
}

/**
 * Discord user data from OAuth
 */
export interface DiscordUserData {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  email?: string;
}

/**
 * Google user data from OAuth
 */
export interface GoogleUserData {
  id: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified: boolean;
}

/**
 * GitHub user data from OAuth
 */
export interface GitHubUserData {
  id: number;
  login: string;
  name: string | null;
  avatarUrl: string;
  email: string | null;
}

// ============================================
// Validation Types
// ============================================

/**
 * Username validation result
 */
export interface UsernameValidation {
  isValid: boolean;
  error?: string;
  suggestion?: string;
}

/**
 * Password strength result
 */
export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4; // 0=weak, 4=strong
  feedback: string[];
  isStrong: boolean;
}

// ============================================
// Session Types
// ============================================

/**
 * Persistent session data (stored in localStorage)
 */
export interface PersistedSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  profileId: string;
}

/**
 * Session refresh result
 */
export interface SessionRefreshResult {
  success: boolean;
  newExpiresAt?: number;
  error?: string;
}
