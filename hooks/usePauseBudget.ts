/**
 * usePauseBudget Hook
 *
 * Manages pause time budget for competitive mode.
 *
 * Rules:
 * - Competitive mode: 10 seconds max pause per minute
 * - Casual mode: Unlimited pause
 * - No accumulation beyond max
 * - Auto-resume when budget depleted
 * - Recharges after 60 seconds of active play
 */

import { useState, useEffect, useRef } from 'react';
import { GameMode } from '../types/gameMode';
import { GameStatus } from '../types';

/** Pause budget configuration */
const PAUSE_CONFIG = {
  /** Maximum pause seconds for competitive mode */
  MAX_SECONDS: 10,
  /** Seconds of play required to fully recharge pause budget */
  RECHARGE_SECONDS: 60,
  /** Update interval in milliseconds */
  TICK_INTERVAL_MS: 100,
} as const;

interface PauseBudgetState {
  /** Remaining pause seconds (null = unlimited) */
  remainingSeconds: number | null;
  /** Maximum pause seconds */
  maxSeconds: number;
  /** Whether pause is limited */
  isLimited: boolean;
  /** Recharge progress (0-1) */
  rechargeProgress: number;
  /** Seconds until full recharge */
  rechargeSecondsRemaining: number;
}

/**
 * Hook to manage pause time budget
 * @param gameMode - Current game mode
 * @param gameStatus - Current game status
 * @param onAutoResume - Callback when pause budget is depleted
 */
export function usePauseBudget(
  gameMode: GameMode,
  gameStatus: GameStatus,
  onAutoResume?: () => void
): PauseBudgetState {
  // Budget remaining in seconds
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    PAUSE_CONFIG.MAX_SECONDS
  );
  // Time accumulated toward recharge
  const [rechargeAccumulator, setRechargeAccumulator] = useState<number>(0);

  // Track last tick time for accurate timing
  const lastTickRef = useRef<number>(Date.now());

  // Check if mode has pause limits
  const isLimited = gameMode === GameMode.COMPETITIVE;

  // Track if auto-resume was triggered to prevent duplicate calls
  const autoResumeTriggeredRef = useRef<boolean>(false);

  // Reset budget when game starts or returns to menu
  useEffect(() => {
    if (gameStatus === GameStatus.MENU) {
      setRemainingSeconds(PAUSE_CONFIG.MAX_SECONDS);
      setRechargeAccumulator(0);
      autoResumeTriggeredRef.current = false;
    }
  }, [gameStatus]);

  // Handle auto-resume when budget depleted
  useEffect(() => {
    if (
      isLimited &&
      gameStatus === GameStatus.PAUSED &&
      remainingSeconds <= 0 &&
      !autoResumeTriggeredRef.current &&
      onAutoResume
    ) {
      autoResumeTriggeredRef.current = true;
      onAutoResume();
    }

    // Reset trigger flag when resuming play
    if (gameStatus === GameStatus.PLAYING) {
      autoResumeTriggeredRef.current = false;
    }
  }, [isLimited, gameStatus, remainingSeconds, onAutoResume]);

  // Handle pause countdown and recharge
  useEffect(() => {
    if (!isLimited) return;

    const tick = () => {
      const now = Date.now();
      const deltaMs = now - lastTickRef.current;
      lastTickRef.current = now;
      const deltaSec = deltaMs / 1000;

      if (gameStatus === GameStatus.PAUSED) {
        // Countdown while paused
        setRemainingSeconds(prev => Math.max(0, prev - deltaSec));
        // Reset recharge accumulator when pausing
        setRechargeAccumulator(0);
      } else if (gameStatus === GameStatus.PLAYING) {
        // Recharge while playing
        setRechargeAccumulator(prev => {
          const newAccum = prev + deltaSec;
          if (newAccum >= PAUSE_CONFIG.RECHARGE_SECONDS) {
            // Full recharge
            setRemainingSeconds(PAUSE_CONFIG.MAX_SECONDS);
            return 0;
          }
          return newAccum;
        });
      }
    };

    lastTickRef.current = Date.now();
    const intervalId = setInterval(tick, PAUSE_CONFIG.TICK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isLimited, gameStatus]);

  // Calculate recharge progress
  const rechargeProgress =
    remainingSeconds < PAUSE_CONFIG.MAX_SECONDS
      ? rechargeAccumulator / PAUSE_CONFIG.RECHARGE_SECONDS
      : 1;

  const rechargeSecondsRemaining = PAUSE_CONFIG.RECHARGE_SECONDS - rechargeAccumulator;

  return {
    remainingSeconds: isLimited ? remainingSeconds : null,
    maxSeconds: PAUSE_CONFIG.MAX_SECONDS,
    isLimited,
    rechargeProgress,
    rechargeSecondsRemaining,
  };
}

export { PAUSE_CONFIG };
