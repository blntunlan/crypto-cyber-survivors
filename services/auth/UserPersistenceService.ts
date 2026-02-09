/**
 * UserPersistenceService - Durable storage for user identity.
 *
 * Specifically designed to handle mobile browser (Safari) quirks:
 * 1. Immediate localStorage check
 * 2. Async localStorage retry (handles busy main thread)
 * 3. Cookie fallback (handles privacy mode/PWA storage partitioning)
 * 4. Cache-in-memory to avoid redundant storage hits
 */

import { type LegacyStoredUser } from './types';
import { Logger } from '../system/Logger';

const STORAGE_KEY = 'crypto_survivors_user';
const COOKIE_NAME = 'cs_identity';

export class UserPersistenceService {
  private static cachedUser: LegacyStoredUser | null = null;
  private static initPromise: Promise<LegacyStoredUser | null> | null = null;

  /**
   * Initializes the user identity from all available storage sources.
   * Uses a promise to prevent multiple concurrent initializations.
   */
  static async initialize(): Promise<LegacyStoredUser | null> {
    if (this.cachedUser) return this.cachedUser;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      // 1. Immediate localStorage check
      let user = this.loadFromLocalStorage();
      if (user) {
        this.cachedUser = user;
        this.syncToCookie(user); // Ensure cookie is in sync
        return user;
      }

      // 2. Cookie fallback
      user = this.loadFromCookie();
      if (user) {
        Logger.info('[UserPersistence] Recovered user from cookie');
        this.cachedUser = user;
        this.saveToLocalStorage(user); // Sync back to localStorage
        return user;
      }

      // 3. Short retry for Safari lazy storage
      await new Promise(resolve => setTimeout(resolve, 150));
      user = this.loadFromLocalStorage();
      if (user) {
        Logger.info('[UserPersistence] Recovered user from localStorage after retry');
        this.cachedUser = user;
        this.syncToCookie(user);
        return user;
      }

      Logger.debug('[UserPersistence] No stored user found after all checks');
      return null;
    })();

    try {
      const result = await this.initPromise;
      return result;
    } finally {
      this.initPromise = null;
    }
  }

  /**
   * Get current user (sync, returns cached if available)
   */
  static getLegacyStoredUser(): LegacyStoredUser | null {
    return this.cachedUser;
  }

  /**
   * Save user to all storage sources
   */
  static saveUser(user: LegacyStoredUser): void {
    this.cachedUser = user;
    this.saveToLocalStorage(user);
    this.syncToCookie(user);
  }

  /**
   * Clear user from all storage
   */
  static clear(): void {
    this.cachedUser = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
      document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; sameSite=Lax`;
      Logger.info('[UserPersistence] User cleared from all storage');
    } catch (e) {
      Logger.error('[UserPersistence] Error clearing storage', e);
    }
  }

  /**
   * Creates a new user or updates the existing one.
   * If isDev is true, generates a deterministic UUID if one doesn't exist.
   * Otherwise uses existing ID or creates a new one.
   */
  static async createOrUpdateUser(
    nickname: string,
    isDev: boolean = false
  ): Promise<LegacyStoredUser> {
    const now = Date.now();
    let user = this.cachedUser;

    if (!user) {
      // Create new user
      user = {
        profileId: isDev ? '00000000-0000-0000-0000-000000000000' : crypto.randomUUID(),
        nickname,
        createdAt: now,
        lastSeenAt: now,
      };
    } else {
      // Update existing user
      user = {
        ...user,
        nickname,
        lastSeenAt: now,
      };
    }

    this.saveUser(user);
    Logger.info(`[UserPersistence] User ${isDev ? 'DEV ' : ''}saved: ${nickname}`);
    return user;
  }

  // --- Internals ---

  private static loadFromLocalStorage(): LegacyStoredUser | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.profileId && parsed?.nickname) {
          // DATABASE INTEGRITY: Reject non-UUID player IDs (migration for legacy nanoids)
          if (!this.isUUID(parsed.profileId)) {
            Logger.warn(
              '[UserPersistence] Corrupt non-UUID profileId detected in storage, ignoring'
            );
            return null;
          }
          return parsed as LegacyStoredUser;
        }
      }
    } catch (e) {
      Logger.debug('[UserPersistence] LocalStorage read failed', e);
    }
    return null;
  }

  private static saveToLocalStorage(user: LegacyStoredUser): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      Logger.warn('[UserPersistence] LocalStorage write failed', e);
    }
  }

  private static loadFromCookie(): LegacyStoredUser | null {
    try {
      const name = COOKIE_NAME + '=';
      const decodedCookie = decodeURIComponent(document.cookie);
      const ca = decodedCookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        if (!c) continue;
        while (c.charAt(0) === ' ') {
          c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
          const content = c.substring(name.length, c.length);
          const parsed = JSON.parse(atob(content)); // Decode Base64
          if (parsed?.profileId && parsed?.nickname) {
            // DATABASE INTEGRITY: Reject non-UUID player IDs
            if (!this.isUUID(parsed.profileId)) {
              return null;
            }
            return parsed as LegacyStoredUser;
          }
        }
      }
    } catch (e) {
      Logger.debug('[UserPersistence] Cookie read failed', e);
    }
    return null;
  }

  private static syncToCookie(user: LegacyStoredUser): void {
    try {
      const identityMinimal = {
        profileId: user.profileId,
        nickname: user.nickname,
      };
      const content = btoa(JSON.stringify(identityMinimal)); // Encode to Base64 to avoid semi-colon issues
      // Expires in 365 days
      const d = new Date();
      d.setTime(d.getTime() + 365 * 24 * 60 * 60 * 1000);
      const expires = 'expires=' + d.toUTCString();
      document.cookie = `${COOKIE_NAME}=${content}; ${expires}; path=/; sameSite=Lax`;
    } catch (e) {
      Logger.debug('[UserPersistence] Cookie sync failed', e);
    }
  }

  /**
   * Simple UUID validation regex
   */
  private static isUUID(str?: string | null): boolean {
    if (!str) return false;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
}
