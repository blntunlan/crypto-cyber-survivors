/**
 * useGameStatusEffects - Game Status Change Handler Hook
 *
 * Handles side effects when game status changes:
 * - MENU: Clears pools, resets state
 * - PLAYING: Initializes BuffManager
 * - PAUSED/LEVEL_UP: Pauses buff timers
 */

import { useEffect } from 'react';
import type { RefObject } from 'react';
import { GameStatus, type Player } from '../types';
import { type PoolManager } from '../services/combat/PoolManager';
import { BuffManager } from '../services/patterns/decorators/BuffManager';
import { BuffGemSpawner } from '../services/spawners/BuffGemSpawner';
import type { GameState } from '../types';

interface UseGameStatusEffectsParams {
  /** Current game status */
  status: GameStatus;
  /** Reference to pool manager */
  pool: RefObject<PoolManager>;
  /** Reference to game state */
  state: RefObject<GameState>;
  /** Reference to player */
  playerRef: RefObject<Player>;
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
}

/**
 * Hook to handle game status change side effects
 */
export function useGameStatusEffects({
  status,
  pool,
  state,
  playerRef,
  width,
  height,
}: UseGameStatusEffectsParams): void {
  useEffect(() => {
    // Reset time trackers on any status change to prevent jumps/spikes
    state.current.lastTime = 0;

    // Handle MENU-specific cleanup
    if (status === GameStatus.MENU) {
      pool.current.clearAll();
      state.current.spawnTimer = 0;
      state.current.lastFireTime = 0;
      state.current.shake = 0;
      state.current.critFlash = 0;
      BuffManager.reset();
    }

    // Initialize BuffManager when game starts
    if (status === GameStatus.PLAYING && !BuffManager.isInitialized()) {
      const player = playerRef.current;
      BuffManager.initialize(player);
      BuffGemSpawner.initialize(width, height);
    }

    // Pause/Resume buff timers based on game status
    if (status === GameStatus.PAUSED || status === GameStatus.LEVEL_UP) {
      BuffManager.pause();
    } else if (status === GameStatus.PLAYING && BuffManager.isPaused()) {
      BuffManager.resume();
    }
  }, [status, pool, state, playerRef, width, height]);

  // Clamp player to screen if dimensions change (e.g. resize while paused)
  useEffect(() => {
    const player = playerRef.current;
    player.x = Math.max(player.radius, Math.min(width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(height - player.radius, player.y));
  }, [width, height, playerRef]);
}
