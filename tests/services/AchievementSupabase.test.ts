import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AchievementService } from '../../services/gameplay/AchievementService';

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

describe('AchievementService', () => {
  let service: AchievementService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = AchievementService.getInstance();
  });

  describe('getAchievements', () => {
    it('should return empty array (achievements not yet in Railway DB)', async () => {
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

    it('should return empty array (achievements not yet in Railway DB)', async () => {
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
