/**
 * useMarketTimeout - Market Data Timeout Handler Hook
 *
 * Handles market data disconnections with progressive tolerance:
 * - 0-10s:  No action — fallback data used silently (brief gaps are normal)
 * - 10-15s: Warning indicators shown, game continues with fallback data
 * - 15-30s: DATA_DISCONNECTED pause — auto-recovery on reconnect
 * - 30s+:   GAMEOVER — fatal disconnect, game ends
 */

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { EventBus } from '../services/core/EventBus';
import { Logger } from '../services/system/Logger';
import { GameStateMachine } from '../services/core/GameStateMachine';
import { GameStatus, type Player } from '../types';
import { DifficultyManager } from '../services/gameplay/DifficultyManager';

// Fatal disconnect threshold — game ends only after sustained disconnection
const FATAL_DISCONNECT_THRESHOLD_MS = 30_000; // 30 seconds

interface UseMarketTimeoutParams {
  /** Player reference */
  playerRef: RefObject<Player>;
  /** Optional central game-over handler for fatal disconnects */
  onFatalDisconnect?: () => void | Promise<void>;
}

/**
 * Hook to handle market data timeout events
 *
 * Logic:
 * - First timeout event (~15s) → DATA_DISCONNECTED (pause, allow recovery)
 * - Subsequent events with duration >= 30s → GAMEOVER
 * - marketDataRecovered → auto-resume to PLAYING
 */
export function useMarketTimeout({
  playerRef,
  onFatalDisconnect,
}: UseMarketTimeoutParams): void {
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

      // FATAL DISCONNECT: 30+ seconds → End game
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

          if (onFatalDisconnect) {
            void onFatalDisconnect();
          } else {
            GameStateMachine.transition(GameStatus.GAMEOVER);
          }
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

      // RECOVERABLE DISCONNECT: 15-30s → Pause game, allow auto-recovery
      if (currentState === GameStatus.PLAYING) {
        Logger.warn(
          `[Market] Data gap detected (${(disconnectDuration / 1000).toFixed(1)}s) - pausing game`
        );
        GameStateMachine.transition(GameStatus.DATA_DISCONNECTED);
      }

      // Report warning for analytics (only once per gap)
      if (currentState === GameStatus.PLAYING) {
        void import('../services/analytics/ErrorTracker').then(({ ErrorTracker }) => {
          void ErrorTracker.getInstance().captureError({
            errorType: 'MarketTimeout',
            errorMessage: `Market data timeout - paused after ${(disconnectDuration / 1000).toFixed(1)}s`,
            category: 'network',
            severity: 'medium',
            context: {
              pair: data.pair,
              disconnectedDuration: disconnectDuration,
              lastPriceTime: data.lastPriceTime,
              playerLevel: player.level,
              survivalTime: DifficultyManager.getTotalElapsedSeconds(),
            },
          });
        });
      }
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
  }, [onFatalDisconnect, playerRef]);
}
