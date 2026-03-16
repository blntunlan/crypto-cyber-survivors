/**
 * useBeforeUnload - Browser Tab Close Warning Hook
 *
 * Prevents accidental tab closure during active gameplay by showing
 * a browser confirmation dialog.
 */

import { useEffect } from 'react';
import { GameStatus } from '../types';

/**
 * Hook to show a warning when user tries to close the tab during gameplay
 * @param gameStatus - Current game status
 */
export function useBeforeUnload(gameStatus: GameStatus): void {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent): void => {
      // Only show warning during active gameplay
      if (
        gameStatus === GameStatus.PLAYING ||
        gameStatus === GameStatus.PAUSED ||
        gameStatus === GameStatus.LEVEL_UP
      ) {
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameStatus]);
}
