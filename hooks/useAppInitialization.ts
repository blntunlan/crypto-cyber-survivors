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
      // 1. Initialize client integrity checks
      AntiCheatService.init();

      if (isMounted) {
        setIsInitialized(true);
      }

      // 2. Schedule non-critical background services after page is interactive
      if (import.meta.env.MODE === 'test') {
        void import('../services/analytics/ErrorTracker');
        void import('../services/analytics/PlayerTracker');
        void DeviceBenchmarkService.runBenchmark();
      } else {
        const scheduleIdle =
          'requestIdleCallback' in window
            ? window.requestIdleCallback
            : (cb: () => void) => setTimeout(cb, 2000);
        scheduleIdle(() => {
          if (!isMounted) return;
          void import('../services/analytics/ErrorTracker');
          void import('../services/analytics/PlayerTracker');
          void DeviceBenchmarkService.runBenchmark();
        });
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
