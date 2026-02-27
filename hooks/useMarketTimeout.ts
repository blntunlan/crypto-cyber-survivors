/**
 * useMarketTimeout - Market Data Timeout Handler Hook
 *
 * Handles market data disconnections with smart threshold logic:
 * - Under 10 seconds: Game pauses with DATA_DISCONNECTED state
 * - Over 10 seconds: Game ends gracefully with error tracking
 */

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { EventBus } from '../services/core/EventBus';
import { Logger } from '../services/system/Logger';
import { GameStateMachine } from '../services/core/GameStateMachine';
import { GameStatus, type Player } from '../types';
import { DifficultyManager } from '../services/gameplay/DifficultyManager';

// Fatal disconnect threshold - game ends if disconnected for this long
const FATAL_DISCONNECT_THRESHOLD_MS = 10_000; // 10 seconds

interface UseMarketTimeoutParams {
  /** Player reference */
  playerRef: RefObject<Player>;
}

/**
 * Hook to handle market data timeout events
 *
 * Logic:
 * - disconnectedDuration < 10s → DATA_DISCONNECTED (pause, allow recovery)
 * - disconnectedDuration >= 10s → GAMEOVER with disconnect reason
 */
export function useMarketTimeout({ playerRef }: UseMarketTimeoutParams): void {
  const gameEndedByDisconnectRef = useRef(false);

  useEffect(() => {
    const unsubscribe = EventBus.on('marketDataTimeout', data => {
      const currentState = GameStateMachine.getState();

      // Only handle if we are in PLAYING or already DATA_DISCONNECTED
      if (
        currentState !== GameStatus.PLAYING &&
        currentState !== GameStatus.DATA_DISCONNECTED
      ) {
        return;
      }

      const player = playerRef.current;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!player) return;

      const disconnectDuration = data.disconnectedDuration;

      // FATAL DISCONNECT: 10+ seconds → End game
      if (disconnectDuration >= FATAL_DISCONNECT_THRESHOLD_MS) {
        if (!gameEndedByDisconnectRef.current) {
          gameEndedByDisconnectRef.current = true;
          Logger.error(
            `[Market] FATAL DISCONNECT: ${(disconnectDuration / 1000).toFixed(1)}s - ending game`
          );

          // Emit game over event with disconnect reason
          EventBus.emit('gameOver', {
            finalLevel: player.level,
            finalPnl: player.pnl ?? 0,
            reason: 'DISCONNECT',
          });

          // Transition to GAMEOVER state
          GameStateMachine.transition(GameStatus.GAMEOVER);
        }

        // Report fatal error for analytics
        void import('../services/analytics/ErrorTracker').then(({ ErrorTracker }) => {
          void ErrorTracker.getInstance().captureError({
            errorType: 'FatalMarketDisconnect',
            errorMessage: `Game ended due to market feed disconnect (${(disconnectDuration / 1000).toFixed(1)}s)`,
            category: 'network',
            severity: 'high',
            context: {
              pair: data.pair,
              disconnectedDuration: disconnectDuration,
              lastPriceTime: data.lastPriceTime,
              playerLevel: player.level,
              playerScore: player.score ?? 0,
              survivalTime: DifficultyManager.getTotalElapsedSeconds(),
            },
          });
        });
        return;
      }

      // RECOVERABLE DISCONNECT: Under 10s → Pause game
      if (currentState === GameStatus.PLAYING) {
        Logger.warn(
          `[Market] Data gap detected (${(disconnectDuration / 1000).toFixed(1)}s) - pausing game`
        );
        GameStateMachine.transition(GameStatus.DATA_DISCONNECTED);
      }

      // Report warning for analytics
      void import('../services/analytics/ErrorTracker').then(({ ErrorTracker }) => {
        void ErrorTracker.getInstance().captureError({
          errorType: 'MarketTimeout',
          errorMessage: 'Market data timeout - live feed disconnected',
          category: 'network',
          severity: 'medium',
          context: {
            pair: data.pair,
            disconnectedDuration: disconnectDuration,
            lastPriceTime: data.lastPriceTime,
            playerLevel: player.level,
            survivalTime: DifficultyManager.getTotalElapsedSeconds(),
            wasInGame: currentState === GameStatus.PLAYING,
          },
        });
      });
    });

    const subRecovered = EventBus.on('marketDataRecovered', () => {
      const currentState = GameStateMachine.getState();

      // Reset disconnect tracking
      gameEndedByDisconnectRef.current = false;

      if (currentState === GameStatus.DATA_DISCONNECTED) {
        Logger.info('[Market] Data recovered - resuming game');
        // Resume the game automatically since disconnect was recoverable
        GameStateMachine.transition(GameStatus.PLAYING);
      }
    });

    return () => {
      unsubscribe();
      subRecovered();
    };
  }, [playerRef]);
}
