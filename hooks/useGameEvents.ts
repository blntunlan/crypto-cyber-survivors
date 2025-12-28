/**
 * useGameEvents - Game Event Subscription Hook
 *
 * Handles EventBus subscriptions for:
 * - afterReset: Clears game state when returning to menu
 * - killAll: Triggers screen shake and kills all enemies
 */

import { useEffect } from 'react';
import type { RefObject } from 'react';
import { EventBus } from '../services/EventBus';
import { audio } from '../services/AudioService';
import { type PoolManager } from '../services/PoolManager';
import { BuffManager } from '../services/patterns/decorators/BuffManager';
import { BuffGemSpawner } from '../services/spawners/BuffGemSpawner';
import { GAME_STATE_DEFAULTS } from '../services/GameStateManager';
import type { GameState, Candle } from '../types';

interface UseGameEventsParams {
  /** Reference to pool manager */
  pool: RefObject<PoolManager>;
  /** Reference to game state */
  state: RefObject<GameState>;
}

/**
 * Hook to subscribe to game-wide events
 */
export function useGameEvents({ pool, state }: UseGameEventsParams): void {
  // Listen for afterReset event from GameStateManager to fully reset all game state
  useEffect(() => {
    const unsub = EventBus.subscribe('afterReset', () => {
      // Clear all game entities
      pool.current.clearAll();

      // Reset state using centralized defaults, but preserve background candles
      const currentBgCandles = state.current.bgCandles;
      Object.assign(state.current, {
        ...GAME_STATE_DEFAULTS,
        bgCandles: currentBgCandles as Candle[],
        dashTrail: [],
      });

      // Reset buff manager
      BuffManager.reset();
      BuffGemSpawner.reset();
    });
    return () => unsub();
  }, [pool, state]);

  // Listen for killAll cheat command
  useEffect(() => {
    const unsub = EventBus.subscribe('killAll', () => {
      state.current.shake = 20;
      audio.playHit();
      pool.current.activeEnemies.forEach(e => {
        e.health = 0;
      });
    });
    return () => unsub();
  }, [pool, state]);
}
