/**
 * useMarketRegime — the player-facing telegraph for market regime shifts.
 *
 * The 2026-08-02 presentation pass removed the market banner, the market/PnL
 * center announcements and the canvas market overlays, and the PnL background
 * tint went with them. That left the market driving threat pressure with no
 * channel telling the player the tape had changed. This is the replacement:
 * one compact signal inside the existing market HUD rail — no full-screen tint,
 * no center announcement, nothing the disable pass deliberately removed.
 *
 * Reads the committed difficulty snapshot, so it reports the regime the
 * simulation actually acted on rather than a parallel client-side guess.
 */

import { useEffect, useRef, useState } from 'react';
import { EventBus } from '../services/core/EventBus';
import { audio } from '../services/audio';
import { MARKET_REGIME_TELEGRAPH } from '../config/MarketRegimeTelegraph';

export type MarketRegime =
  | 'CALM'
  | 'BULL_TREND'
  | 'BEAR_TREND'
  | 'VOLATILE'
  | 'PANIC'
  | 'SQUEEZE';

export type MarketRegimeView = {
  regime: MarketRegime;
  /** Increments on every accepted shift — drives the pulse animation. */
  shiftKey: number;
  /** True for a short window after a shift. */
  isShifting: boolean;
};

const INITIAL: MarketRegimeView = {
  regime: 'CALM',
  shiftKey: 0,
  isShifting: false,
};

export function useMarketRegime(enabled = true): MarketRegimeView {
  const [view, setView] = useState<MarketRegimeView>(INITIAL);
  const lastRegimeRef = useRef<MarketRegime>('CALM');
  const lastShiftAtRef = useRef(0);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = EventBus.on('difficultySnapshotCommitted', ({ snapshot }) => {
      const regime = snapshot.signals.market.regime as MarketRegime;
      if (regime === lastRegimeRef.current) return;

      // The regime engine already applies hysteresis and confirmation frames,
      // but a run that oscillates across a threshold should not strobe the HUD.
      const now = Date.now();
      if (now - lastShiftAtRef.current < MARKET_REGIME_TELEGRAPH.minIntervalMs) {
        lastRegimeRef.current = regime;
        return;
      }

      lastRegimeRef.current = regime;
      lastShiftAtRef.current = now;

      if (MARKET_REGIME_TELEGRAPH.alertRegimes.includes(regime)) {
        audio.playWhaleArrival();
      } else {
        audio.playSelectionTick();
      }

      setView(previous => ({
        regime,
        shiftKey: previous.shiftKey + 1,
        isShifting: true,
      }));

      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => {
        setView(previous => ({ ...previous, isShifting: false }));
      }, MARKET_REGIME_TELEGRAPH.pulseMs);
    });

    return () => {
      unsubscribe();
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, [enabled]);

  useEffect(() => {
    const unsubscribe = EventBus.on('gameReset', () => {
      lastRegimeRef.current = 'CALM';
      lastShiftAtRef.current = 0;
      setView(INITIAL);
    });
    return unsubscribe;
  }, []);

  return view;
}

export default useMarketRegime;
