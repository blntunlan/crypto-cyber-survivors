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
import { MetricsService } from '../services/MetricsService';
import { DifficultyManager } from '../services/DifficultyManager';
import {
  GameStatus,
  type MarketPosition,
  type MarketData,
  type Player,
  type LeverageOption,
} from '../types';
import { GameEndReason } from '../types/metrics';

interface UseMarketTimeoutParams {
  /** Current market data */
  marketData: MarketData;
  /** Player reference */
  playerRef: RefObject<Player>;
  /** Current position (LONG/SHORT) */
  position: MarketPosition;
  /** Entry price */
  entryPrice: number;
  /** Leverage option */
  leverage: LeverageOption;
  /** Total kills in current run */
  totalKills: number;
  /** Callback to set final PnL */
  setFinalPnl: (pnl: number) => void;
  /** Callback to set final survival time */
  setFinalSurvivalTime: (time: number) => void;
}

/**
 * Hook to handle market data timeout events
 * Ends the game if market feed is disconnected too long
 */
export function useMarketTimeout({
  marketData,
  playerRef,
  position,
  entryPrice,
  leverage,
  totalKills,
  setFinalPnl,
  setFinalSurvivalTime,
}: UseMarketTimeoutParams): void {
  useEffect(() => {
    const unsubscribe = EventBus.on('marketDataTimeout', data => {
      Logger.error(
        `[App] Market data timeout - game ending due to ${data.disconnectedDuration}ms without data`
      );

      // Report error for analytics
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

      // End the game with special reason
      setFinalPnl(marketData.effectivePnl);
      setFinalSurvivalTime(DifficultyManager.getTotalElapsedSeconds());
      GameStateMachine.transition(GameStatus.GAMEOVER);

      // Track in metrics with special end reason
      MetricsService.endSession(GameEndReason.DISCONNECT, {
        price: marketData.price,
        pnl: marketData.pnl,
        level: playerRef.current.level,
        hp: playerRef.current.hp,
        difficulty: marketData.difficulty,
        playerStats: {
          damage: playerRef.current.baseDamage,
          fireRate: playerRef.current.fireRate,
          speed: playerRef.current.speed,
          luck: playerRef.current.luck,
          critChance: playerRef.current.critChance,
          critDamage: playerRef.current.critChance * 2,
        },
        position,
        entryPrice,
        leverage,
        totalKills,
      });
    });

    return () => unsubscribe();
  }, [
    marketData,
    playerRef,
    position,
    entryPrice,
    leverage,
    totalKills,
    setFinalPnl,
    setFinalSurvivalTime,
  ]);
}
