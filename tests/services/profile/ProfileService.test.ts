import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileService } from '../../../services/auth/ProfileService';
import { supabase } from '../../../services/supabase/client';

// Mock Supabase client
vi.mock('../../../services/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      single: vi.fn(),
    })),
  },
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

// Mock SupabaseUtils
vi.mock('../../../services/core/SupabaseUtils', () => ({
  SupabaseUtils: {
    safeFetchSingle: vi.fn(),
  },
}));

// Mock Logger
vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(() => {
    vi.clearAllMocks();
    ProfileService.resetInstance();
    service = ProfileService.getInstance();
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = ProfileService.getInstance();
      const instance2 = ProfileService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should load profile for authenticated user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
      };
      const mockDBProfile = {
        id: 'prof-123',
        auth_user_id: 'user-123',
        display_name: 'Survivor',
        high_score: 1000,
      };

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { SupabaseUtils } = await import('../../../services/core/SupabaseUtils');
      (SupabaseUtils.safeFetchSingle as any).mockResolvedValue({
        success: true,
        data: mockDBProfile,
      });

      const result = await service.initialize();

      expect(result.isValid).toBe(true);
      expect(result.profile?.displayName).toBe('Survivor');
      expect(service.getProfile()?.displayName).toBe('Survivor');
    });

    it('should handle missing profile by requiring nickname', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
      };

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      const { SupabaseUtils } = await import('../../../services/core/SupabaseUtils');
      (SupabaseUtils.safeFetchSingle as any)
        .mockResolvedValueOnce({ success: false, error: { message: 'not found' } })
        .mockResolvedValueOnce({ success: false, error: { message: 'not found' } });

      const result = await service.initialize();

      expect(result.isValid).toBe(false);
      expect(result.needsNickname).toBe(true);
    });
  });

  describe('createProfile', () => {
    it('should create a new profile successfully', async () => {
      const params = {
        userId: 'user-123',
        displayName: 'NewPlayer',
      };

      const mockNewProfile = {
        id: 'prof-456',
        auth_user_id: 'user-123',
        display_name: 'NewPlayer',
      };

      // Mock nickname check (maybeSingle returns null if not taken)
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockSingle = vi
        .fn()
        .mockResolvedValue({ data: mockNewProfile, error: null });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: mockMaybeSingle,
        insert: vi.fn().mockReturnThis(),
        single: mockSingle,
      });

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const result = await service.createProfile(params);

      expect(result.isValid).toBe(true);
      expect(result.profile?.displayName).toBe('NewPlayer');
    });

    it('should fail if nickname is taken', async () => {
      const params = { userId: 'user-123', displayName: 'Taken' };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi
          .fn()
          .mockResolvedValue({ data: { id: 'existing' }, error: null }),
      });

      const result = await service.createProfile(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Nickname already taken');
    });
  });

  describe('updateDisplayName', () => {
    it('should update display name successfully', async () => {
      // Setup initial profile
      const service = ProfileService.getInstance();
      (service as any).currentProfile = { id: 'prof-123', displayName: 'OldName' };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnThis(),
      });

      const result = await service.updateDisplayName('NewName');

      expect(result.isValid).toBe(true);
      expect(service.getProfile()?.displayName).toBe('NewName');
    });
  });
});
