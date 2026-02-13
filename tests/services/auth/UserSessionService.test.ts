// Mock Supabase
import { vi } from 'vitest';
vi.mock('../../../services/core/Supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    single: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    rpc: vi.fn(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  },
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

import { describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '../../../services/core/Supabase';
import { UserSessionService } from '../../../services/auth/UserSessionService';
import { UserPersistenceService } from '../../../services/auth/UserPersistenceService';

// Mock types
interface LegacyStoredUser {
  profileId: string;
  nickname: string;
  createdAt: number;
  lastSeenAt: number;
}

// Mock Logger
vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock SupabaseAuthService
const { mockAuthService } = vi.hoisted(() => ({
  mockAuthService: {
    signInAnonymously: vi.fn(),
  },
}));

vi.mock('../../../services/auth/SupabaseAuthService', () => ({
  SupabaseAuthService: mockAuthService,
}));

describe('UserSessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    UserSessionService.resetForTesting();

    // Reset individual results
    ((supabase as any).single as any).mockReset();
    ((supabase as any).rpc as any).mockReset();

    // Default success for register check
    ((supabase as any).single as any).mockResolvedValue({ data: null, error: null });

    // Mock hostname to bypass local-only check
    Object.defineProperty(window, 'location', {
      value: { hostname: 'game.cryptosurvivors.com' },
      configurable: true,
    });
  });

  describe('getLegacyStoredUser', () => {
    it('should return null if no user is stored', () => {
      expect(UserSessionService.getLegacyStoredUser()).toBeNull();
    });

    it('should return stored user from localStorage', async () => {
      const mockUser: LegacyStoredUser = {
        profileId: '550e8400-e29b-41d4-a716-446655440002',
        nickname: 'Tester',
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
      };
      localStorage.setItem('crypto_survivors_user', JSON.stringify(mockUser));
      await UserPersistenceService.initialize();

      const user = UserSessionService.getLegacyStoredUser();
      expect(user).toEqual(mockUser);
    });
  });

  describe('getProfileId', () => {
    it('should return stored profile ID if user exists', () => {
      UserSessionService.saveUser('550e8400-e29b-41d4-a716-446655440003', 'Tester');
      expect(UserSessionService.getProfileId()).toBe(
        '550e8400-e29b-41d4-a716-446655440003'
      );
    });

    it('should return anon-ID if no user exists', () => {
      const id = UserSessionService.getProfileId();
      expect(id).toMatch(/^anon_/);
    });
  });

  describe('saveUser', () => {
    it('should save user to localStorage and cache', () => {
      UserSessionService.saveUser('550e8400-e29b-41d4-a716-446655440004', 'Saver');

      const stored = JSON.parse(localStorage.getItem('crypto_survivors_user')!);
      expect(stored.profileId).toBe('550e8400-e29b-41d4-a716-446655440004');
      expect(stored.nickname).toBe('Saver');
      expect(UserSessionService.getNickname()).toBe('Saver');
    });
  });

  describe('registerNickname', () => {
    it('should register new profile in Supabase', async () => {
      mockAuthService.signInAnonymously.mockResolvedValueOnce({
        success: true,
        user: { id: '550e8400-e29b-41d4-a716-446655440005' },
      });

      const result = await UserSessionService.registerNickname('NewPlayer');

      expect(mockAuthService.signInAnonymously).toHaveBeenCalledWith('NewPlayer');
      expect(result.success).toBe(true);
      expect(UserSessionService.getNickname()).toBe('NewPlayer');
    });

    it('should login as existing profile if nickname exists', async () => {
      // With the new Anonymous Sign-In flow, existing profiles are handled
      // by Supabase (either linking or failing if it's not truly anonymous)
      // For this test, we just assume signInAnonymously succeeds
      mockAuthService.signInAnonymously.mockResolvedValueOnce({
        success: true,
        user: { id: '550e8400-e29b-41d4-a716-446655440006' },
      });

      const result = await UserSessionService.registerNickname('Oldie');

      expect(mockAuthService.signInAnonymously).toHaveBeenCalledWith('Oldie');
      expect(result.success).toBe(true);
      expect(UserSessionService.getProfileId()).toBe(
        '550e8400-e29b-41d4-a716-446655440006'
      );
    });

    it('should handle conflict (nickname taken)', async () => {
      mockAuthService.signInAnonymously.mockResolvedValueOnce({
        success: false,
        error: 'Nickname already taken',
      });

      const result = await UserSessionService.registerNickname('Taken');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Nickname already taken');
    });
  });

  describe('updateLastSeen', () => {
    it('should update timestamp in localStorage and Supabase', async () => {
      UserSessionService.saveUser('550e8400-e29b-41d4-a716-446655440007', 'Syncer');
      const oldTime = UserSessionService.getLegacyStoredUser()?.lastSeenAt ?? 0;

      const updateMock = vi.fn().mockResolvedValue({ error: null });
      const fromSpy = vi
        .spyOn(supabase as any, 'from')
        .mockReturnValue({ update: updateMock } as any);

      await new Promise(r => setTimeout(r, 10));
      await UserSessionService.updateLastSeen();

      const newUser = UserSessionService.getLegacyStoredUser();
      expect(newUser?.lastSeenAt).toBeGreaterThan(oldTime);
      expect(fromSpy).toHaveBeenCalledWith('profiles');
      expect(updateMock).toHaveBeenCalledWith({
        last_seen_at: expect.any(String),
      });
    });
  });

  describe('clearUser', () => {
    it('should clear all session data', () => {
      UserSessionService.saveUser('550e8400-e29b-41d4-a716-446655440008', 'Clearer');
      UserSessionService.clearUser();

      expect(UserSessionService.getLegacyStoredUser()).toBeNull();
      expect(localStorage.getItem('crypto_survivors_user')).toBeNull();
    });
  });
});

