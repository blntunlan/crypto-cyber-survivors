/**
 * useGameStatus - Game State Machine Hook
 *
 * Subscribes to GameStateMachine for state sync.
 * Handles pause toggle, keyboard shortcuts, and visibility change.
 */

import { useState, useEffect, useCallback } from 'react';
import { GameStatus } from '../types';
import { GameStateMachine } from '../services/GameStateMachine';

export interface UseGameStatusReturn {
  gameStatus: GameStatus;
  handlePauseToggle: () => void;
}

/**
 * Hook to manage game status with GameStateMachine integration
 */
export function useGameStatus(): UseGameStatusReturn {
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.MENU);

  // Subscribe to GameStateMachine for state sync
  useEffect(() => {
    const unsub = GameStateMachine.subscribe(newState => {
      setGameStatus(newState);
    });
    return () => unsub();
  }, []);

  // Pause toggle handler
  const handlePauseToggle = useCallback(() => {
    if (gameStatus === GameStatus.PLAYING) {
      GameStateMachine.transition(GameStatus.PAUSED);
    } else if (gameStatus === GameStatus.PAUSED) {
      GameStateMachine.transition(GameStatus.PLAYING);
    }
  }, [gameStatus]);

  // Keyboard shortcut for pause (Escape or P)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p') {
        handlePauseToggle();
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [handlePauseToggle]);

  return {
    gameStatus,
    handlePauseToggle,
  };
}
