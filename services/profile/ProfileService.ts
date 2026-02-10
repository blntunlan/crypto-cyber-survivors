import { supabase } from '../supabase/client';
import { Logger } from '../system/Logger';

export interface Profile {
  id: string;
  nickname: string;
  avatar_url?: string;
  updated_at?: string;
}

/**
 * ProfileService - Manages user profiles and nicknames.
 */
export class ProfileService {
  /**
   * Retrieves the profile for a given user ID.
   *
   * @param userId The UUID of the user.
   * @returns The Profile object or null if not found.
   */
  static async getProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // PGRST116 code usually means no rows returned (not found)
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as Profile;
    } catch (err) {
      Logger.error(`[ProfileService] Failed to fetch profile for ${userId}`, err);
      return null;
    }
  }

  /**
   * Updates or creates a user's nickname.
   *
   * @param userId The UUID of the user.
   * @param nickname The desired nickname.
   * @returns The updated Profile object.
   */
  static async updateNickname(userId: string, nickname: string): Promise<Profile> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ nickname })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      Logger.info(`[ProfileService] Updated nickname for ${userId} to ${nickname}`);
      return data as Profile;
    } catch (err) {
      Logger.error(`[ProfileService] Failed to update nickname for ${userId}`, err);
      const errorMessage = (err as Error).message ?? 'Failed to update nickname.';
      throw new Error(errorMessage);
    }
  }
}
