/**
 * SupabaseUtils - Critical utilities for safe data fetching and error recovery
 */

import { supabase, isSupabaseConfigured } from '../supabase/client';
import { Logger } from '../system/Logger';
import { UserPersistenceService } from '../auth/UserPersistenceService';
import {
  type Result,
  success,
  failure,
  DatabaseError,
  type AppError,
} from '../../types/errors';
import ErrorTracker from '../analytics/ErrorTracker';

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
  ): Promise<Result<T, DatabaseError>> {
    try {
      const { data, error } = await query.maybeSingle();

      if (error) {
        Logger.error(`[SupabaseUtils] Fetch ${resourceName} error:`, error);
        return failure(
          new DatabaseError(`Failed to fetch ${resourceName}`, { error }, error)
        );
      }

      if (!data && critical) {
        Logger.warn(
          `[SupabaseUtils] Critical resource ${resourceName} missing. Triggering recovery...`
        );
        this.handleCriticalResourceMissing(resourceName);
        return failure(
          new DatabaseError(`Critical resource ${resourceName} missing`, {
            critical: true,
          })
        );
      }

      if (!data) {
        return failure(
          new DatabaseError(`${resourceName} not found`, { notFound: true })
        );
      }

      return success(data as T);
    } catch (e) {
      Logger.error(`[SupabaseUtils] Unexpected error fetching ${resourceName}:`, e);
      return failure(
        new DatabaseError(
          `Unexpected error fetching ${resourceName}`,
          { rawError: e },
          e
        )
      );
    }
  }

  /**
   * withResilience - High-order function for resilient async operations
   * Features: Retry logic, error tracking, and fallback support
   */
  static async withResilience<T>(
    operation: () => Promise<T>,
    options: {
      name: string;
      maxRetries?: number;
      fallbackValue?: T;
      silent?: boolean;
    }
  ): Promise<Result<T, AppError>> {
    const { name, maxRetries = 3, fallbackValue, silent = false } = options;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        return success(result);
      } catch (err) {
        lastError = err;

        if (attempt < maxRetries) {
          const delay = 1000 * Math.pow(2, attempt - 1);
          if (!silent) {
            Logger.warn(
              `[Resilience] ${name} failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`
            );
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Handled max retries reached
    const error: AppError = {
      code: 'RESILIENCE_FAILURE',
      message: `Operation ${name} failed after ${maxRetries} attempts`,
      severity: 'high',
      isRetryable: false,
      context: { name, attempts: maxRetries },
      originalError: lastError,
    };

    if (!silent) {
      Logger.error(`[Resilience] ${name} failed permanently`, lastError);
      void ErrorTracker.captureError({
        errorType: 'ResilienceError',
        errorMessage: error.message,
        severity: 'high',
        context: error.context,
      });
    }

    if (fallbackValue !== undefined) {
      return success(fallbackValue);
    }

    return failure(error);
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
    if (!isSupabaseConfigured()) return;

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
