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

    it('should reject non-UUID profileId from localStorage', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          profileId: 'legacy-nanoid-abc123',
          nickname: 'BadId',
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        })
      );

      const initPromise = UserPersistenceService.initialize();
      await vi.advanceTimersByTimeAsync(200);

      const user = await initPromise;
      expect(user).toBeNull();
    });

    it('should reject non-UUID profileId from cookie', async () => {
      const badUser = {
        profileId: 'not-a-uuid',
        nickname: 'CookieBad',
        createdAt: 1000,
        lastSeenAt: 2000,
      };
      const content = btoa(JSON.stringify(badUser));
      document.cookie = `${COOKIE_NAME}=${content}; path=/`;

      const initPromise = UserPersistenceService.initialize();
      await vi.advanceTimersByTimeAsync(200);

      const user = await initPromise;
      expect(user).toBeNull();
    });
  });

  describe('createOrUpdateUser', () => {
    it('should create a new user with random UUID', async () => {
      const user = await UserPersistenceService.createOrUpdateUser('NewPlayer');

      expect(user.nickname).toBe('NewPlayer');
      expect(user.profileId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(user.createdAt).toBeGreaterThan(0);
      expect(user.lastSeenAt).toBeGreaterThan(0);
      // Should be persisted
      expect(UserPersistenceService.getLegacyStoredUser()?.nickname).toBe('NewPlayer');
    });

    it('should create a deterministic dev UUID when isDev is true', async () => {
      const user = await UserPersistenceService.createOrUpdateUser('DevPlayer', true);

      expect(user.profileId).toBe('00000000-0000-0000-0000-000000000000');
      expect(user.nickname).toBe('DevPlayer');
    });

    it('should update existing user nickname and lastSeenAt', async () => {
      // Create initial user
      const original = await UserPersistenceService.createOrUpdateUser('Original');
      const originalCreatedAt = original.createdAt;

      // Advance time
      vi.advanceTimersByTime(5000);

      // Update
      const updated = await UserPersistenceService.createOrUpdateUser('Updated');

      expect(updated.profileId).toBe(original.profileId);
      expect(updated.nickname).toBe('Updated');
      expect(updated.createdAt).toBe(originalCreatedAt);
      expect(updated.lastSeenAt).toBeGreaterThanOrEqual(original.lastSeenAt);
    });

    it('should persist to localStorage and cookie after create', async () => {
      await UserPersistenceService.createOrUpdateUser('Persisted');

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toContain('Persisted');
      expect(document.cookie).toContain(COOKIE_NAME);
    });
  });
});
