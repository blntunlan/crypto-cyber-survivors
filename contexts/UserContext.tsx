/**
 * UserContext - React Context for User Session Management
 *
 * Provides reactive user state across the application.
 * Replaces static UserSessionService calls with hook-based access.
 */

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { type StoredUser } from '../services/auth/types';
import { Logger } from '../services/Logger';
import { nanoid } from 'nanoid';

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
// Constants
// ============================================================================

const STORAGE_KEY = 'crypto_survivors_user';

// ============================================================================
// Context
// ============================================================================

export const UserContext = createContext<UserContextType | undefined>(undefined);

// ============================================================================
// Helper Functions
// ============================================================================

function loadUserFromStorage(): StoredUser | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as StoredUser;
    }
  } catch (error) {
    Logger.error('[UserContext] Failed to load user from storage', error);
  }
  return null;
}

function saveUserToStorage(user: StoredUser): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    Logger.info(`[UserContext] User saved: ${user.nickname} (${user.playerId})`);
  } catch (error) {
    Logger.error('[UserContext] Failed to save user to storage', error);
  }
}

function clearUserFromStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
  Logger.info('[UserContext] User identity cleared');
}

// ============================================================================
// Provider Component
// ============================================================================

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from storage on mount
  useEffect(() => {
    const storedUser = loadUserFromStorage();
    setUser(storedUser);
    setIsLoading(false);
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
        const mockPlayerId = nanoid();
        const now = Date.now();
        const newUser: StoredUser = {
          playerId: mockPlayerId,
          nickname,
          createdAt: now,
          lastSeenAt: now,
        };
        saveUserToStorage(newUser);
        setUser(newUser);
        return { success: true };
      }

      try {
        // Check if nickname exists
        const { data: existingPlayer } = await supabase
          .from('players')
          .select('id')
          .eq('nickname', nickname.toLowerCase())
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
          saveUserToStorage(newUser);
          setUser(newUser);

          // Update session count
          await supabase.rpc('increment_player_sessions', { player_uuid: existingPlayer.id });

          return { success: true };
        }

        // Create new player
        const { data: newPlayer, error } = await supabase
          .from('players')
          .insert({
            nickname: nickname.toLowerCase(),
            display_name: nickname,
            total_sessions: 1,
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') return { success: false, error: 'Nickname already taken' };
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
          saveUserToStorage(createdUser);
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
    clearUserFromStorage();
    setUser(null);
  }, []);

  // Update last seen
  const updateLastSeen = useCallback(async () => {
    if (!user) return;

    const now = Date.now();
    const updatedUser = { ...user, lastSeenAt: now };

    saveUserToStorage(updatedUser);
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
