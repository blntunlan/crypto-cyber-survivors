/**
 * usePauseBudget Hook
 *
 * Manages pause time budget for competitive mode.
 *
 * Rules:
 * - Competitive mode: 10 seconds max pause per minute
 * - Casual mode: Unlimited pause
 * - No accumulation beyond max
 * - Auto-resume when budget depleted
 * - Recharges after 60 seconds of active play
 * - Anti-abuse: the budget is consumed in WALL-CLOCK time even while the tab
 *   is hidden, so players cannot stall by backgrounding the app (mobile app
 *   switch / desktop alt-tab). Browsers suspend RAF while hidden, so the
 *   game cannot actually tick — therefore auto-resume is DEFERRED until the
 *   tab becomes visible again. This keeps the budget honest (tabbing away
 *   costs pause time) while avoiding the delta-jump that would occur if the
 *   game transitioned to PLAYING while RAF is suspended.
 */

import { useState, useEffect, useRef } from 'react';
import { GameMode } from '../types/gameMode';
import { GameStatus } from '../types';

/** Pause budget configuration */
const PAUSE_CONFIG = {
  /** Maximum pause seconds for competitive mode */
  MAX_SECONDS: 10,
  /** Seconds of play required to fully recharge pause budget */
  RECHARGE_SECONDS: 60,
  /** Update interval in milliseconds */
  TICK_INTERVAL_MS: 100,
  /** Max delta (ms) applied by a single tick. Survives browsers that fully
   *  suspend (not just throttle) background timers — otherwise the first
   *  visible tick after a suspension would dump a large delta at once. */
  MAX_TICK_DELTA_MS: 1000,
} as const;

export interface PauseBudgetState {
  /** Remaining pause seconds (null = unlimited) */
  remainingSeconds: number | null;
  /** Maximum pause seconds */
  maxSeconds: number;
  /** Whether pause is limited */
  isLimited: boolean;
  /** Recharge progress (0-1) */
  rechargeProgress: number;
  /** Seconds until full recharge */
  rechargeSecondsRemaining: number;
}

/**
 * Hook to manage pause time budget
 * @param gameMode - Current game mode
 * @param gameStatus - Current game status
 * @param onAutoResume - Callback when pause budget is depleted
 */
