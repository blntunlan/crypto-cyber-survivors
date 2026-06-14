import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { type LegacyStoredUser } from '../services/auth/types';
import { Logger } from '../services/system/Logger';
import { nanoid } from 'nanoid';
import { UserPersistenceService } from '../services/auth/UserPersistenceService';
import { SecurityUtils } from '../services/auth/SecurityUtils';
import { RailwayAuthService } from '../services/auth/RailwayAuthService';
import { NicknameValidator } from '../services/auth/NicknameValidator';
import { isRailwayApiConfigured, railwayClient } from '../services/api/RailwayClient';
import { RailwayAuthTokenStore } from '../services/api/RailwayAuthTokenStore';

// ============================================================================
// Types
// ============================================================================

export interface UserContextType {
  /** Current user data, null if not logged in */
  user: LegacyStoredUser | null;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether initial loading is in progress */
  isLoading: boolean;
  /** Profile ID (returns anon-ID if not authenticated) */
  profileId: string;
  /** User's nickname or null */
  nickname: string | null;
  /** Register/login with a nickname */
  login: (nickname: string) => Promise<{ success: boolean; error?: string }>;
  /** Clear user session */
  logout: () => void;
  /** Update last seen timestamp */
  updateLastSeen: () => Promise<void>;
}

interface UserProviderProps {
  children: React.ReactNode;
}

const LOCAL_DEV_PROFILE_ID = '00000000-0000-4000-a000-000000000000';

const isRemoteMode = (): boolean =>
  isRailwayApiConfigured() && !SecurityUtils.isLocalEnvironment();

const createAnonymousProfileId = (): string => `anon_${nanoid(10)}`;

const createLegacyUser = (
  profileId: string,
  nickname: string,
  timestamp = Date.now()
): LegacyStoredUser => ({
  profileId,
  nickname,
  createdAt: timestamp,
  lastSeenAt: timestamp,
});

type RemoteProfileResponse = {
  id: string;
  nickname?: string | null;
  display_name?: string | null;
  displayName?: string | null;
};

const getProfileNickname = (
  profile: RemoteProfileResponse,
  fallback: string
): string => {
  const candidate = profile.nickname ?? profile.display_name ?? profile.displayName ?? fallback;
  return candidate.trim() || fallback;
};

const isInvalidRemoteSessionError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('401') ||
    message.includes('403') ||
    message.includes('404') ||
    message.includes('not found') ||
    message.includes('missing auth') ||
    message.includes('token')
  );
};

// ============================================================================
// Context
// ============================================================================

