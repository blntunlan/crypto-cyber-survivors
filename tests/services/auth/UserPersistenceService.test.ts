import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UserPersistenceService } from '../../../services/auth/UserPersistenceService';

const STORAGE_KEY = 'crypto_survivors_user';
const COOKIE_NAME = 'cs_identity';

vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

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
      profileId: '550e8400-e29b-41d4-a716-446655440000',
      nickname: 'TestUser',
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
    };

    it('should load user from localStorage immediately', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));

      const user = await UserPersistenceService.initialize();
      expect(user?.nickname).toBe('TestUser');
      expect(UserPersistenceService.getLegacyStoredUser()?.profileId).toBe(
        '550e8400-e29b-41d4-a716-446655440000'
      );
    });

    it('should fallback to Cookie if localStorage is empty', async () => {
      // Create Base64 cookie content like the service does
      const minimalUser = {
        profileId: '550e8400-e29b-41d4-a716-446655440009',
        nickname: 'CookieUser',
        createdAt: 1000,
        lastSeenAt: 2000,
      };
      const content = btoa(JSON.stringify(minimalUser));
      document.cookie = `${COOKIE_NAME}=${content}; path=/`;

      const user = await UserPersistenceService.initialize();
      expect(user?.nickname).toBe('CookieUser');
      // Should have synced back to localStorage
      expect(localStorage.getItem(STORAGE_KEY)).toContain(
        '550e8400-e29b-41d4-a716-446655440009'
      );
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
      profileId: '550e8400-e29b-41d4-a716-446655440010',
      nickname: 'Saver',
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
    };

    it('should save user to both storage and cookie', () => {
      UserPersistenceService.saveUser(testUser);

      expect(localStorage.getItem(STORAGE_KEY)).toContain(
        '550e8400-e29b-41d4-a716-446655440010'
      );
      expect(document.cookie).toContain(COOKIE_NAME);
      expect(UserPersistenceService.getLegacyStoredUser()?.nickname).toBe('Saver');
    });

    it('should clear all storage sources on clear()', () => {
      UserPersistenceService.saveUser(testUser);
      UserPersistenceService.clear();

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(UserPersistenceService.getLegacyStoredUser()).toBeNull();
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

    it('should handle localStorage write errors', () => {
      const setItemSpy = vi
        .spyOn(window.localStorage, 'setItem')
        .mockImplementation(() => {
          throw new Error('Quota exceeded');
        });
      const user = {
        profileId: '550e8400-e29b-41d4-a716-446655440011',
        nickname: 'Err',
      } as any;
      UserPersistenceService.saveUser(user);
      expect(setItemSpy).toHaveBeenCalled();
      setItemSpy.mockRestore();
    });

    it('should handle cookies with invalid Base64', async () => {
      document.cookie = `${COOKIE_NAME}=not-base64!!!; path=/`;
      const initPromise = UserPersistenceService.initialize();
      await vi.advanceTimersByTimeAsync(200);
      const user = await initPromise;
      expect(user).toBeNull();
    });

    it('should handle clearing storage even if localStorage throws', () => {
      const removeSpy = vi
        .spyOn(window.localStorage, 'removeItem')
        .mockImplementation(() => {
          throw new Error('Storage disabled');
        });
      UserPersistenceService.clear();
      expect(removeSpy).toHaveBeenCalled();
      removeSpy.mockRestore();
    });

    it('should handle multiple concurrent initializations', async () => {
      const p1 = UserPersistenceService.initialize();
      const p2 = UserPersistenceService.initialize();
      // Since initialize is async, it returns a new promise that wraps the inner one.
      await vi.advanceTimersByTimeAsync(200);
      const [res1, res2] = await Promise.all([p1, p2]);
      expect(res1).toBeNull();
      expect(res2).toBeNull();
    });
  });
});
