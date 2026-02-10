import { supabase } from '../supabase/client';
import { Logger } from '../system/Logger';
import { useAuthStore } from '../../stores/useAuthStore';
import type { Session } from '@supabase/supabase-js';

import type { Provider } from '@supabase/supabase-js';

/**

 * AuthService - Centralized Authentication Logic

 * 

 * Handles interaction with Supabase Auth and updates the global AuthStore.

 */

export class AuthService {
  /**

   * Initiates the OTP login flow (Magic Link or OTP Code).

   * For this project, we primarily focus on OTP code for PWA compatibility.

   * 

   * @param email The user's email address.

   */

  static async signInWithOtp(email: string): Promise<void> {
    Logger.info(`[AuthService] Initiating OTP sign-in for: ${email}`);

    useAuthStore.getState().setLoading(true);

    useAuthStore.getState().setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,

        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        throw error;
      }

      // If successful, we wait for the user to enter the code.

      // The store should transition to OTP_VERIFY stage.

      useAuthStore.getState().setStage('OTP_VERIFY');

      Logger.info('[AuthService] OTP sent successfully.');
    } catch (err) {
      Logger.error('[AuthService] OTP sign-in failed', err);

      const errorMessage = (err as Error).message ?? 'Failed to send OTP.';

      useAuthStore.getState().setError(errorMessage);

      throw new Error(errorMessage);
    } finally {
      useAuthStore.getState().setLoading(false);
    }
  }

  /**

   * Verifies the OTP code entered by the user.

   * 

   * @param email The user's email.

   * @param token The 6-digit OTP code.

   * @returns The session object if successful.

   */

  static async verifyOtp(email: string, token: string): Promise<Session | null> {
    Logger.info(`[AuthService] Verifying OTP for: ${email}`);

    useAuthStore.getState().setLoading(true);

    useAuthStore.getState().setError(null);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,

        token,

        type: 'email',
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        useAuthStore.getState().setSession(data.session);

        Logger.info('[AuthService] OTP verified. Session established.');

        return data.session;
      }

      return null;
    } catch (err) {
      Logger.error('[AuthService] OTP verification failed', err);

      const errorMessage = (err as Error).message ?? 'Invalid code.';

      useAuthStore.getState().setError(errorMessage);

      throw new Error(errorMessage);
    } finally {
      useAuthStore.getState().setLoading(false);
    }
  }

  /**

   * Signs in with email and password.

   * 

   * @param email The user's email.

   * @param password The user's password.

   * @returns The session object if successful.

   */

  static async signInWithPassword(
    email: string,
    password: string
  ): Promise<Session | null> {
    Logger.info(`[AuthService] Signing in with password for: ${email}`);

    useAuthStore.getState().setLoading(true);

    useAuthStore.getState().setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,

        password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        useAuthStore.getState().setSession(data.session);

        Logger.info('[AuthService] Password sign-in successful.');

        return data.session;
      }

      return null;
    } catch (err) {
      Logger.error('[AuthService] Password sign-in failed', err);

      const errorMessage = (err as Error).message ?? 'Invalid credentials.';

      useAuthStore.getState().setError(errorMessage);

      throw new Error(errorMessage);
    } finally {
      useAuthStore.getState().setLoading(false);
    }
  }

  /**

   * Initiates OAuth login flow.

   * 

   * @param provider The OAuth provider (e.g., 'google', 'discord').

   */

  static async signInWithOAuth(provider: Provider): Promise<void> {
    Logger.info(`[AuthService] Initiating OAuth sign-in with: ${provider}`);

    useAuthStore.getState().setLoading(true);

    useAuthStore.getState().setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,

        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }

      Logger.info('[AuthService] OAuth redirect initiated.');
    } catch (err) {
      Logger.error('[AuthService] OAuth sign-in failed', err);

      const errorMessage = (err as Error).message ?? 'OAuth failed.';

      useAuthStore.getState().setError(errorMessage);

      throw new Error(errorMessage);
    } finally {
      useAuthStore.getState().setLoading(false);
    }
  }
}
