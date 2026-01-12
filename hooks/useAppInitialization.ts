/**
 * useAppInitialization - Application Initialization Hook
 *
 * Handles all one-time initialization tasks on app startup:
 * - Error tracking initialization
 * - Player tracking initialization
 * - Device profiling and sync
 * - Device benchmarking
 * - Nickname check
 */

import { useEffect, useState } from 'react';
import { UserSessionService } from '../services/auth/UserSessionService';
import { DeviceBenchmarkService } from '../services/DeviceBenchmarkService';

interface UseAppInitializationResult {
  /** Whether the user needs to set a nickname */
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

  useEffect(() => {
    // Initialize error tracking (auto-initializes on import)
    void import('../services/analytics/ErrorTracker');

    // Initialize player tracking (auto-initializes on import)
    void import('../services/analytics/PlayerTracker');

    // Initialize crash/error reporting
    void import('../services/analytics/ErrorReporter').then(({ ErrorReporter }) => {
      ErrorReporter.init();
    });

    // Sync device profile
    void import('../services/analytics/DeviceProfiler').then(({ DeviceProfiler }) => {
      void DeviceProfiler.syncToSupabase();
    });

    // Check if player needs to set a nickname
    if (!UserSessionService.hasStoredUser()) {
      setNeedsNickname(true);
    }

    // Run device benchmark
    void DeviceBenchmarkService.runBenchmark();

    // Initialize market state realtime feed
    void import('../services/MarketStateService').then(({ MarketStateService }) => {
      void MarketStateService.init();
    });

    // Mark initialization complete
    setIsInitialized(true);
  }, []);

  return {
    needsNickname,
    setNeedsNickname,
    isInitialized,
  };
}
