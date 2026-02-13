/**
 * useAppInitialization - Application Initialization Hook
 *
 * Handles all one-time initialization tasks on app startup:
 * - Error tracking initialization
 * - Player tracking initialization
 * - Device profiling and sync
 * - Device benchmarking
 * - Auth check intentionally disabled (temporary architecture reset)
 */

import { useEffect, useState, useCallback } from 'react';
import { DeviceBenchmarkService } from '../services/system/DeviceBenchmarkService';
import { Logger } from '../services/system/Logger';
interface UseAppInitializationResult {
  /** Legacy flag kept for compatibility (always false) */
  needsNickname: boolean;
  /** Legacy setter kept for compatibility */
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

      // 5. Auth reset mode: always allow direct entry to hub flow.
      setNeedsNicknameWithLog(false);

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
