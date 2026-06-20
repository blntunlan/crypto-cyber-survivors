import { Logger } from '../system/Logger';
import { UserSessionService } from '../auth/UserSessionService';
import { AchievementService } from '../gameplay/AchievementService';
import { type FullProfileData, type PlayerStats } from '../../types/profile';
import { RailwayAuthService, type AuthProvider } from '../auth/RailwayAuthService';
import { railwayClient } from '../api/RailwayClient';

type EconomyWalletResponse = {
  wallet: {
    balance: number;
  };
};

type ProfileStatsResponse = {
  stats: Partial<PlayerStats>;
};

const LOCAL_ONLY_PROFILE_ID = '00000000-0000-4000-a000-000000000000';

function isLocalOnlyProfileId(profileId: string): boolean {
  return profileId.startsWith('anon_') || profileId === LOCAL_ONLY_PROFILE_ID;
}

/**
 * ProfileStatsService - Aggregates player statistics and achievements
 * Uses Railway API instead of direct DB queries.
 */
export class ProfileStatsService {
  private static instance: ProfileStatsService | null = null;

  static getInstance(): ProfileStatsService {
    return (this.instance ??= new ProfileStatsService());
  }

  /**
   * Fetches comprehensive profile data including stats and achievements
   */
  async getFullProfile(): Promise<FullProfileData | null> {
    const profileId = UserSessionService.getProfileId();

    if (isLocalOnlyProfileId(profileId)) {
      return this.getLocalProfile(profileId);
    }

    try {
      // 1. Base Profile (via Railway API through RailwayAuthService)
      const profileResult = await RailwayAuthService.getCurrentProfile();
      if (!profileResult) return null;

      // 2. Stats + Balance via Railway API
      const stats = await this.fetchStatsFromRailway();

      // 3. Achievements
      const achievementService = AchievementService.getInstance();
      const allAchievements = await achievementService.getAchievements();
      const unlockedAchievements = await achievementService.getMyUnlocks();

      return {
        id: profileResult.id,
        displayName: profileResult.displayName,
        username: profileResult.username ?? null,
        avatarUrl: profileResult.avatarUrl ?? null,
        level: profileResult.level,
        xp: profileResult.xp,
        isTester: profileResult.isTester,
        primaryAuthProvider: profileResult.primaryAuthProvider as AuthProvider,
        createdAt: profileResult.createdAt,
        stats: {
          ...stats,
        },
        achievements: {
          all: allAchievements.map(a => ({
            ...a,
            iconKey: a.iconKey ?? 'default',
          })),
          unlocked: unlockedAchievements.map(u => ({
            ...u,
            formattedDate: u.formattedDate ?? new Date().toLocaleDateString(),
          })),
        },
      };
    } catch (error) {
      Logger.error('[ProfileStatsService] Error building full profile:', error);
      return null;
    }
  }

  private async fetchStatsFromRailway(): Promise<PlayerStats> {
    const defaults: PlayerStats = {
      totalKills: 0,
      totalSurvivalTime: 0,
      totalGames: 0,
      maxSurvivalTime: 0,
      maxKills: 0,
      goldBalance: 0,
      gemsBalance: 0,
      totalGoldEarned: 0,
      source: 'unavailable',
      hasVerifiedRuns: false,
    };

    try {
      const profileStats = await railwayClient.get<ProfileStatsResponse>(
        '/api/v1/profile/stats'
      );
      return this.normalizeStats(profileStats.stats, 'railway');
    } catch {
      // Fetch balance
      const balanceData = await railwayClient
        .get<EconomyWalletResponse>('/api/v1/economy/wallet')
        .catch(() => ({ wallet: { balance: 0 } }));

      return {
        ...defaults,
        goldBalance: balanceData.wallet.balance,
      };
    }
  }

  private normalizeStats(
    stats: Partial<PlayerStats>,
    source: PlayerStats['source']
  ): PlayerStats {
    const normalized = {
      totalKills: Math.max(0, Math.floor(stats.totalKills ?? 0)),
      totalSurvivalTime: Math.max(0, Math.floor(stats.totalSurvivalTime ?? 0)),
      totalGames: Math.max(0, Math.floor(stats.totalGames ?? 0)),
      maxSurvivalTime: Math.max(0, Math.floor(stats.maxSurvivalTime ?? 0)),
      maxKills: Math.max(0, Math.floor(stats.maxKills ?? 0)),
      totalGoldEarned: Math.max(0, Math.floor(stats.totalGoldEarned ?? 0)),
      goldBalance: Math.max(0, Math.floor(stats.goldBalance ?? 0)),
      gemsBalance: Math.max(0, Math.floor(stats.gemsBalance ?? 0)),
      source,
    };

    return {
      ...normalized,
      hasVerifiedRuns: normalized.totalGames > 0,
    };
  }

  private getLocalProfile(profileId: string): FullProfileData {
    const nickname = UserSessionService.getNickname() ?? 'Guest';
    return {
      id: profileId,
      displayName: nickname,
      username: null,
      avatarUrl: null,
      level: 1,
      xp: 0,
      isTester: false,
      primaryAuthProvider: 'nickname',
      createdAt: new Date().toISOString(),
      stats: {
        totalKills: 0,
        totalSurvivalTime: 0,
        totalGames: 0,
        maxSurvivalTime: 0,
        maxKills: 0,
        goldBalance: 0,
        gemsBalance: 0,
        totalGoldEarned: 0,
        source: 'local',
        hasVerifiedRuns: false,
      },
      achievements: {
        all: [],
        unlocked: [],
      },
    };
  }
}
