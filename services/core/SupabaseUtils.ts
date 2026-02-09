/**
 * SupabaseUtils - Critical utilities for safe data fetching and error recovery
 */

import { supabase } from './Supabase';
import { Logger } from '../system/Logger';
import { UserPersistenceService } from '../auth/UserPersistenceService';

export class SupabaseUtils {
  /**
   * Safe fetch for a single record.
   * Handles 406 (Not Found) by returning null and logging recovery metrics.
   *
   * @param query The Supabase query object
   * @param resourceName Human readable name for the resource
   * @param critical If true, triggers local storage clearing on "Not Found"
   */
  static async safeFetchSingle<T>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: any,
    resourceName: string,
    critical: boolean = false
  ): Promise<T | null> {
    try {
      const { data, error } = await query.maybeSingle();

      if (error) {
        // PostgREST error 406 is returned when multiple or no rows are found but .single() was expected
        // Here we use .maybeSingle() to get null instead, but we check if it was fundamentally missing
        Logger.error(`[SupabaseUtils] Fetch ${resourceName} error:`, error);
        return null;
      }

      if (!data && critical) {
        Logger.warn(
          `[SupabaseUtils] Critical resource ${resourceName} missing. Triggering recovery...`
        );
        this.handleCriticalResourceMissing(resourceName);
        return null;
      }

      return data as T;
    } catch (e) {
      Logger.error(`[SupabaseUtils] Unexpected error fetching ${resourceName}:`, e);
      return null;
    }
  }

  /**
   * Handles scenarios where local state thinks a profile exists but the DB doesn't.
   */
  private static handleCriticalResourceMissing(resourceName: string): void {
    if (resourceName.toLowerCase().includes('profile')) {
      const stored = UserPersistenceService.getLegacyStoredUser();
      if (stored) {
        Logger.info(
          '[SupabaseUtils] Clearing stale local profile ID:',
          stored.profileId
        );
        UserPersistenceService.clear();
        // The App should handle the redirect/refresh based on the missing profile
      }
    }
  }

  /**
   * Standardized error reporter for client-side failures
   */
  static async reportClientError(
    message: string,
    category: string,
    context?: unknown
  ): Promise<void> {
    if (!supabase) return;

    try {
      await supabase.from('error_reports').insert({
        error_type: 'CLIENT_RECOVERY',
        message,
        category,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        context_data: (context as any) ?? {},
        device_fingerprint: localStorage.getItem('crypto_survivors_fingerprint') ?? '',
      });
    } catch (e) {
      // Don't crash on error reporting
      console.error('Failed to report error:', e);
    }
  }
}