// eslint-disable-next-line react-refresh/only-export-components
export const UserContext = createContext<UserContextType | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<LegacyStoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const userRef = useRef<LegacyStoredUser | null>(null);
  const anonymousProfileIdRef = useRef<string>(createAnonymousProfileId());

  const commitUser = useCallback((nextUser: LegacyStoredUser | null): void => {
    userRef.current = nextUser;
    setUser(nextUser);
  }, []);

  // Initialize auth listener + restore session on mount
  useEffect(() => {
    let mounted = true;

    // Railway-native auth does not need a browser auth listener.
    RailwayAuthService.initialize();

    const init = async () => {
      const storedUser = await UserPersistenceService.initialize();

      if (!storedUser) {
        if (mounted) setIsLoading(false);
        return;
      }

      if (!isRemoteMode()) {
        if (mounted) commitUser(storedUser);
        if (mounted) setIsLoading(false);
        return;
      }

      // Verify stored user against Railway API using the Railway-native JWT.
      try {
        const railwayAuth = RailwayAuthTokenStore.get();
        if (railwayAuth) {
          const profile = await railwayClient.get<RemoteProfileResponse>(
            '/api/v1/profile'
          );

          const reconciledUser: LegacyStoredUser = {
            ...storedUser,
            profileId: profile.id,
            nickname: getProfileNickname(profile, storedUser.nickname),
          };

          if (
            reconciledUser.profileId !== storedUser.profileId ||
            reconciledUser.nickname !== storedUser.nickname
          ) {
            UserPersistenceService.saveUser(reconciledUser);
          }

          if (mounted) commitUser(reconciledUser);
          if (mounted) setIsLoading(false);
          return;
        }

        Logger.warn('[UserContext] Railway auth missing. Clearing stored user.');
        UserPersistenceService.clear();
        await RailwayAuthService.signOut();
        if (mounted) commitUser(null);
      } catch (err) {
        Logger.error('[UserContext] Failed to verify session', err);
        if (isInvalidRemoteSessionError(err)) {
          RailwayAuthTokenStore.clear();
          UserPersistenceService.clear();
          await RailwayAuthService.signOut();
          if (mounted) commitUser(null);
          if (mounted) setIsLoading(false);
          return;
        }

        // Keep stored user on network errors (offline support)
        if (mounted) commitUser(storedUser);
      }

      if (mounted) setIsLoading(false);
    };

    void init();

    return () => {
      mounted = false;
      RailwayAuthService.dispose();
    };
  }, [commitUser]);

  // Login / Register
  const login = useCallback(
    async (nickname: string): Promise<{ success: boolean; error?: string }> => {
      const normalizedNickname = nickname.trim();
      const validationError = NicknameValidator.validate(normalizedNickname);
      if (validationError) {
        return { success: false, error: validationError };
      }

      if (!isRemoteMode()) {
        Logger.warn('[UserContext] Local environment detected, using local-only mode');
        const localUser = createLegacyUser(LOCAL_DEV_PROFILE_ID, normalizedNickname);
        UserPersistenceService.saveUser(localUser);
        commitUser(localUser);
        return { success: true };
      }

      try {
        const hasRailwayAuth = RailwayAuthTokenStore.get() !== null;
        let session = hasRailwayAuth ? await RailwayAuthService.getSession() : null;

        if (!session) {
          // No Railway-native session — sign out stale state and create fresh anonymous account.
          await RailwayAuthService.signOut();

          const authResult =
            await RailwayAuthService.signInAnonymously(normalizedNickname);

          if (!authResult.success || !authResult.session) {
            return {
              success: false,
              error: authResult.error ?? 'Authentication failed',
            };
          }

          session = authResult.session;
        }

        // 2. Create or fetch profile via Railway API (JWT is auto-attached)
        let profile: RemoteProfileResponse;

        try {
          // Try to get existing profile first
          profile = await railwayClient.get<RemoteProfileResponse>('/api/v1/profile');
        } catch {
          // Profile doesn't exist — create it
          profile = await railwayClient.post<RemoteProfileResponse>('/api/v1/profile', {
            nickname: normalizedNickname,
          });
        }

        // 4. Store locally
        const legacyUser = createLegacyUser(
          profile.id,
          getProfileNickname(profile, normalizedNickname)
        );
        UserPersistenceService.saveUser(legacyUser);
        commitUser(legacyUser);

        Logger.info(
          `[UserContext] Login successful: ${legacyUser.nickname} (${profile.id})`
        );
        return { success: true };
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);

        Logger.error(`[UserContext] Login error: ${errorMsg}`, error);

        // Handle specific errors
        if (errorMsg.includes('Nickname already taken')) {
          return { success: false, error: 'Nickname already taken' };
        }

        return {
          success: false,
          error: errorMsg.includes('fetch')
            ? 'Connection to server failed. Check your internet.'
            : `Login failed: ${errorMsg}`,
        };
      }
    },
    [commitUser]
  );

  // Logout
  const logout = useCallback(() => {
    RailwayAuthTokenStore.clear();
    UserPersistenceService.clear();
    anonymousProfileIdRef.current = createAnonymousProfileId();
    commitUser(null);

    // Clear server auth state if a compatible auth provider exists (non-blocking).
    void RailwayAuthService.signOut().catch(() => {
      // Silent — user is already logged out locally
    });
  }, [commitUser]);

  // Update last seen
  const updateLastSeen = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser) return;

    const now = Date.now();
    const updatedUser: LegacyStoredUser = {
      ...currentUser,
      lastSeenAt: now,
    };

    UserPersistenceService.saveUser(updatedUser);
    commitUser(updatedUser);

    try {
      if (isRemoteMode()) {
        void railwayClient.patch('/api/v1/profile', {}).catch(() => {
          // Silent — not critical
        });
      }
    } catch (error) {
      Logger.error('[UserContext] Failed to update lastSeenAt', error);
    }
  }, [commitUser]);

  // Memoized context value
  const value = useMemo<UserContextType>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      profileId: user?.profileId ?? anonymousProfileIdRef.current,
      nickname: user?.nickname ?? null,
      login,
      logout,
      updateLastSeen,
    }),
    [user, isLoading, login, logout, updateLastSeen]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
