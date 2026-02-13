import { supabase, isSupabaseConfigured } from '../supabase/client';
import { Logger } from '../system/Logger';
import { UserSessionService } from '../auth/UserSessionService';
import { type Achievement, type ProfileAchievement } from '../../types';

interface DBAchievement {
  id: string;
  name: string;
  description: string;
  category: string;
  icon_key: string;
  condition_type: string;
  condition_value: number;
  reward_gold: number;
  is_active: boolean;
}

export class AchievementService {
  private static instance: AchievementService | null = null;

  private constructor() {}

  static getInstance(): AchievementService {
    AchievementService.instance ??= new AchievementService();
    return AchievementService.instance;
  }

  /**
   * Fetch all achievement definitions
   */
  async getAchievements(): Promise<Achievement[]> {
    if (!isSupabaseConfigured()) {
      Logger.warn('Supabase client not initialized');
      return [];
    }

    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('is_active', true)
      .order('condition_value', { ascending: true });

    if (error) {
      Logger.error('[AchievementService] Failed to fetch achievements', error);
      return [];
    }

    return (data as DBAchievement[]).map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category as 'combat' | 'survival' | 'trading' | 'misc',
      iconKey: item.icon_key,
      conditionType: item.condition_type as
        | 'total_kills'
        | 'survival_seconds'
        | 'max_level'
        | 'pnl_percent',
      conditionValue: item.condition_value,
      rewardGold: item.reward_gold,
      isActive: item.is_active,
    }));
  }

  /**
   * Fetch unlocked achievements for the current player
   */
  async getMyUnlocks(): Promise<ProfileAchievement[]> {
    const profileId = UserSessionService.getProfileId();
    if (profileId.startsWith('anon_')) return [];

    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('profile_achievements')
      .select('*')
      .eq('profile_id', profileId);

    if (error) {
      Logger.error('[AchievementService] Failed to fetch unlocks', error);
      return [];
    }

    interface ProfileAchievementRow {
      id: string;
      profile_id: string | null;
      achievement_id: string | null;
      unlocked_at: string | null;
    }

    return (data as ProfileAchievementRow[]).map(item => ({
      id: item.id,
      profileId: item.profile_id ?? '',
      achievementId: item.achievement_id ?? '',
      unlockedAt: item.unlocked_at ?? '',
      formattedDate: item.unlocked_at
        ? new Date(item.unlocked_at).toLocaleDateString()
        : '',
    }));
  }

  /**
   * Get progress towards specific achievements (Client-side estimation)
   * Note: Real verification happens on server, this is just for UI bars
   */
  async getProgress(
    _stat: 'total_kills' | 'max_level' | 'survival_seconds',
    currentValue: number
  ): Promise<number> {
    // stat param will be used when we implement client-side tracking logic
    // For now we just return the raw value
    return currentValue;
  }
}
