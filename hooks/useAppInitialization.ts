/**
 * useAppInitialization - Application Initialization Hook
 *
 * Handles all one-time initialization tasks on app startup:
 * - Error tracking initialization
 * - Player tracking initialization
 * - Device benchmarking
 * - Auth check intentionally disabled (temporary architecture reset)
 */

import { useEffect, useState } from 'react';
import { DeviceBenchmarkService } from '../services/system/DeviceBenchmarkService';
import { AntiCheatService } from '../services/system/AntiCheatService';
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

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      // 1. Initialize core analytics services
      void import('../services/analytics/ErrorTracker');
      void import('../services/analytics/PlayerTracker');

      // 2. Run device benchmark
      void DeviceBenchmarkService.runBenchmark();

      // 3. Initialize client integrity checks and cheat telemetry
      AntiCheatService.init();

      // 4. Market state now handled by SSE via useMarketData hook
      if (isMounted) {
        setIsInitialized(true);
      }
    };

    void init();

    return () => {
      isMounted = false;
      AntiCheatService.destroy();
    };
  }, []);

  return {
    isInitialized,
  };
}
