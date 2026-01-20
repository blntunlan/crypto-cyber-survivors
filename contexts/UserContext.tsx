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
        // Check if nickname exists (case-insensitive)
        const { data: existingPlayer } = await supabase
          .from('players')
          .select('id')
          .ilike('display_name', nickname)
          .single();

        if (existingPlayer) {
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

          // Update last seen timestamp
          await supabase.rpc('update_player_last_seen', {
            p_player_id: existingPlayer.id,
          });

          return { success: true };
        }

        // Create new player
        const { data: newPlayer, error } = await supabase
          .from('players')
          .insert({
            display_name: nickname,
            total_sessions: 1,
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            return { success: false, error: 'Nickname already taken' };
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

        return { success: false, error: 'Failed to create player' };
      } catch (error) {
        Logger.error('[UserContext] Registration error', error);
        return { success: false, error: 'Connection error. Please try again.' };
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
