import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserSessionService } from '../../../services/auth/UserSessionService';

// Mock types
interface StoredUser {
  playerId: string;
  nickname: string;
  createdAt: number;
  lastSeenAt: number;
}

// Mock Supabase
const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    rpc: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  },
}));

vi.mock('../../../services/supabase', () => ({
  supabase: mockSupabase as any,
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

// Mock Logger
vi.mock('../../../services/Logger', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('UserSessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    UserSessionService.resetForTesting();

    // Set up chainable behavior
    mockSupabase.from.mockReturnThis();
    mockSupabase.select.mockReturnThis();
    mockSupabase.eq.mockReturnThis();
    mockSupabase.insert.mockReturnThis();
    mockSupabase.update.mockReturnThis();
    mockSupabase.order.mockReturnThis();
    mockSupabase.limit.mockReturnThis();

    // Reset individual results
    mockSupabase.single.mockReset();
    mockSupabase.rpc.mockReset();

    // Default success for register check
    mockSupabase.single.mockResolvedValue({ data: null, error: null });

    // Mock hostname to bypass local-only check
    Object.defineProperty(window, 'location', {
      value: { hostname: 'game.cryptosurvivors.com' },
      configurable: true,
    });
  });

  describe('getStoredUser', () => {
    it('should return null if no user is stored', () => {
      expect(UserSessionService.getStoredUser()).toBeNull();
    });

    it('should return stored user from localStorage', () => {
      const mockUser: StoredUser = {
        playerId: 'test-id',
        nickname: 'Tester',
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
      };
      localStorage.setItem('crypto_survivors_user', JSON.stringify(mockUser));

      const user = UserSessionService.getStoredUser();
      expect(user).toEqual(mockUser);
    });
  });

  describe('getPlayerId', () => {
    it('should return stored player ID if user exists', () => {
      UserSessionService.saveUser('stored-id', 'Tester');
      expect(UserSessionService.getPlayerId()).toBe('stored-id');
    });

    it('should return anon-ID if no user exists', () => {
      const id = UserSessionService.getPlayerId();
      expect(id).toMatch(/^anon-/);
    });
  });

  describe('saveUser', () => {
    it('should save user to localStorage and cache', () => {
      UserSessionService.saveUser('save-id', 'Saver');

      const stored = JSON.parse(localStorage.getItem('crypto_survivors_user')!);
      expect(stored.playerId).toBe('save-id');
      expect(stored.nickname).toBe('Saver');
      expect(UserSessionService.getNickname()).toBe('Saver');
    });
  });

  describe('registerNickname', () => {
    it('should register new player in Supabase', async () => {
      // 1. check exists -> null
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });
      // 2. insert returns player
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'new-id', display_name: 'NewPlayer' },
        error: null,
      });

      const result = await UserSessionService.registerNickname('NewPlayer');

      expect(mockSupabase.from).toHaveBeenCalledWith('players');
      expect(mockSupabase.insert).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(UserSessionService.getNickname()).toBe('NewPlayer');
    });

    it('should login as existing player if nickname exists', async () => {
      const existingPlayer = { id: 'existing-id', nickname: 'oldie' };
      mockSupabase.single.mockResolvedValueOnce({ data: existingPlayer, error: null });
      mockSupabase.rpc.mockResolvedValue({ error: null });

      const result = await UserSessionService.registerNickname('Oldie');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_player_sessions', {
        player_uuid: 'existing-id',
      });
      expect(result.success).toBe(true);
      expect(UserSessionService.getPlayerId()).toBe('existing-id');
    });

    it('should handle conflict (23505 error code)', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null }); // check exists
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: '23505' },
      }); // insert fail

      const result = await UserSessionService.registerNickname('Taken');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Nickname already taken');
    });
  });

  describe('updateLastSeen', () => {
    it('should update timestamp in localStorage and Supabase', async () => {
      UserSessionService.saveUser('sync-id', 'Syncer');
      const oldTime = UserSessionService.getStoredUser()?.lastSeenAt ?? 0;

      await new Promise(r => setTimeout(r, 10));
      await UserSessionService.updateLastSeen();

      const newUser = UserSessionService.getStoredUser();
      expect(newUser?.lastSeenAt).toBeGreaterThan(oldTime);
      expect(mockSupabase.update).toHaveBeenCalled();
    });
  });

  describe('clearUser', () => {
    it('should clear all session data', () => {
      UserSessionService.saveUser('clear-id', 'Clearer');
      UserSessionService.clearUser();

      expect(UserSessionService.getStoredUser()).toBeNull();
      expect(localStorage.getItem('crypto_survivors_user')).toBeNull();
    });
  });
});
