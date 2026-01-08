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
      // Transition to DATA_DISCONNECTED instead of ending game immediately
      if (GameStateMachine.getState() !== GameStatus.DATA_DISCONNECTED) {
        Logger.warn(`[App] Market data timeout - pausing game (DATA_DISCONNECTED)`);
        GameStateMachine.transition(GameStatus.DATA_DISCONNECTED);
      }

      // Still report error for analytics
      void import('../services/analytics/ErrorReporter').then(({ ErrorReporter }) => {
        void ErrorReporter.report(
          new Error('Market data timeout - live feed disconnected'),
          'MarketDataTimeout',
          {
            pair: data.pair,
            disconnectedDuration: data.disconnectedDuration,
            lastPriceTime: data.lastPriceTime,
            playerLevel: playerRef.current.level,
            survivalTime: DifficultyManager.getTotalElapsedSeconds(),
          }
        );
      });
    });

    const subRecovered = EventBus.on('marketDataRecovered' as any, () => {
      if (GameStateMachine.getState() === GameStatus.DATA_DISCONNECTED) {
        Logger.info(`[App] Market data recovered - resuming game`);
        GameStateMachine.transition(GameStatus.PLAYING);
      }
    });

    return () => {
      unsubscribe();
      subRecovered();
    };
  }, [playerRef]);
}
