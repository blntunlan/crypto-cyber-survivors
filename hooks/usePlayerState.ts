/**
 * usePlayerState - Player State Management Hook
 *
 * Manages player state with centralized defaults from GameStateManager.
 * Provides reset, heal, and color change functionality.
 */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { type Player, MarketPosition } from '../types';
import { COLORS } from '../constants';
import { PLAYER_DEFAULTS } from '../services/core/GameStateManager';
import { EventBus } from '../services/core/EventBus';

/**
 * Create a fresh player object with initial values
 */
const createInitialPlayer = (centerX: number, centerY: number): Player =>
  ({
    x: centerX,
    y: centerY,
    color: COLORS.ELECTRIC_BLUE,
    ...PLAYER_DEFAULTS,
  }) as Player;

export const usePlayerState = (width: number, height: number) => {
  // Memoize initial player to prevent unnecessary recalculations
  const initialPlayer = useMemo(
    () => createInitialPlayer(width / 2, height / 2),
    [width, height]
  );

  const playerRef = useRef<Player>(initialPlayer);
  const [uiStats, setUiStats] = useState<Player>(initialPlayer);

  /**
   * Reset player to initial state
   * Uses factory function to ensure fresh values every time
   */
  const resetPlayer = useCallback(() => {
    const freshPlayer = createInitialPlayer(width / 2, height / 2);
    Object.assign(playerRef.current, freshPlayer);
    setUiStats({ ...playerRef.current });
  }, [width, height]);

  /**
   * Wire player reset into the canonical GameLifecycle path. Every new run
   * fires `gameReset` (GameStateManager.resetAll), so HP/damage/level/status
   * return to PLAYER_DEFAULTS without relying on the UI calling resetGame() —
   * keeping player state leak-free alongside the singleton services.
   */
  useEffect(() => {
    const unsubscribe = EventBus.on('gameReset', resetPlayer);
    return unsubscribe;
  }, [resetPlayer]);

  /**
   * Heal player to full HP
   */
  const healFull = useCallback(() => {
    playerRef.current.hp = playerRef.current.maxHp;
    setUiStats({ ...playerRef.current });
    EventBus.emit('playerHealthChange', {
      hpPercent: 100,
      hp: playerRef.current.maxHp,
      maxHp: playerRef.current.maxHp,
    });
  }, []);

  /**
   * Set player color based on market position
   */
  const setPositionColor = useCallback((pos: MarketPosition) => {
    playerRef.current.color = pos === MarketPosition.LONG ? '#22c55e' : '#ef4444';
    setUiStats({ ...playerRef.current });
  }, []);

  return {
    playerRef,
    uiStats,
    setUiStats,
    resetPlayer,
    healFull,
    setPositionColor,
  };
};
