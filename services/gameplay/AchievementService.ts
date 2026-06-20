import { Logger } from '../system/Logger';
import { UserSessionService } from '../auth/UserSessionService';
import { type Achievement, type ProfileAchievement } from '../../types';
import { railwayClient } from '../api/RailwayClient';

type AchievementsResponse = {
  achievements?: Achievement[];
};

type MyAchievementsResponse = {
  unlocked?: ProfileAchievement[];
  achievements?: ProfileAchievement[];
};

const LOCAL_ONLY_PROFILE_ID = '00000000-0000-4000-a000-000000000000';

function isLocalOnlyProfileId(profileId: string): boolean {
  return profileId.startsWith('anon_') || profileId === LOCAL_ONLY_PROFILE_ID;
}

export class AchievementService {
  private static instance: AchievementService | null = null;

  private constructor() {}

  static getInstance(): AchievementService {
    AchievementService.instance ??= new AchievementService();
    return AchievementService.instance;
  }

  /**
   * Fetch all achievement definitions.
   */
  async getAchievements(): Promise<Achievement[]> {
    try {
      const result =
        await railwayClient.get<AchievementsResponse>('/api/v1/achievements');
      return result.achievements ?? [];
    } catch {
      Logger.warn('[AchievementService] Achievement catalog unavailable');
      return [];
    }
  }

  /**
   * Fetch unlocked achievements for the current player.
   */
  async getMyUnlocks(): Promise<ProfileAchievement[]> {
    const profileId = UserSessionService.getProfileId();
    if (isLocalOnlyProfileId(profileId)) return [];

    try {
      const result = await railwayClient.get<MyAchievementsResponse>(
        '/api/v1/achievements/mine'
      );
      return result.unlocked ?? result.achievements ?? [];
    } catch {
      Logger.warn('[AchievementService] Player achievements unavailable');
      return [];
    }
  }

  /**
   * Get progress towards specific achievements (Client-side estimation)
   */
  async getProgress(
    _stat: 'total_kills' | 'max_level' | 'survival_seconds',
    currentValue: number
  ): Promise<number> {
    Logger.debug('[AchievementService] getProgress called');
    return currentValue;
  }
}
