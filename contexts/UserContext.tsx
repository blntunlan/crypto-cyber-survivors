import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { type StoredUser } from '../services/auth/types';
import { Logger } from '../services/Logger';
import { nanoid } from 'nanoid';
import { UserPersistenceService } from '../services/auth/UserPersistenceService';

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
  /** Player ID (returns anon-ID if not authenticated) */
  playerId: string;
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

  // Load user from storage on mount using robust service
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const storedUser = await UserPersistenceService.initialize();
      if (mounted) {
        setUser(storedUser);
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
      const { supabase, isSupabaseConfigured } = await import('../services/Supabase');

      // Local-only mode for development
      if (
        !isSupabaseConfigured() ||
        !supabase ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
      ) {
        Logger.warn('[UserContext] Local environment detected, using local-only mode');
        const mockPlayerId = '00000000-0000-4000-a000-000000000000';
        const now = Date.now();
        const newUser: StoredUser = {
          playerId: mockPlayerId,
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
        const { data: existingPlayer } = await supabase
          .from('players')
          .select('id, auth_id, identity_hash')
          .eq('display_name', nickname)
          .maybeSingle();

        if (existingPlayer) {
          // IDENTITY VERIFICATION: Check if the stored hash matches current device
          const storedHash = existingPlayer.identity_hash ?? existingPlayer.auth_id;
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
            playerId: existingPlayer.id,
            nickname,
            createdAt: now,
            lastSeenAt: now,
          };
          UserPersistenceService.saveUser(newUser);
          setUser(newUser);

          const { DeviceProfiler } =
            await import('../services/analytics/DeviceProfiler');
          const fingerprint = DeviceProfiler.getFingerprint();

          // Update last seen timestamp and ensure identity data is stored/updated
          await supabase
            .from('players')
            .update({
              last_seen_at: new Date(now).toISOString(),
              identity_hash: identityHash, // Sync to new column
              auth_id: identityHash, // Keep in legacy for now
              last_device_fingerprint: fingerprint,
            })
            .eq('id', existingPlayer.id);

          return { success: true };
        }

        const { DeviceProfiler } = await import('../services/analytics/DeviceProfiler');
        const fingerprint = DeviceProfiler.getFingerprint();

        // Create new player with device binding
        const { data: newPlayer, error } = await supabase
          .from('players')
          .insert({
            display_name: nickname,
            identity_hash: identityHash,
            auth_id: identityHash,
            last_device_fingerprint: fingerprint,
            total_sessions: 1,
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

        if (newPlayer) {
          const now = Date.now();
          const createdUser: StoredUser = {
            playerId: newPlayer.id,
            nickname,
            createdAt: now,
            lastSeenAt: now,
          };
          UserPersistenceService.saveUser(createdUser);
          setUser(createdUser);
          return { success: true };
        }

        return { success: false, error: 'Failed to create player identity' };
      } catch (error) {
        Logger.error('[UserContext] Identity/Registration error', error);
        return {
          success: false,
          error: 'Identity verification failed. Please try again.',
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
      const { supabase, isSupabaseConfigured } = await import('../services/Supabase');
      if (
        isSupabaseConfigured() &&
        supabase &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
      ) {
        void supabase
          .from('players')
          .update({ last_seen_at: new Date(now).toISOString() })
          .eq('id', user.playerId);
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
      playerId: user?.playerId ?? `anon-${nanoid(10)}`,
      nickname: user?.nickname ?? null,
      login,
      logout,
      updateLastSeen,
    }),
    [user, isLoading, login, logout, updateLastSeen]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
