/**
 * useGameEvents - Game Event Subscription Hook
 *
 * Handles EventBus subscriptions for:
 * - afterReset: Clears game state when returning to menu
 * - killAll: Triggers screen shake and kills all enemies
 */

import { useEffect } from 'react';
import type { RefObject } from 'react';
import { EventBus } from '../services/core/EventBus';
import { audio } from '../services/audio';
import { COLORS } from '../constants';
import { type PoolManager } from '../services/combat/PoolManager';
import { spawnSystem } from '../services/combat/SpawnSystem';
import { CombatResolutionService } from '../services/combat/physics/CombatResolutionService';
import { BuffManager } from '../services/patterns/decorators/BuffManager';
import { BuffGemSpawner } from '../services/spawners/BuffGemSpawner';
import { GAME_STATE_DEFAULTS } from '../services/core/GameStateManager';
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
      spawnSystem.reset();
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

  // Listen for healing events (Lifesteal)
  useEffect(() => {
    const unsub = EventBus.subscribe('playerHealed', data => {
      const { amount, x, y } = data;

      pool.current.getFloatingText(
        x,
        y - 20, // Offset slightly up
        `+${Math.round(amount)}`,
        COLORS.PUMP_GREEN,
        20
      );
    });
    return () => unsub();
  }, [pool]);

  // Listen for Volatility Shockwaves
  useEffect(() => {
    const unsub = EventBus.subscribe('volatilityShock', data => {
      const { intensity } = data;

      // 1. Affect the physics/entities
      CombatResolutionService.triggerShockwave(pool.current, intensity);

      // 2. Visual feedback
      state.current.shake = 15 * intensity;
      audio.playHit(); // Use a generic hit sound or shockwave sound if available

      EventBus.emit('milestoneAchieved', {
        id: 'volatility_shock',
        name: 'VOLATILITY SHOCK!',
        icon: '⚡',
        color: COLORS.ELECTRIC_BLUE,
        type: 'market',
        threshold: intensity,
      });
    });
    return () => unsub();
  }, [pool, state]);
}
