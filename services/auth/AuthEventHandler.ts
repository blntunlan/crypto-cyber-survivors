/**
 * AuthEventHandler - Railway-native compatibility no-op.
 *
 * Browser-side SDK auth listeners were removed; Railway auth state is
 * derived from RailwayAuthTokenStore and explicit API calls.
 */

import { Logger } from '../system/Logger';

export type OnSignedInCallback = (userId: string) => void;

export class AuthEventHandler {
  private onSignedIn: OnSignedInCallback | null = null;

  setOnSignedIn(cb: OnSignedInCallback): void {
    this.onSignedIn = cb;
  }

  initialize(): void {
    Logger.debug('[RailwayAuth] AuthEventHandler initialize skipped');
  }

  notifySignedIn(userId: string): void {
    this.onSignedIn?.(userId);
  }

  dispose(): void {
    this.onSignedIn = null;
  }
}
