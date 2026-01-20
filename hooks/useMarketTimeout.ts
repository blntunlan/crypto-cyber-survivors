/**
 * useMarketTimeout - Market Data Timeout Handler Hook
 *
 * Ends the game if live market feed disconnects for too long.
 * Reports the error for analytics and tracks in metrics.
 */

import { useEffect } from 'react';
import type { RefObject } from 'react';
import { EventBus } from '../services/EventBus';
import { Logger } from '../services/Logger';
import { GameStateMachine } from '../services/GameStateMachine';
import { GameStatus, type Player } from '../types';
import { DifficultyManager } from '../services/DifficultyManager';

interface UseMarketTimeoutParams {
  /** Player reference */
  playerRef: RefObject<Player>;
}

/**
 * Hook to handle market data timeout events
 * Ends the game if market feed is disconnected too long
 */
export function useMarketTimeout({ playerRef }: UseMarketTimeoutParams): void {
  useEffect(() => {
    const unsubscribe = EventBus.on('marketDataTimeout', data => {
      const currentState = GameStateMachine.getState();

      // Transition to DATA_DISCONNECTED instead of ending game immediately
      if (currentState !== GameStatus.DATA_DISCONNECTED) {
        Logger.warn(`[App] Market data timeout - current state: ${currentState}`);
        GameStateMachine.transition(GameStatus.DATA_DISCONNECTED);
      }

      // Still report error for analytics
      void import('../services/analytics/ErrorReporter').then(({ ErrorReporter }) => {
        void ErrorReporter.report(
          new Error('Market data timeout - live feed disconnected'),
          'network', // Use valid category 'network'
          {
            pair: data.pair,
            disconnectedDuration: data.disconnectedDuration,
            lastPriceTime: data.lastPriceTime,
            playerLevel: playerRef.current.level,
            survivalTime: DifficultyManager.getTotalElapsedSeconds(),
            wasInGame:
              currentState === GameStatus.PLAYING || currentState === GameStatus.PAUSED,
          }
        );
      });
    });

    const subRecovered = EventBus.on('marketDataRecovered', () => {
      if (GameStateMachine.getState() === GameStatus.DATA_DISCONNECTED) {
        Logger.info(
          `[App] Market data recovered - returning to MENU (automatic resume disabled for safety)`
        );
        // We go back to MENU for now to be safe, since forcing PLAYING might break things
        // if they weren't in a game.
        GameStateMachine.transition(GameStatus.MENU);
      }
    });

    return () => {
      unsubscribe();
      subRecovered();
    };
  }, [playerRef]);
}
