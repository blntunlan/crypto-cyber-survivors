/**
 * useGameStatus - Game State Machine Hook
 *
 * Subscribes to GameStateMachine for state sync.
 * Handles pause toggle, keyboard shortcuts, and visibility change.
 */

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { GameStatus } from '../types';
import { GameStateMachine } from '../services/core/GameStateMachine';

export interface UseGameStatusReturn {
  gameStatus: GameStatus;
  handlePauseToggle: () => void;
}

const subscribeToGameState = (onStoreChange: () => void): (() => void) =>
  GameStateMachine.subscribe(() => onStoreChange());

const getGameStateSnapshot = (): GameStatus => GameStateMachine.getState();

/**
 * Hook to manage game status with GameStateMachine integration
 */
export function useGameStatus(): UseGameStatusReturn {
  const gameStatus = useSyncExternalStore(
    subscribeToGameState,
    getGameStateSnapshot,
    getGameStateSnapshot
  );

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
      // Skip if user is typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
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
