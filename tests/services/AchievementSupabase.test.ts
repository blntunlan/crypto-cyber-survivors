import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AchievementService } from '../../services/gameplay/AchievementService';
import { railwayClient } from '../../services/api/RailwayClient';

vi.mock('../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../services/auth/UserSessionService', () => ({
  UserSessionService: {
    getProfileId: vi.fn(() => 'test-profile-id'),
    getNickname: vi.fn(() => 'TestUser'),
  },
}));

vi.mock('../../services/api/RailwayClient', () => ({
  railwayClient: {
    get: vi.fn(),
  },
}));

describe('AchievementService', () => {
  let service: AchievementService;
  const mockGet = vi.mocked(railwayClient.get);

  beforeEach(() => {
    vi.clearAllMocks();
    service = AchievementService.getInstance();
  });

  describe('getAchievements', () => {
    it('fetches achievement definitions from Railway', async () => {
      mockGet.mockResolvedValueOnce({
        achievements: [
          {
            id: 'first-blood',
            name: 'First Blood',
            description: 'Kill one enemy',
            category: 'combat',
            iconKey: 'trophy',
            conditionType: 'total_kills',
            conditionValue: 1,
            rewardGold: 25,
            isActive: true,
          },
        ],
      });

      const result = await service.getAchievements();
      expect(mockGet).toHaveBeenCalledWith('/api/v1/achievements');
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe('first-blood');
    });

    it('returns empty array when achievement catalog is unavailable', async () => {
      mockGet.mockRejectedValueOnce(new Error('not implemented'));

      const result = await service.getAchievements();
      expect(result).toEqual([]);
    });
  });

  describe('getMyUnlocks', () => {
    it('should return empty array for anonymous players', async () => {
      const { UserSessionService } =
        await import('../../services/auth/UserSessionService');
      vi.mocked(UserSessionService.getProfileId).mockReturnValueOnce('anon_12345');
      const result = await service.getMyUnlocks();
      expect(result).toEqual([]);
    });

    it('fetches unlocked achievements from Railway', async () => {
      mockGet.mockResolvedValueOnce({
        unlocked: [
          {
            id: 'unlock-1',
            profileId: 'test-profile-id',
            achievementId: 'first-blood',
            unlockedAt: '2026-06-21T00:00:00.000Z',
            formattedDate: '6/21/2026',
          },
        ],
      });

      const result = await service.getMyUnlocks();
      expect(mockGet).toHaveBeenCalledWith('/api/v1/achievements/mine');
      expect(result).toHaveLength(1);
      expect(result[0]?.achievementId).toBe('first-blood');
    });

    it('returns empty array when player achievements are unavailable', async () => {
      mockGet.mockRejectedValueOnce(new Error('not implemented'));

      const result = await service.getMyUnlocks();
      expect(result).toEqual([]);
    });
  });

  describe('getProgress', () => {
    it('should return raw value currently', async () => {
      const result = await service.getProgress('total_kills', 100);
      expect(result).toBe(100);
    });
  });
});
