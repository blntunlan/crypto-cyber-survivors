import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileStatsService } from '../../../services/auth/ProfileStatsService';
import { railwayClient } from '../../../services/api/RailwayClient';
import { RailwayAuthService } from '../../../services/auth/RailwayAuthService';
import { AchievementService } from '../../../services/gameplay/AchievementService';

const mocks = vi.hoisted(() => ({
  getProfileId: vi.fn(),
  getNickname: vi.fn(),
  getCurrentProfile: vi.fn(),
  railwayGet: vi.fn(),
  getAchievements: vi.fn(),
  getMyUnlocks: vi.fn(),
}));

vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../../services/auth/UserSessionService', () => ({
  UserSessionService: {
    getProfileId: mocks.getProfileId,
    getNickname: mocks.getNickname,
  },
}));

vi.mock('../../../services/auth/RailwayAuthService', () => ({
  RailwayAuthService: {
    getCurrentProfile: mocks.getCurrentProfile,
  },
}));

vi.mock('../../../services/api/RailwayClient', () => ({
  railwayClient: {
    get: mocks.railwayGet,
  },
}));

vi.mock('../../../services/gameplay/AchievementService', () => ({
  AchievementService: {
    getInstance: vi.fn(() => ({
      getAchievements: mocks.getAchievements,
      getMyUnlocks: mocks.getMyUnlocks,
    })),
  },
}));

const railwayProfile = {
  id: 'profile-1',
  authUserId: 'account-1',
  email: null,
  emailVerified: false,
  displayName: 'Pilot',
  username: null,
  avatarUrl: null,
  level: 3,
  xp: 1250,
  isTester: false,
  isBanned: false,
  primaryAuthProvider: 'nickname',
  createdAt: '2026-06-21T00:00:00.000Z',
  lastSeenAt: '2026-06-21T00:00:00.000Z',
  updatedAt: '2026-06-21T00:00:00.000Z',
};

describe('ProfileStatsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProfileId.mockReturnValue('profile-1');
    mocks.getNickname.mockReturnValue('Pilot');
    mocks.getCurrentProfile.mockResolvedValue(railwayProfile);
    mocks.getAchievements.mockResolvedValue([]);
    mocks.getMyUnlocks.mockResolvedValue([]);
    mocks.railwayGet.mockReset();
  });

  it('returns a local profile for local-only nickname identity', async () => {
    mocks.getProfileId.mockReturnValue('00000000-0000-4000-a000-000000000000');
    mocks.getNickname.mockReturnValue('LocalPilot');

    const result = await ProfileStatsService.getInstance().getFullProfile();

    expect(result?.id).toBe('00000000-0000-4000-a000-000000000000');
    expect(result?.displayName).toBe('LocalPilot');
    expect(result?.primaryAuthProvider).toBe('nickname');
    expect(result?.stats.source).toBe('local');
    expect(RailwayAuthService.getCurrentProfile).not.toHaveBeenCalled();
  });

  it('uses Railway profile stats when the backend endpoint responds', async () => {
    mocks.railwayGet.mockResolvedValueOnce({
      stats: {
        totalKills: 42,
        totalSurvivalTime: 360,
        totalGames: 3,
        maxSurvivalTime: 180,
        maxKills: 20,
        totalGoldEarned: 150,
        goldBalance: 99,
        gemsBalance: 0,
      },
    });
    mocks.getAchievements.mockResolvedValueOnce([
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
    ]);
    mocks.getMyUnlocks.mockResolvedValueOnce([
      {
        id: 'unlock-1',
        profileId: 'profile-1',
        achievementId: 'first-blood',
        unlockedAt: '2026-06-21T00:00:00.000Z',
        formattedDate: '6/21/2026',
      },
    ]);

    const result = await ProfileStatsService.getInstance().getFullProfile();

    expect(railwayClient.get).toHaveBeenCalledWith('/api/v1/profile/stats');
    expect(result?.stats.totalKills).toBe(42);
    expect(result?.stats.source).toBe('railway');
    expect(result?.stats.hasVerifiedRuns).toBe(true);
    expect(result?.achievements.all).toHaveLength(1);
    expect(result?.achievements.unlocked).toHaveLength(1);
  });

  it('falls back to wallet balance while marking gameplay stats unavailable', async () => {
    mocks.railwayGet.mockImplementation(async (path: string) => {
      if (path === '/api/v1/profile/stats') {
        throw new Error('stats endpoint unavailable');
      }
      if (path === '/api/v1/economy/wallet') {
        return { wallet: { balance: 77 } };
      }
      throw new Error(`Unexpected path ${path}`);
    });

    const result = await ProfileStatsService.getInstance().getFullProfile();

    expect(result?.stats.goldBalance).toBe(77);
    expect(result?.stats.totalGames).toBe(0);
    expect(result?.stats.source).toBe('unavailable');
    expect(result?.stats.hasVerifiedRuns).toBe(false);
  });

  it('returns null when Railway profile identity cannot be loaded', async () => {
    mocks.getCurrentProfile.mockResolvedValueOnce(null);

    const result = await ProfileStatsService.getInstance().getFullProfile();

    expect(result).toBeNull();
    expect(AchievementService.getInstance).not.toHaveBeenCalled();
  });
});