export function usePauseBudget(
  gameMode: GameMode,
  gameStatus: GameStatus,
  onAutoResume?: () => void
): PauseBudgetState {
  // Budget remaining in seconds
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    PAUSE_CONFIG.MAX_SECONDS
  );
  // Time accumulated toward recharge
  const [rechargeAccumulator, setRechargeAccumulator] = useState<number>(0);

  // Track last tick time for accurate timing
  const lastTickRef = useRef<number>(Date.now());

  // Check if mode has pause limits
  const isLimited = gameMode === GameMode.COMPETITIVE;

  // Track if auto-resume was triggered to prevent duplicate calls
  const autoResumeTriggeredRef = useRef<boolean>(false);

  // Track tab visibility. The budget is consumed in wall-clock time even
  // while hidden (anti-abuse), but auto-resume must NOT fire while hidden —
  // browsers suspend RAF, so transitioning to PLAYING would leave the game
  // not-ticking and cause a delta jump on return. This state drives the
  // auto-resume effect's reactivity so a depleted budget resumes cleanly
  // once the tab is visible again.
  //
  // iOS note: Safari restores frozen tabs from the Back/Forward cache via
  // `pageshow` (persisted), which may NOT be accompanied by `visibilitychange`.
  // We therefore also listen to `pageshow`/`pagehide` (and the Page Lifecycle
  // `freeze`/`resume` events where supported) so visibility state stays
  // correct across iOS app-switching and BF-cache restore.
  const [isTabVisible, setIsTabVisible] = useState<boolean>(
    typeof document === 'undefined' ? true : !document.hidden
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const syncFromDocument = () => setIsTabVisible(!document.hidden);
    const handlePageShow = () => {
      // BF-cache restore (and initial load). iOS may not fire
      // visibilitychange here, so resync from document.hidden.
      syncFromDocument();
    };
    const handlePageHide = (event: PageTransitionEvent) => {
      // Entering BF cache: the page is about to be frozen. Treat as hidden
      // so a depleted budget doesn't auto-resume until restore.
      if (event.persisted) setIsTabVisible(false);
    };
    const handleFreeze = () => setIsTabVisible(false);
    const handleResume = () => syncFromDocument();

    document.addEventListener('visibilitychange', syncFromDocument);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('freeze', handleFreeze);
    document.addEventListener('resume', handleResume);
    // Sync in case visibility changed between init and listener attach
    syncFromDocument();
    return () => {
      document.removeEventListener('visibilitychange', syncFromDocument);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('freeze', handleFreeze);
      document.removeEventListener('resume', handleResume);
    };
  }, []);

  // Reset budget when game starts or returns to menu
  useEffect(() => {
    if (gameStatus === GameStatus.MENU) {
      setRemainingSeconds(PAUSE_CONFIG.MAX_SECONDS);
      setRechargeAccumulator(0);
      autoResumeTriggeredRef.current = false;
    }
  }, [gameStatus]);

  // Handle auto-resume when budget depleted.
  // Never fire while the tab is hidden — defer until the tab is visible
  // again (the effect re-runs when isTabVisible flips to true).
  useEffect(() => {
    if (
      isLimited &&
      isTabVisible &&
      gameStatus === GameStatus.PAUSED &&
      remainingSeconds <= 0 &&
      !autoResumeTriggeredRef.current &&
      onAutoResume
    ) {
      autoResumeTriggeredRef.current = true;
      onAutoResume();
    }

    // Reset trigger flag when resuming play
    if (gameStatus === GameStatus.PLAYING) {
      autoResumeTriggeredRef.current = false;
    }
  }, [isLimited, isTabVisible, gameStatus, remainingSeconds, onAutoResume]);

  // Handle pause countdown and recharge
  useEffect(() => {
    if (!isLimited) return;

    const tick = () => {
      const now = Date.now();
      const deltaMs = now - lastTickRef.current;
      lastTickRef.current = now;
      const deltaSec = deltaMs / 1000;

      if (gameStatus === GameStatus.PAUSED) {
        // Consume the budget in wall-clock time — even while the tab is
        // hidden — so backgrounding cannot be used to stall for free. A
        // large delta (e.g. after a browser fully suspended the interval)
        // simply depletes more budget, which is the intended anti-abuse.
        setRemainingSeconds(prev => Math.max(0, prev - deltaSec));
        // Reset recharge accumulator when pausing
        setRechargeAccumulator(0);
      } else if (gameStatus === GameStatus.PLAYING) {
        // Recharge while playing. Cap the per-tick delta so a timer
        // suspension (which should not normally happen while playing, since
        // backgrounding auto-pauses) cannot be farmed for instant recharge.
        const rechargeSec = Math.min(deltaSec, PAUSE_CONFIG.MAX_TICK_DELTA_MS / 1000);
        setRechargeAccumulator(prev => {
          const newAccum = prev + rechargeSec;
          if (newAccum >= PAUSE_CONFIG.RECHARGE_SECONDS) {
            // Full recharge
            setRemainingSeconds(PAUSE_CONFIG.MAX_SECONDS);
            return 0;
          }
          return newAccum;
        });
      }
    };

    lastTickRef.current = Date.now();
    const intervalId = setInterval(tick, PAUSE_CONFIG.TICK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isLimited, gameStatus]);

  // Calculate recharge progress
  const rechargeProgress =
    remainingSeconds < PAUSE_CONFIG.MAX_SECONDS
      ? rechargeAccumulator / PAUSE_CONFIG.RECHARGE_SECONDS
      : 1;

  const rechargeSecondsRemaining = PAUSE_CONFIG.RECHARGE_SECONDS - rechargeAccumulator;

  return {
    remainingSeconds: isLimited ? remainingSeconds : null,
    maxSeconds: PAUSE_CONFIG.MAX_SECONDS,
    isLimited,
    rechargeProgress,
    rechargeSecondsRemaining,
  };
}

export { PAUSE_CONFIG };
