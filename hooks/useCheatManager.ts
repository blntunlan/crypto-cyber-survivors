/**
 * useCheatManager - Cheat System Integration Hook
 *
 * Initializes and manages CheatManager callbacks.
 * Handles cleanup on unmount.
 */

import { useEffect, useRef } from 'react';
import { CheatManager } from '../services/system/CheatManager';
import { GameStatus } from '../types';
import { EventBus } from '../services/core/EventBus';

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
 * @param enabled - Whether cheat keyboard shortcuts should be active
 */
export function useCheatManager(
  gameStatus: GameStatus,
  handlers: CheatHandlers,
  enabled = import.meta.env.DEV
): void {
  const handlersRef = useRef(handlers);
  const gameStatusRef = useRef(gameStatus);
  handlersRef.current = handlers;
  gameStatusRef.current = gameStatus;

  // Init/destroy only on mount/unmount or enabled change
  useEffect(() => {
    const isCheatEnabled = import.meta.env.DEV && enabled;
    CheatManager.setEnabled(isCheatEnabled);

    if (!isCheatEnabled) {
      return;
    }

    CheatManager.init({
      onLevelUp: () => {
        if (gameStatusRef.current === GameStatus.PLAYING) {
          handlersRef.current.onLevelUp();
        }
      },
      onHeal: () => handlersRef.current.onHeal(),
      onKillAll: () => EventBus.emit('killAll', {}),
      onToggleGodMode: () => {},
      onSetLuck: (luck: number) => handlersRef.current.onSetLuck(luck),
      onAddExp: (amount: number) => handlersRef.current.onAddExp(amount),
      onRestart: () => handlersRef.current.onRestart(),
      onAddComboKill: (count: number) => {
        for (let i = 0; i < count; i++) {
          EventBus.emit('enemyKilled', { x: 0, y: 0, type: 'cheat', isCrit: false });
        }
      },
    });

    return () => CheatManager.destroy();
  }, [enabled]);
}
