import { create } from 'zustand';
import { type AuthUser, type AuthSession } from '../services/auth/types';

/**
 * Stages of the authentication flow.
 */
export type AuthStage = 'LOGIN' | 'OTP_VERIFY' | 'NICKNAME_SETUP' | 'COMPLETE';

interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  error: string | null;
  authStage: AuthStage;

  // Actions
  /**
   * Updates the current session and associated user.
   */
  setSession: (session: AuthSession | null) => void;

  /**
   * Sets the loading state.
   */
  setLoading: (loading: boolean) => void;

  /**
   * Sets an error message or clears it.
   */
  setError: (error: string | null) => void;

  /**
   * Transitions to a specific authentication stage.
   */
  setStage: (stage: AuthStage) => void;

  /**
   * Clears auth state and resets to LOGIN stage.
   */
  logout: () => void;
}

/**
 * useAuthStore - Global Authentication and Session State
 *
 * Manages the current user, session, and the UI stage of the authentication flow.
 */
export const useAuthStore = create<AuthState>(set => ({
  user: null,
  session: null,
  loading: false,
  error: null,
  authStage: 'LOGIN',

  setSession: session =>
    set({
      session,
      user: session?.user ?? null,
      // Note: Stage transition to COMPLETE is default,
      // but may be overridden by NICKNAME_SETUP logic in services.
      authStage: session ? 'COMPLETE' : 'LOGIN',
    }),

  setLoading: loading => set({ loading }),

  setError: error => set({ error }),

  setStage: authStage => set({ authStage }),

  logout: () =>
    set({
      user: null,
      session: null,
      error: null,
      authStage: 'LOGIN',
      loading: false,
    }),
}));
