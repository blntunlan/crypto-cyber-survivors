import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UserPersistenceService } from '../../../services/auth/UserPersistenceService';

const STORAGE_KEY = 'crypto_survivors_user';
const COOKIE_NAME = 'cs_identity';

describe('UserPersistenceService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    // Clear cookies
    document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
    // @ts-expect-error:  reset private static state
    UserPersistenceService.cachedUser = null;
    // @ts-expect-error: testing
    UserPersistenceService.initPromise = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initialization Logic', () => {
    const mockUser = {
      playerId: 'test-id',
      nickname: 'TestUser',
      hasNickname: true,
      isAnonymous: false,
      lastLogin: new Date().toISOString(),
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
    };

    it('should load user from localStorage immediately', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));

      const user = await UserPersistenceService.initialize();
      expect(user?.nickname).toBe('TestUser');
      expect(UserPersistenceService.getStoredUser()?.playerId).toBe('test-id');
    });

    it('should fallback to Cookie if localStorage is empty', async () => {
      // Create Base64 cookie content like the service does
      const minimalUser = {
        playerId: 'cookie-id',
        nickname: 'CookieUser',
        createdAt: 1000,
        lastSeenAt: 2000,
      };
      const content = btoa(JSON.stringify(minimalUser));
      document.cookie = `${COOKIE_NAME}=${content}; path=/`;

      const user = await UserPersistenceService.initialize();
      expect(user?.nickname).toBe('CookieUser');
      // Should have synced back to localStorage
      expect(localStorage.getItem(STORAGE_KEY)).toContain('cookie-id');
    });

    it('should retry localStorage after 150ms (Safari fix)', async () => {
      // Start init without data
      const initPromise = UserPersistenceService.initialize();

      // Simulate data being written by another process/delay
      setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));
      }, 50);

      // Fast forward 150ms
      await vi.advanceTimersByTimeAsync(200);

      const user = await initPromise;
      expect(user?.nickname).toBe('TestUser');
    });
  });

  describe('Data Management', () => {
    const testUser = {
      playerId: 'save-test',
      nickname: 'Saver',
      hasNickname: true,
      isAnonymous: false,
      lastLogin: new Date().toISOString(),
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
    };

    it('should save user to both storage and cookie', () => {
      UserPersistenceService.saveUser(testUser);

      expect(localStorage.getItem(STORAGE_KEY)).toContain('save-test');
      expect(document.cookie).toContain(COOKIE_NAME);
      expect(UserPersistenceService.getStoredUser()?.nickname).toBe('Saver');
    });

    it('should clear all storage sources on clear()', () => {
      UserPersistenceService.saveUser(testUser);
      UserPersistenceService.clear();

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(UserPersistenceService.getStoredUser()).toBeNull();
      // Cookie should be expired (cant easily check value in JSDOM, but can check clearing)
    });
  });

  describe('Edge Cases', () => {
    it('should handle corrupted JSON gracefully', async () => {
      localStorage.setItem(STORAGE_KEY, 'invalid-json-{');

      const initPromise = UserPersistenceService.initialize();
      await vi.advanceTimersByTimeAsync(200);

      const user = await initPromise;
      expect(user).toBeNull();
    });

    it('should reject users without required fields', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ oldField: 'value' }));

      const initPromise = UserPersistenceService.initialize();
      await vi.advanceTimersByTimeAsync(200);

      const user = await initPromise;
      expect(user).toBeNull();
    });
  });
});
