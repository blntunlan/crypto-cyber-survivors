/**
 * useAppInitialization - Application Initialization Hook
 *
 * Handles all one-time initialization tasks on app startup:
 * - Error tracking initialization
 * - Player tracking initialization
 * - Device profiling and sync
 * - Device benchmarking
 * - Authentication check:
 *   - DEV: Skip login entirely, use anonymous session
 *   - PROD: Require authentication (OAuth/Magic Link)
 */

import { useEffect, useState, useCallback } from 'react';
import { DeviceBenchmarkService } from '../services/system/DeviceBenchmarkService';
import { Logger } from '../services/system/Logger';
import { UserPersistenceService } from '../services/auth/UserPersistenceService';

interface UseAppInitializationResult {
  /** Whether the user needs to authenticate (PROD only) */
  needsNickname: boolean;
  /** Set needsNickname state */
  setNeedsNickname: (value: boolean) => void;
  /** Whether initialization is complete */
  isInitialized: boolean;
}

/**
 * Hook to handle application initialization
 * @returns Initialization state and controls
 */
export function useAppInitialization(): UseAppInitializationResult {
  const [needsNickname, setNeedsNickname] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [hasStartedInit, setHasStartedInit] = useState<boolean>(false);

  // Memoized setter that logs for debugging
  const setNeedsNicknameWithLog = useCallback((value: boolean) => {
    Logger.debug(`[useAppInitialization] setNeedsNickname: ${value}`);
    setNeedsNickname(value);
  }, []);

  useEffect(() => {
    if (hasStartedInit) return;
    setHasStartedInit(true);

    const init = async () => {
      // 1. Initialize core analytics services
      void import('../services/analytics/ErrorTracker');
      void import('../services/analytics/PlayerTracker');

      // 2. Sync device profile
      void import('../services/analytics/DeviceProfiler').then(({ DeviceProfiler }) => {
        void DeviceProfiler.syncToSupabase();
      });

      // 3. Run device benchmark
      void DeviceBenchmarkService.runBenchmark();

      // 4. Initialize market state realtime feed
      void import('../services/market/MarketStateService').then(
        ({ MarketStateService }) => {
          void MarketStateService.init();
        }
      );

      // 5. Check authentication based on environment
      const isDev = import.meta.env.DEV;

      if (isDev) {
        // DEV MODE: Check for existing user
        Logger.info('[useAppInitialization] DEV MODE: Checking authentication');

        const user = await UserPersistenceService.initialize();
        if (user) {
          setNeedsNicknameWithLog(false);
        } else {
          setNeedsNicknameWithLog(true);
        }
      } else {
        // PRODUCTION MODE: Require authentication
        Logger.info('[useAppInitialization] PROD MODE: Checking authentication');

        // Check for authenticated Supabase session
        const { supabase, isSupabaseConfigured } =
          await import('../services/core/Supabase');

        if (isSupabaseConfigured() && supabase) {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session?.user) {
            // User is authenticated
            Logger.info(
              `[useAppInitialization] User authenticated: ${session.user.email}`
            );

            // Ensure profile exists
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, display_name')
              .eq('auth_user_id', session.user.id)
              .maybeSingle();

            if (profile) {
              // Profile exists, sync with local storage
              await UserPersistenceService.createOrUpdateUser(
                profile.display_name || session.user.email?.split('@')[0] || 'Player',
                false
              );
              setNeedsNicknameWithLog(false);
            } else {
              // No profile yet - need to create one (show auth screen)
              setNeedsNicknameWithLog(true);
            }
          } else {
            // Not authenticated - show auth screen
            Logger.info(
              '[useAppInitialization] No session found, requiring authentication'
            );
            setNeedsNicknameWithLog(true);
          }
        } else {
          // Supabase not configured - fallback to dev mode
          Logger.warn(
            '[useAppInitialization] Supabase not configured, falling back to dev mode'
          );
          setNeedsNicknameWithLog(false);
        }
      }

      setIsInitialized(true);
    };

    void init();
  }, [hasStartedInit, setNeedsNicknameWithLog]);

  return {
    needsNickname,
    setNeedsNickname: setNeedsNicknameWithLog,
    isInitialized,
  };
}
