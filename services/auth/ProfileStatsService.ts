import { supabase } from '../core/Supabase';
import { Logger } from '../system/Logger';
import { UserSessionService } from '../auth/UserSessionService';
import { AchievementService } from '../gameplay/AchievementService';
import { type FullProfileData, type PlayerStats } from '../../types/profile';
import { SupabaseAuthService, type AuthProvider } from '../auth/SupabaseAuthService';

/**
 * ProfileStatsService - Aggregates player statistics and achievements
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
      // 1. Base Profile
      const profileResult = await SupabaseAuthService.getCurrentProfile();
      if (!profileResult) return null;

      // 2. Stats from Sessions
      const stats = await this.aggregateSessionStats(profileId);

      // 3. Balance from Virtual Accounts
      const balance = await this.getVirtualAccountBalance(profileId);

      // 4. Achievements
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
          goldBalance: balance.gold,
          gemsBalance: balance.gems,
          totalGoldEarned: balance.totalEarned,
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

  private async aggregateSessionStats(
    profileId: string
  ): Promise<Omit<PlayerStats, 'goldBalance' | 'gemsBalance' | 'totalGoldEarned'>> {
    if (!supabase) {
      return {
        totalKills: 0,
        totalSurvivalTime: 0,
        totalGames: 0,
        maxSurvivalTime: 0,
        maxKills: 0,
      };
    }

    const { data, error } = await supabase
      .from('sessions')
      .select('survival_seconds, kills')
      .eq('profile_id', profileId);

    if (error) {
      Logger.error('[ProfileStatsService] Error aggregating session stats:', error);
      return {
        totalKills: 0,
        totalSurvivalTime: 0,
        totalGames: 0,
        maxSurvivalTime: 0,
        maxKills: 0,
      };
    }

    const sessions = data;
    const stats = {
      totalKills: 0,
      totalSurvivalTime: 0,
      totalGames: sessions.length,
      maxKills: 0,
      maxSurvivalTime: 0,
    };

    for (const s of sessions) {
      const kills = s.kills ?? 0;
      const survivalSeconds = s.survival_seconds ?? 0;
      stats.totalKills += kills;
      stats.totalSurvivalTime += survivalSeconds;
      stats.maxKills = Math.max(stats.maxKills, kills);
      stats.maxSurvivalTime = Math.max(stats.maxSurvivalTime, survivalSeconds);
    }

    return stats;
  }

  private async getVirtualAccountBalance(
    profileId: string
  ): Promise<{ gold: number; gems: number; totalEarned: number }> {
    if (!supabase) return { gold: 0, gems: 0, totalEarned: 0 };

    const { data, error } = await supabase
      .from('virtual_accounts')
      .select('gold_balance, gems_balance, total_earned_gold')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error || !data) {
      return { gold: 0, gems: 0, totalEarned: 0 };
    }

    return {
      gold: Number(data.gold_balance ?? 0),
      gems: Number(data.gems_balance ?? 0),
      totalEarned: Number(data.total_earned_gold ?? 0),
    };
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
