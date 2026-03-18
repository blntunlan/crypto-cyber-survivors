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
import { isSupabaseConfigured } from '../services/supabase/client';
import { SupabaseAuthService } from '../services/auth/SupabaseAuthService';

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
  isSupabaseConfigured() && !SecurityUtils.isLocalEnvironment();

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

  // Initialize Supabase Auth listener + restore session on mount
  useEffect(() => {
    let mounted = true;

    // Initialize auth state listener (handles OAuth callbacks, token refresh, etc.)
    SupabaseAuthService.initialize();

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

      // Verify stored user against Supabase (server call) + Railway API
      try {
        // getUser() makes a real server call — validates JWT isn't revoked/expired
        const authUser = await SupabaseAuthService.getUser();

        if (authUser) {
          // Valid Supabase session — verify profile exists on Railway
          const { railwayClient } = await import('../services/api/RailwayClient');
          const profile = await railwayClient
            .get<{ id: string }>('/api/v1/profile')
            .catch(() => null);

          if (profile) {
            if (mounted) commitUser(storedUser);
          } else {
            // Profile not found on server — clear local session
            Logger.warn('[UserContext] Profile not found on server. Clearing session.');
            UserPersistenceService.clear();
            await SupabaseAuthService.signOut();
            if (mounted) commitUser(null);
          }
        } else {
          // No valid Supabase user — JWT expired/revoked
          Logger.warn('[UserContext] Supabase session invalid. Clearing stored user.');
          UserPersistenceService.clear();
          await SupabaseAuthService.signOut();
          if (mounted) commitUser(null);
        }
      } catch (err) {
        Logger.error('[UserContext] Failed to verify session', err);
        // Keep stored user on network errors (offline support)
        if (mounted) commitUser(storedUser);
      }

      if (mounted) setIsLoading(false);
    };

    void init();

    return () => {
      mounted = false;
    };
  }, [commitUser]);

  // Login / Register
  const login = useCallback(
    async (nickname: string): Promise<{ success: boolean; error?: string }> => {
      if (!isRemoteMode()) {
        Logger.warn('[UserContext] Local environment detected, using local-only mode');
        const localUser = createLegacyUser(LOCAL_DEV_PROFILE_ID, nickname);
        UserPersistenceService.saveUser(localUser);
        commitUser(localUser);
        return { success: true };
      }

      try {
        // 1. Validate existing session via server call (not cache)
        const user = await SupabaseAuthService.getUser();
        let session = user ? await SupabaseAuthService.getSession() : null;

        if (!session) {
          // No valid session — sign out stale state and create fresh anonymous user
          await SupabaseAuthService.signOut();

          const authResult = await SupabaseAuthService.signInAnonymously(nickname);

          if (!authResult.success || !authResult.session) {
            return {
              success: false,
              error: authResult.error ?? 'Authentication failed',
            };
          }

          session = authResult.session;
        }

        // 2. Create or fetch profile via Railway API (JWT is auto-attached)
        const { railwayClient } = await import('../services/api/RailwayClient');

        type ProfileResponse = { id: string; nickname?: string; display_name?: string };
        let profile: ProfileResponse;

        try {
          // Try to get existing profile first
          profile = await railwayClient.get<ProfileResponse>('/api/v1/profile');
        } catch {
          // Profile doesn't exist — create it
          profile = await railwayClient.post<ProfileResponse>('/api/v1/profile', {
            nickname: nickname.trim(),
          });
        }

        // 4. Store locally
        const legacyUser = createLegacyUser(profile.id, nickname.trim());
        UserPersistenceService.saveUser(legacyUser);
        commitUser(legacyUser);

        Logger.info(`[UserContext] Login successful: ${nickname} (${profile.id})`);
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
    UserPersistenceService.clear();
    anonymousProfileIdRef.current = createAnonymousProfileId();
    commitUser(null);

    // Sign out from Supabase (non-blocking)
    void SupabaseAuthService.signOut().catch(() => {
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
        const { railwayClient } = await import('../services/api/RailwayClient');
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
