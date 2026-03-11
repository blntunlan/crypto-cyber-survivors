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
import { supabase, isSupabaseConfigured } from '../services/supabase/client';

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

interface ErrorInfo {
  errorMsg: string;
  detail: string;
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

const extractErrorInfo = (error: unknown): ErrorInfo => {
  if (error instanceof Error) {
    return { errorMsg: error.message, detail: '' };
  }

  if (typeof error === 'object' && error !== null) {
    const errorRecord = error as Record<string, unknown>;
    const errorMsg = String(
      errorRecord.message ??
        errorRecord.details ??
        errorRecord.hint ??
        JSON.stringify(errorRecord)
    );
    const detail = errorRecord.code ? `[Code: ${String(errorRecord.code)}]` : '';
    return { errorMsg, detail };
  }

  return { errorMsg: String(error), detail: '' };
};

const toMetadataRecord = (metadata: unknown): Record<string, unknown> =>
  typeof metadata === 'object' && metadata !== null
    ? (metadata as Record<string, unknown>)
    : {};

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

  // Load user from storage on mount and verify against database when available.
  useEffect(() => {
    let mounted = true;

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

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', storedUser.profileId)
          .maybeSingle();

        if (error || !data) {
          Logger.warn(
            `[UserContext] Stored user ${storedUser.nickname} not found in new DB. Clearing session.`
          );
          UserPersistenceService.clear();
          if (mounted) commitUser(null);
        } else if (mounted) {
          commitUser(storedUser);
        }
      } catch (err) {
        Logger.error('[UserContext] Failed to verify session', err);
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
        const { PlayerIdentityService } =
          await import('../services/auth/PlayerIdentityService');
        const identityHash = await PlayerIdentityService.generatePlayerHash(nickname);

        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('id, metadata')
          .eq('display_name', nickname)
          .maybeSingle();

        if (fetchError) {
          Logger.error(
            '[UserContext] Failed to check for existing profile',
            fetchError
          );
          throw fetchError;
        }

        if (existingProfile) {
          const metadata = toMetadataRecord(existingProfile.metadata);
          const storedHash = metadata.identity_hash as string | undefined;

          if (storedHash && storedHash !== identityHash) {
            Logger.warn(
              `[UserContext] Identity violation for ${nickname}: Hash mismatch`
            );
            return {
              success: false,
              error: 'Nickname tied to another device. Access denied.',
            };
          }

          const existingUser = createLegacyUser(existingProfile.id, nickname);
          UserPersistenceService.saveUser(existingUser);
          commitUser(existingUser);

          const { DeviceProfiler } =
            await import('../services/analytics/DeviceProfiler');
          const fingerprint = DeviceProfiler.getFingerprint();

          await supabase
            .from('profiles')
            .update({
              last_seen_at: new Date(existingUser.lastSeenAt).toISOString(),
              metadata: {
                ...metadata,
                identity_hash: identityHash,
                last_device_fingerprint: fingerprint,
              },
            })
            .eq('id', existingProfile.id);

          return { success: true };
        }

        const { DeviceProfiler } = await import('../services/analytics/DeviceProfiler');
        const fingerprint = DeviceProfiler.getFingerprint();

        const now = Date.now();
        const { data: newProfile, error } = await supabase
          .from('profiles')
          .insert({
            display_name: nickname,
            is_tester: true,
            metadata: {
              identity_hash: identityHash,
              last_device_fingerprint: fingerprint,
            },
            created_at: new Date(now).toISOString(),
            last_seen_at: new Date(now).toISOString(),
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            return {
              success: false,
              error: 'Nickname already taken (Internal Conflict)',
            };
          }
          throw error;
        }

        const createdUser = createLegacyUser(newProfile.id, nickname, now);
        UserPersistenceService.saveUser(createdUser);
        commitUser(createdUser);

        return { success: true };
      } catch (error: unknown) {
        const { errorMsg, detail } = extractErrorInfo(error);

        Logger.error(
          `[UserContext] Identity/Registration error: ${errorMsg} ${detail}`,
          error,
          {
            nickname,
            context: 'login/register',
          }
        );

        return {
          success: false,
          error: errorMsg.includes('fetch')
            ? 'Connection to server failed. Check your internet.'
            : `Identity verification failed: ${errorMsg}`,
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
        void supabase
          .from('profiles')
          .update({ last_seen_at: new Date(now).toISOString() })
          .eq('id', currentUser.profileId);
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
