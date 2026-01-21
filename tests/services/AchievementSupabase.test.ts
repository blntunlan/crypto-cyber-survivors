import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AchievementService } from '../../services/AchievementService';
import { supabase } from '../../services/Supabase';

// Mock Supabase
vi.mock('../../services/Supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: '1',
                name: 'Test Achievement',
                description: 'Desc',
                category: 'combat',
                icon_key: 'icon',
                condition_type: 'total_kills',
                condition_value: 100,
                reward_gold: 50,
                is_active: true,
              },
            ],
            error: null,
          }),
        })),
      })),
    })),
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

describe('AchievementService Supabase Integration', () => {
  const service = AchievementService.getInstance();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and map achievements correctly', async () => {
    const achievements = await service.getAchievements();

    expect(achievements).toHaveLength(1);
    expect(achievements[0].id).toBe('1');
    expect(achievements[0].conditionType).toBe('total_kills'); // verify mapping
    expect(achievements[0].rewardGold).toBe(50);
  });

  it('should return empty array on database error', async () => {
    // @ts-expect-error: testing
    supabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi
            .fn()
            .mockResolvedValue({ data: null, error: { message: 'DB Error' } }),
        })),
      })),
    });

    const achievements = await service.getAchievements();
    expect(achievements).toEqual([]);
  });
});
