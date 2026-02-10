import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileService } from '../../../services/profile/ProfileService';
import { supabase } from '../../../services/supabase/client';

// Mock Supabase client
vi.mock('../../../services/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(),
      update: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
    })),
  },
}));

describe('ProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return profile data for a given user ID', async () => {
      const userId = '123';
      const mockProfile = { id: userId, nickname: 'CyberSurvivor' };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockProfile, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const result = await ProfileService.getProfile(userId);

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', userId);
      expect(result).toEqual(mockProfile);
    });

    it('should return null if profile not found', async () => {
      const mockSingle = vi
        .fn()
        .mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: mockSingle,
      });

      const result = await ProfileService.getProfile('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('updateNickname', () => {
    it('should update nickname successfully', async () => {
      const userId = '123';
      const newNickname = 'Neo';
      const mockProfile = { id: userId, nickname: newNickname };

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockProfile, error: null });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await ProfileService.updateNickname(userId, newNickname);

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockUpdate).toHaveBeenCalledWith({ nickname: newNickname });
      expect(mockEq).toHaveBeenCalledWith('id', userId);
      expect(result).toEqual(mockProfile);
    });

    it('should throw error if nickname update fails (e.g. not unique)', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi
        .fn()
        .mockResolvedValue({ error: { message: 'Unique violation' } });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      await expect(ProfileService.updateNickname('123', 'TakenName')).rejects.toThrow(
        'Unique violation'
      );
    });
  });
});
