/**
 * useAppInitialization - Application Initialization Hook
 *
 * Handles all one-time initialization tasks on app startup:
 * - Error tracking initialization
 * - Player tracking initialization
 * - Device profiling and sync
 * - Device benchmarking
 * - Nickname check (waits for localStorage to load first)
 */

import { useEffect, useState, useCallback } from 'react';
import { DeviceBenchmarkService } from '../services/DeviceBenchmarkService';
import { Logger } from '../services/Logger';

// Storage key must match UserContext
const STORAGE_KEY = 'crypto_survivors_user';

interface UseAppInitializationResult {
  /** Whether the user needs to set a nickname */
  needsNickname: boolean;
  /** Set needsNickname state */
  setNeedsNickname: (value: boolean) => void;
  /** Whether initialization is complete */
  isInitialized: boolean;
}

/**
 * Checks localStorage with a small delay to handle mobile timing issues.
 * Mobile browsers sometimes have async storage access.
 */
function checkStoredUserWithRetry(): Promise<boolean> {
  return new Promise(resolve => {
    // First immediate check
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.playerId && parsed?.nickname) {
          Logger.debug('[useAppInitialization] User found in storage immediately');
          resolve(true);
          return;
        }
      }
    } catch {
      // Ignore parse errors
    }

    // Second check after short delay (for mobile localStorage race conditions)
    setTimeout(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.playerId && parsed?.nickname) {
            Logger.debug('[useAppInitialization] User found in storage after delay');
            resolve(true);
            return;
          }
        }
      } catch {
        // Ignore parse errors
      }
      Logger.debug('[useAppInitialization] No stored user found');
      resolve(false);
    }, 100);
  });
}

/**
 * Hook to handle application initialization
 * @returns Initialization state and controls
 */
export function useAppInitialization(): UseAppInitializationResult {
  const [needsNickname, setNeedsNickname] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [hasCheckedNickname, setHasCheckedNickname] = useState<boolean>(false);

  // Memoized setter that logs for debugging
  const setNeedsNicknameWithLog = useCallback((value: boolean) => {
    Logger.debug(`[useAppInitialization] setNeedsNickname: ${value}`);
    setNeedsNickname(value);
  }, []);

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

    // Run device benchmark
    void DeviceBenchmarkService.runBenchmark();

    // Initialize market state realtime feed
    void import('../services/MarketStateService').then(({ MarketStateService }) => {
      void MarketStateService.init();
    });

    // Check if player needs to set a nickname (with retry for mobile)
    void checkStoredUserWithRetry().then(hasUser => {
      if (!hasUser && !hasCheckedNickname) {
        setNeedsNicknameWithLog(true);
      }
      setHasCheckedNickname(true);
      setIsInitialized(true);
    });
  }, [hasCheckedNickname, setNeedsNicknameWithLog]);

  return {
    needsNickname,
    setNeedsNickname: setNeedsNicknameWithLog,
    isInitialized,
  };
}
