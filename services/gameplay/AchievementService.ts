import { Logger } from '../system/Logger';
import { UserSessionService } from '../auth/UserSessionService';
import { type Achievement, type ProfileAchievement } from '../../types';

export class AchievementService {
  private static instance: AchievementService | null = null;

  private constructor() {}

  static getInstance(): AchievementService {
    AchievementService.instance ??= new AchievementService();
    return AchievementService.instance;
  }

  /**
   * Fetch all achievement definitions.
   * TODO: Move achievements table to Railway DB and add GET /api/v1/achievements endpoint.
   */
  async getAchievements(): Promise<Achievement[]> {
    // Achievements table not yet in Railway DB
    return [];
  }

  /**
   * Fetch unlocked achievements for the current player.
   * TODO: Add GET /api/v1/achievements/mine endpoint to Railway server.
   */
  async getMyUnlocks(): Promise<ProfileAchievement[]> {
    const profileId = UserSessionService.getProfileId();
    if (profileId.startsWith('anon_')) return [];

    // Achievements not yet in Railway DB
    return [];
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
