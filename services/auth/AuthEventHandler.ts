/**
 * AuthEventHandler - Manages Supabase auth state change listener and event dispatch.
 */

import { supabase, isSupabaseConfigured } from '../supabase/client';
import { Logger } from '../system/Logger';
import { EventBus } from '../core/EventBus';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export type OnSignedInCallback = (userId: string) => void;

export class AuthEventHandler {
  private unsubscribe: (() => void) | null = null;
  private onSignedIn: OnSignedInCallback | null = null;

  /**
   * Register a callback invoked when a user signs in (e.g. to update last-seen).
   */
  setOnSignedIn(cb: OnSignedInCallback): void {
    this.onSignedIn = cb;
  }

  /**
   * Start listening for Supabase auth state changes.
   */
  initialize(): void {
    if (!isSupabaseConfigured()) {
      Logger.warn('[SupabaseAuth] Not configured - auth features disabled');
      return;
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      this.handleAuthStateChange(event, session);
    });

    this.unsubscribe = () => data.subscription.unsubscribe();
    Logger.info('[SupabaseAuth] Initialized and listening for auth changes');
  }

  /**
   * Stop listening and clean up the subscription.
   */
  dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  private handleAuthStateChange(event: AuthChangeEvent, session: Session | null): void {
    Logger.info(`[SupabaseAuth] Auth state changed: ${event}`);

    switch (event) {
      case 'SIGNED_IN':
        EventBus.emit('authStateChanged', {
          type: 'signIn',
          user: session?.user ?? null,
          session,
        });
        if (session?.user && this.onSignedIn) {
          this.onSignedIn(session.user.id);
        }
        break;

      case 'SIGNED_OUT':
        EventBus.emit('authStateChanged', {
          type: 'signOut',
          user: null,
          session: null,
        });
        break;

      case 'TOKEN_REFRESHED':
        EventBus.emit('authStateChanged', {
          type: 'tokenRefreshed',
          user: session?.user ?? null,
          session,
        });
        break;

      case 'USER_UPDATED':
        EventBus.emit('authStateChanged', {
          type: 'userUpdated',
          user: session?.user ?? null,
          session,
        });
        break;

      case 'PASSWORD_RECOVERY':
        EventBus.emit('authStateChanged', {
          type: 'passwordRecovery',
          user: session?.user ?? null,
          session,
        });
        break;

      case 'INITIAL_SESSION':
        // Fired once on startup with the restored session (may be null)
        Logger.info(`[SupabaseAuth] Initial session ${session ? 'restored' : 'empty'}`);
        break;
    }
  }
}
