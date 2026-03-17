import { Logger } from '../system/Logger';
import { UserSessionService } from '../auth/UserSessionService';
import { AchievementService } from '../gameplay/AchievementService';
import { type FullProfileData, type PlayerStats } from '../../types/profile';
import { SupabaseAuthService, type AuthProvider } from '../auth/SupabaseAuthService';

/**
 * ProfileStatsService - Aggregates player statistics and achievements
 * Uses Railway API instead of direct Supabase DB queries.
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
    const isGuest = !profileId || profileId.startsWith('anon_');

    if (isGuest) {
      return this.getGuestProfile();
    }

    try {
      // 1. Base Profile (via Railway API through SupabaseAuthService)
      const profileResult = await SupabaseAuthService.getCurrentProfile();
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
    };

    try {
      const { railwayClient } = await import('../api/RailwayClient');

      // Fetch balance
      const balanceData = await railwayClient
        .get<{ balance: number }>('/api/v1/wallet/balance')
        .catch(() => ({ balance: 0 }));

      return {
        ...defaults,
        goldBalance: balanceData.balance,
      };
    } catch {
      return defaults;
    }
  }

  private getGuestProfile(): FullProfileData {
    const nickname = UserSessionService.getNickname() ?? 'Guest';
    return {
      id: 'guest',
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
      },
      achievements: {
        all: [],
        unlocked: [],
      },
    };
  }
}
