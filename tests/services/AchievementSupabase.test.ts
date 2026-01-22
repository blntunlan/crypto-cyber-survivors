import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AchievementService } from '../../services/AchievementService';
import { supabase, isSupabaseConfigured } from '../../services/Supabase';
import { UserSessionService } from '../../services/auth/UserSessionService';
import { Logger } from '../../services/Logger';

vi.mock('../../services/Supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

vi.mock('../../services/auth/UserSessionService', () => ({
  UserSessionService: {
    getPlayerId: vi.fn(() => 'test-player-id'),
  },
}));

vi.mock('../../services/Logger', () => ({
  Logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AchievementService Supabase Integration', () => {
  let service: AchievementService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = AchievementService.getInstance();
  });

  describe('getAchievements', () => {
    it('should return empty array when Supabase is not configured', async () => {
      (isSupabaseConfigured as any).mockReturnValueOnce(false);
      const result = await service.getAchievements();
      expect(result).toEqual([]);
      expect(Logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('not initialized')
      );
    });

    it('should return achievements on success', async () => {
      const mockData = [
        {
          id: '1',
          name: 'First Blood',
          description: 'Kill 1 enemy',
          category: 'combat',
          icon_key: 'sword',
          condition_type: 'total_kills',
          condition_value: 1,
          reward_gold: 100,
          is_active: true,
        },
      ];

      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockData, error: null })),
          })),
        })),
      });

      const result = await service.getAchievements();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('First Blood');
      expect(result[0].category).toBe('combat');
    });

    it('should return empty array on database error', async () => {
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() =>
              Promise.resolve({ data: null, error: { message: 'DB Error' } })
            ),
          })),
        })),
      });

      const result = await service.getAchievements();
      expect(result).toEqual([]);
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('getMyUnlocks', () => {
    it('should return empty array for anonymous players', async () => {
      (UserSessionService.getPlayerId as any).mockReturnValueOnce('anon-12345');
      const result = await service.getMyUnlocks();
      expect(result).toEqual([]);
    });

    it('should return empty array when Supabase is not configured', async () => {
      (isSupabaseConfigured as any).mockReturnValueOnce(false);
      const result = await service.getMyUnlocks();
      expect(result).toEqual([]);
    });

    it('should return unlocked achievements on success', async () => {
      const mockUnlocks = [
        {
          id: 'u1',
          player_id: 'test-player-id',
          achievement_id: 'a1',
          unlocked_at: '2026-01-21T12:00:00Z',
        },
      ];

      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockUnlocks, error: null })),
        })),
      });

      const result = await service.getMyUnlocks();
      expect(result).toHaveLength(1);
      expect(result[0].achievementId).toBe('a1');
      expect(result[0].formattedDate).toBeDefined();
    });

    it('should return empty array and log error on fetch failure', async () => {
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() =>
            Promise.resolve({ data: null, error: { message: 'Fetch error' } })
          ),
        })),
      });

      const result = await service.getMyUnlocks();
      expect(result).toEqual([]);
      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch unlocks'),
        expect.anything()
      );
    });
  });

  describe('getProgress', () => {
    it('should return raw value currently', async () => {
      const result = await service.getProgress('total_kills', 100);
      expect(result).toBe(100);
    });
  });
});
