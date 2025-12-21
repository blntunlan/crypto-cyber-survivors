/**
 * useSessionTiming - Game Session Timing Hook
 *
 * Manages session start time based on game status.
 * Automatically starts timer when game begins, resets on menu.
 */

import { useState, useEffect } from 'react';
import { GameStatus } from '../types';

export interface UseSessionTimingReturn {
  sessionStartTime: number;
  resetSessionTime: () => void;
}

/**
 * Hook to manage game session timing
 */
export function useSessionTiming(gameStatus: GameStatus): UseSessionTimingReturn {
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);

  // Sync session timing with game status
  useEffect(() => {
    if (gameStatus === GameStatus.PLAYING && sessionStartTime === 0) {
      setSessionStartTime(Date.now());
    }
    if (gameStatus === GameStatus.MENU) {
      setSessionStartTime(0);
    }
  }, [gameStatus, sessionStartTime]);

  const resetSessionTime = () => {
    setSessionStartTime(0);
  };

  return {
    sessionStartTime,
    resetSessionTime,
  };
}
