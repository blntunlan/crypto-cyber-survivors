/**
 * useCloudflareSession - Cloudflare Session Integration Hook
 *
 * Manages game session validation with Cloudflare Workers.
 * Automatically starts session when game begins and validates on end.
 *
 * Note: This hook provides session tracking. The actual data for validation
 * (player stats, market data) should be passed when calling validateSession.
 *
 * @module hooks/useCloudflareSession
 */

import { useEffect, useRef, useCallback } from 'react';
import { GameStatus } from '../types';
import {
  CloudflareService,
  type SessionValidationResult,
} from '../services/system/CloudflareService';
import { Logger } from '../services/system/Logger';

export interface UseCloudflareSessionReturn {
  /** Whether Cloudflare integration is enabled */
  isEnabled: boolean;
  /** Current session ID (null if no active session) */
  sessionId: string | null;
  /** Last validation result */
  lastValidation: SessionValidationResult | null;
  /** Manually validate session with provided data */
  validateSession: (data: SessionEndData) => Promise<SessionValidationResult | null>;
}

/** Data required to end a session */
export interface SessionEndData {
  position: 'LONG' | 'SHORT';
  leverage: number;
  entryPrice: number;
  exitPrice: number;
  pnlPercent: number;
  level: number;
  kills: number;
  survivalTime: number;
  replayHash?: string;
}

/**
 * Hook to integrate Cloudflare session validation with game lifecycle
 *
 * @param gameStatus - Current game status
 * @param playerId - Player's ID
 * @param cryptoPair - Trading pair being played (e.g., 'BTCUSDT')
 */
export function useCloudflareSession(
  gameStatus: GameStatus,
  playerId: string,
  cryptoPair: string = 'BTCUSDT'
): UseCloudflareSessionReturn {
  const sessionStartedRef = useRef(false);
  const lastValidationRef = useRef<SessionValidationResult | null>(null);
  const prevStatusRef = useRef<GameStatus>(GameStatus.MENU);

  // Start session when game begins
  useEffect(() => {
    const startSession = async () => {
      if (
        gameStatus === GameStatus.PLAYING &&
        !sessionStartedRef.current &&
        prevStatusRef.current !== GameStatus.PAUSED // Don't restart on unpause
      ) {
        sessionStartedRef.current = true;

        if (CloudflareService.isEnabled()) {
          const result = await CloudflareService.startSession(playerId, cryptoPair);
          if (result) {
            Logger.info('[useCloudflareSession] Session started:', result.sessionId);
          }
        }
      }
    };

    void startSession();
    prevStatusRef.current = gameStatus;
  }, [gameStatus, playerId, cryptoPair]);

  // Reset when game ends (validation should be called manually with full data)
  useEffect(() => {
    if (gameStatus === GameStatus.MENU && sessionStartedRef.current) {
      sessionStartedRef.current = false;
      CloudflareService.reset();
    }
  }, [gameStatus]);

  // Manual validation function - should be called with complete data
  const validateSession = useCallback(
    async (data: SessionEndData): Promise<SessionValidationResult | null> => {
      if (!CloudflareService.isEnabled() || !CloudflareService.getCurrentSessionId()) {
        sessionStartedRef.current = false;
        return { valid: true, reason: 'LOCAL' };
      }

      const result = await CloudflareService.endSession({
        playerId,
        cryptoPair,
        position: data.position,
        leverage: data.leverage,
        entryPrice: data.entryPrice,
        exitPrice: data.exitPrice,
        endTime: Date.now(),
        pnlPercent: data.pnlPercent,
        level: data.level,
        kills: data.kills,
        survivalTime: data.survivalTime,
        replayHash: data.replayHash,
      });

      lastValidationRef.current = result;
      sessionStartedRef.current = false;

      if (result.valid) {
        Logger.info('[useCloudflareSession] Session validated successfully');
      } else {
        Logger.warn('[useCloudflareSession] Session validation failed:', result.reason);
      }

      return result;
    },
    [playerId, cryptoPair]
  );

  // Reset on unmount
  useEffect(() => {
    return () => {
      CloudflareService.reset();
    };
  }, []);

  return {
    isEnabled: CloudflareService.isEnabled(),
    sessionId: CloudflareService.getCurrentSessionId(),
    lastValidation: lastValidationRef.current,
    validateSession,
  };
}
