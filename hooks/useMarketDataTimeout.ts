import { useEffect, type RefObject } from 'react';
import { EventBus } from '../services/core/EventBus';
import { Logger } from '../services/system/Logger';
import { type GameStatus } from '../types';
import { GameStatus as GS } from '../types';

/** Timeout thresholds (match useMarketData constants) */
const MARKET_DATA_TIMEOUT_MS = 15_000;
const MARKET_WARNING_MS = 10_000;
const MARKET_CRITICAL_MS = 13_000;
const TIMEOUT_CHECK_INTERVAL_MS = 1_000;

interface UseMarketDataTimeoutParams {
  gameStatusRef: RefObject<GameStatus>;
  lastPriceTimeRef: RefObject<number>;
  timeoutTriggeredRef: RefObject<boolean>;
  pairRef: RefObject<string>;
}

/**
 * Extracted market data timeout checker from useMarketData.
 * Emits marketTimeoutWarning (10s, 13s) and marketDataTimeout (15s+)
 * events to trigger UI warnings and DATA_DISCONNECTED pause.
 */
export function useMarketDataTimeout({
  gameStatusRef,
  lastPriceTimeRef,
  timeoutTriggeredRef,
  pairRef,
}: UseMarketDataTimeoutParams): void {
  useEffect(() => {
    const checkTimeout = () => {
      const currentStatus = gameStatusRef.current;

      if (currentStatus !== GS.PLAYING && currentStatus !== GS.DATA_DISCONNECTED) {
        timeoutTriggeredRef.current = false;
        return;
      }

      const timeSinceLastPrice = Date.now() - lastPriceTimeRef.current;

      if (
        timeSinceLastPrice > MARKET_CRITICAL_MS &&
        timeSinceLastPrice <= MARKET_DATA_TIMEOUT_MS
      ) {
        EventBus.emit('marketTimeoutWarning', {
          level: 'critical',
          remainingMs: MARKET_DATA_TIMEOUT_MS - timeSinceLastPrice,
          disconnectedDuration: timeSinceLastPrice,
        });
      } else if (
        timeSinceLastPrice > MARKET_WARNING_MS &&
        timeSinceLastPrice <= MARKET_CRITICAL_MS
      ) {
        EventBus.emit('marketTimeoutWarning', {
          level: 'warning',
          remainingMs: MARKET_DATA_TIMEOUT_MS - timeSinceLastPrice,
          disconnectedDuration: timeSinceLastPrice,
        });
      }

      if (timeSinceLastPrice > MARKET_DATA_TIMEOUT_MS) {
        if (!timeoutTriggeredRef.current) {
          timeoutTriggeredRef.current = true;
          Logger.error(
            `[Market] Data timeout - no price updates for ${timeSinceLastPrice}ms`
          );
        }

        EventBus.emit('marketDataTimeout', {
          lastPriceTime: lastPriceTimeRef.current,
          disconnectedDuration: timeSinceLastPrice,
          pair: pairRef.current,
          reason: 'market_timeout',
        });
      }
    };

    const intervalId = setInterval(checkTimeout, TIMEOUT_CHECK_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [gameStatusRef, lastPriceTimeRef, timeoutTriggeredRef, pairRef]);
}
