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

import { useEffect, useState } from 'react';
import { DeviceBenchmarkService } from '../services/system/DeviceBenchmarkService';
interface UseAppInitializationResult {
  /** Whether initialization is complete */
  isInitialized: boolean;
}

/**
 * Hook to handle application initialization
 * @returns Initialization state and controls
 */
export function useAppInitialization(): UseAppInitializationResult {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [hasStartedInit, setHasStartedInit] = useState<boolean>(false);

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

      // 4. Market state now handled by SSE via useMarketData hook

      setIsInitialized(true);
    };

    void init();
  }, [hasStartedInit]);

  return {
    isInitialized,
  };
}
