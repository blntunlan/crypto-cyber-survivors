/**
 * useCheatManager - Cheat System Integration Hook
 *
 * Initializes and manages CheatManager callbacks.
 * Handles cleanup on unmount.
 */

import { useEffect } from 'react';
import { CheatManager } from '../services/CheatManager';
import { GameStatus } from '../types';
import { EventBus } from '../services/EventBus';

export interface CheatHandlers {
  onLevelUp: () => void;
  onHeal: () => void;
  onSetLuck: (luck: number) => void;
  onAddExp: (amount: number) => void;
  onRestart: () => void;
}

/**
 * Hook to initialize and manage CheatManager
 *
 * @param gameStatus - Current game status
 * @param handlers - Callback handlers for cheat actions
 */
export function useCheatManager(gameStatus: GameStatus, handlers: CheatHandlers): void {
  useEffect(() => {
    CheatManager.init({
      onLevelUp: () => {
        if (gameStatus === GameStatus.PLAYING) {
          handlers.onLevelUp();
        }
      },
      onHeal: handlers.onHeal,
      onKillAll: () => EventBus.emit('killAll', {}),
      onToggleGodMode: () => {},
      onSetLuck: handlers.onSetLuck,
      onAddExp: handlers.onAddExp,
      onRestart: handlers.onRestart,
      onAddComboKill: (count: number) => {
        for (let i = 0; i < count; i++) {
          EventBus.emit('enemyKilled', { x: 0, y: 0, type: 'cheat', isCrit: false });
        }
      },
    });

    return () => CheatManager.destroy();
  }, [gameStatus, handlers]);
}
