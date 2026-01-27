import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { type StoredUser } from '../services/auth/types';
import { Logger } from '../services/system/Logger';
import { nanoid } from 'nanoid';
import { UserPersistenceService } from '../services/auth/UserPersistenceService';
import { SecurityUtils } from '../services/auth/SecurityUtils';

// ============================================================================
// Types
// ============================================================================

export interface UserContextType {
  /** Current user data, null if not logged in */
  user: StoredUser | null;
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

// ============================================================================
// Context
// ============================================================================

// eslint-disable-next-line react-refresh/only-export-components
export const UserContext = createContext<UserContextType | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from storage on mount and VERIFY against Database
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const storedUser = await UserPersistenceService.initialize();

      if (storedUser) {
        try {
          const { supabase, isSupabaseConfigured } =
            await import('../services/core/Supabase');

          if (
            isSupabaseConfigured() &&
            supabase &&
            !SecurityUtils.isLocalEnvironment()
          ) {
            // Verify if profile still exists in the NEW database
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
              if (mounted) setUser(null);
            } else {
              if (mounted) setUser(storedUser);
            }
          } else {
            // Local mode or Supabase not ready, trust storage
            if (mounted) setUser(storedUser);
          }
        } catch (err) {
          Logger.error('[UserContext] Failed to verify session', err);
          if (mounted) setUser(storedUser); // Fallback to storage on connection error
        }
      }

      if (mounted) {
        setIsLoading(false);
      }
    };

    void init();

    return () => {
      mounted = false;
    };
  }, []);

  // Login / Register
  const login = useCallback(
    async (nickname: string): Promise<{ success: boolean; error?: string }> => {
      const { supabase, isSupabaseConfigured } =
        await import('../services/core/Supabase');

      // Local-only mode for development (LAN, localhost, etc.)
      if (!isSupabaseConfigured() || !supabase || SecurityUtils.isLocalEnvironment()) {
        Logger.warn('[UserContext] Local environment detected, using local-only mode');
        const mockPlayerId = '00000000-0000-4000-a000-000000000000';
        const now = Date.now();
        const newUser: StoredUser = {
          profileId: mockPlayerId,
          nickname,
          createdAt: now,
          lastSeenAt: now,
        };
        UserPersistenceService.saveUser(newUser);
        setUser(newUser);
        return { success: true };
      }

      try {
        const { PlayerIdentityService } =
          await import('../services/auth/PlayerIdentityService');
        const identityHash = await PlayerIdentityService.generatePlayerHash(nickname);

        // Check if nickname exists (strict case-sensitive)
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, metadata')
          .eq('display_name', nickname)
          .maybeSingle();

        if (existingProfile) {
          // IDENTITY VERIFICATION: Check if the stored hash matches current device
          // In the new schema, identity metadata is stored in the metadata JSONB
          const metadata =
            (existingProfile.metadata as Record<string, unknown> | null) ?? {};
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

          // Login as existing player
          const now = Date.now();
          const newUser: StoredUser = {
            profileId: existingProfile.id,
            nickname,
            createdAt: now,
            lastSeenAt: now,
          };
          UserPersistenceService.saveUser(newUser);
          setUser(newUser);

          const { DeviceProfiler } =
            await import('../services/analytics/DeviceProfiler');
          const fingerprint = DeviceProfiler.getFingerprint();

          // Update profile
          await supabase
            .from('profiles')
            .update({
              last_seen_at: new Date(now).toISOString(),
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

        // Create new profile with device binding
        const { data: newProfile, error } = await supabase
          .from('profiles')
          .insert({
            display_name: nickname,
            is_tester: true,
            metadata: {
              identity_hash: identityHash,
              last_device_fingerprint: fingerprint,
            },
            created_at: new Date().toISOString(), // Add created_at
            last_seen_at: new Date().toISOString(), // Add last_seen_at
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

        const now = Date.now();
        const createdUser: StoredUser = {
          profileId: newProfile.id,
          nickname,
          createdAt: now,
          lastSeenAt: now,
        };
        UserPersistenceService.saveUser(createdUser);
        setUser(createdUser);
        return { success: true };

        return { success: false, error: 'Failed to create player profile' };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        Logger.error(`[UserContext] Identity/Registration error: ${errorMsg}`, error);
        return {
          success: false,
          error: errorMsg.includes('fetch')
            ? 'Connection to server failed. Check your internet.'
            : 'Identity verification failed. Please try again.',
        };
      }
    },
    []
  );

  // Logout
  const logout = useCallback(() => {
    UserPersistenceService.clear();
    setUser(null);
  }, []);

  // Update last seen
  const updateLastSeen = useCallback(async () => {
    if (!user) return;

    const now = Date.now();
    const updatedUser = { ...user, lastSeenAt: now };

    UserPersistenceService.saveUser(updatedUser);
    setUser(updatedUser);

    // Async sync to Supabase
    try {
      const { supabase, isSupabaseConfigured } =
        await import('../services/core/Supabase');
      if (isSupabaseConfigured() && supabase && !SecurityUtils.isLocalEnvironment()) {
        void supabase
          .from('profiles')
          .update({ last_seen_at: new Date(now).toISOString() })
          .eq('id', user.profileId);
      }
    } catch (error) {
      Logger.error('[UserContext] Failed to update lastSeenAt', error);
    }
  }, [user]);

  // Memoized context value
  const value = useMemo<UserContextType>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      profileId: user?.profileId ?? `anon_${nanoid(10)}`,
      nickname: user?.nickname ?? null,
      login,
      logout,
      updateLastSeen,
    }),
    [user, isLoading, login, logout, updateLastSeen]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
