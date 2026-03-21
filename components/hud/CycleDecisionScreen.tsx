/**
 * CycleDecisionScreen - End of cycle decision overlay
 *
 * Shown during the resolution phase (4:25-5:00) of each cycle.
 * Player can choose to:
 * - CONTINUE: Progress to next cycle with increased difficulty
 * - CASH OUT: End run and collect rewards
 *
 * @see docs/DIFFICULTY_SYSTEM_V2.md
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EventBus } from '../../services/core/EventBus';
import { DifficultyManager } from '../../services/gameplay/DifficultyManager';
import { Z_LAYERS } from '../../constants/ZIndex';
import { useLanguage } from '../../contexts/LanguageContext';

interface CycleDecisionScreenProps {
  /** Callback when player chooses to continue */
  onContinue?: () => void;
  /** Callback when player chooses to cash out */
  onCashOut?: () => void;
  /** Whether the screen is visible (controlled externally) */
  visible?: boolean;
  /** Test mode to disable timer */
  testMode?: boolean;
}

interface DecisionState {
  cycleNumber: number;
  currentDifficulty: number;
  nextDifficulty: number;
  timeRemaining: number;
  xpEarned: number;
  coinsEarned: number;
}

// Fallback translations for when key is not found
const FALLBACK_TRANSLATIONS: Record<string, string> = {
  'hud.cycle_complete': 'CYCLE COMPLETE',
  'hud.finished': 'Finished',
  'hud.auto_continue': 'Auto-continue',
  'hud.current_difficulty': 'Current Difficulty',
  'hud.next_difficulty': 'Next Cycle Difficulty',
  'hud.harder': 'harder',
  'hud.continue_playing': 'CONTINUE PLAYING',
  'hud.risk_reward': 'Higher risk, higher reward',
  'hud.cash_out': 'CASH OUT',
  'hud.secure_rewards': 'Secure your rewards',
  'hud.decision_hint': 'Higher cycles = More XP & better loot drops',
};

export const CycleDecisionScreen: React.FC<CycleDecisionScreenProps> = ({
  onContinue,
  onCashOut,
  visible: externalVisible,
  testMode = false,
}) => {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [state, setState] = useState<DecisionState>({
    cycleNumber: 1,
    currentDifficulty: 1,
    nextDifficulty: 1.5,
    timeRemaining: 35,
    xpEarned: 0,
    coinsEarned: 0,
  });
  const [selectedOption, setSelectedOption] = useState<'continue' | 'cashout' | null>(
    null
  );
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup transition timer on unmount
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  // Use ref to avoid stale closure in timer
  const handleContinueRef = useRef<() => void>(() => {});

  // Helper to get translation with fallback
  const getText = useCallback(
    (key: string): string => {
      const translated = t(key);
      // If translation returns the key itself, use fallback
      if (translated === key) {
        return FALLBACK_TRANSLATIONS[key] ?? key;
      }
      return translated as string;
    },
    [t]
  );

  const handleContinue = useCallback(() => {
    setSelectedOption('continue');
    if (testMode) {
      // Execute immediately in test mode
      setIsVisible(false);
      setSelectedOption(null);
      onContinue?.();
      EventBus.emit('cycleDecisionMade', {
        decision: 'CONTINUE',
        cycleNumber: state.cycleNumber,
      });
    } else {
      // Use delay in production
      transitionTimerRef.current = setTimeout(() => {
        setIsVisible(false);
        setSelectedOption(null);
        onContinue?.();
        EventBus.emit('cycleDecisionMade', {
          decision: 'CONTINUE',
          cycleNumber: state.cycleNumber,
        });
      }, 300);
    }
  }, [onContinue, state.cycleNumber, testMode]);

  const handleCashOut = useCallback(() => {
    setSelectedOption('cashout');
    if (testMode) {
      // Execute immediately in test mode
      setIsVisible(false);
      setSelectedOption(null);
      onCashOut?.();
      EventBus.emit('cycleDecisionMade', {
        decision: 'CASH_OUT',
        cycleNumber: state.cycleNumber,
      });
    } else {
      // Use delay in production
      transitionTimerRef.current = setTimeout(() => {
        setIsVisible(false);
        setSelectedOption(null);
        onCashOut?.();
        EventBus.emit('cycleDecisionMade', {
          decision: 'CASH_OUT',
          cycleNumber: state.cycleNumber,
        });
      }, 300);
    }
  }, [onCashOut, state.cycleNumber, testMode]);

  // Keep ref updated
  useEffect(() => {
    handleContinueRef.current = handleContinue;
  }, [handleContinue]);

  // Handle cycle complete event
  useEffect(() => {
    const unsubscribe = EventBus.on(
      'cycleComplete',
      (data: { cycleNumber: number; totalElapsedSeconds?: number }) => {
        const cycleNumber = data.cycleNumber;
        const currentDifficulty = DifficultyManager.getLatestOutput()?.total ?? 1;

        setState(prev => ({
          ...prev,
          cycleNumber,
          currentDifficulty,
          nextDifficulty: currentDifficulty * 1.2,
          timeRemaining: 35,
        }));

        // Only show if not controlled externally
        if (externalVisible === undefined) {
          setIsVisible(true);
        }
      }
    );

    return unsubscribe;
  }, [externalVisible]);

  // Countdown timer
  useEffect(() => {
    if (!isVisible && externalVisible !== true) return;
    if (testMode) return; // Disable timer in test mode

    const timer = setInterval(() => {
      setState(prev => {
        if (prev.timeRemaining <= 1) {
          // Auto-continue when timer expires - use ref to get latest handler
          handleContinueRef.current();
          return prev;
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, externalVisible, testMode]);

  const showScreen = externalVisible ?? isVisible;

  return (
    <AnimatePresence>
      {showScreen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: Z_LAYERS.CYCLE_COMPLETE }}
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.9) 100%)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Ambient glow */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 30%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)',
            }}
          />

          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="relative mx-4 w-full max-w-lg"
          >
            {/* Main Card */}
            <div className="overflow-hidden rounded-sm border border-purple-500/30 bg-slate-900/95 shadow-2xl">
              {/* Header */}
              <div className="border-b border-purple-500/20 bg-gradient-to-r from-purple-600/20 to-cyan-600/20 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-white">
                      {getText('hud.cycle_complete')}
                    </h2>
                    <p className="mt-1 text-sm text-purple-300">
                      {t('hud.cycle_count', { count: state.cycleNumber })}{' '}
                      {getText('hud.finished')}
                    </p>
                  </div>
                  {/* Timer */}
                  <div className="text-right">
                    <div className="font-mono text-3xl font-bold text-cyan-400">
                      {state.timeRemaining}s
                    </div>
                    <p className="text-xs text-slate-400">
                      {getText('hud.auto_continue')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 border-b border-slate-800 p-6">
                <div className="rounded-sm border border-slate-700/50 bg-slate-800/50 p-4">
                  <p className="mb-1 text-xs uppercase tracking-wider text-slate-400">
                    {getText('hud.current_difficulty')}
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {state.currentDifficulty.toFixed(2)}x
                  </p>
                </div>
                <div className="rounded-sm border border-orange-500/30 bg-slate-800/50 p-4">
                  <p className="mb-1 text-xs uppercase tracking-wider text-orange-400">
                    {getText('hud.next_difficulty')}
                  </p>
                  <p className="text-2xl font-bold text-orange-400">
                    {state.nextDifficulty.toFixed(2)}x
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    +
                    {(
                      (state.nextDifficulty / Math.max(state.currentDifficulty, 0.01) -
                        1) *
                      100
                    ).toFixed(0)}
                    % {getText('hud.harder')}
                  </p>
                </div>
              </div>

              {/* Decision Buttons */}
              <div className="space-y-4 p-6">
                {/* Continue Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleContinue}
                  disabled={selectedOption !== null}
                  className={`
                    w-full rounded-sm px-6 py-4 text-lg font-bold transition-all
                    ${
                      selectedOption === 'continue'
                        ? 'bg-green-600 text-white'
                        : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-600/30 hover:from-green-500 hover:to-emerald-500'
                    }
                    ${selectedOption === 'cashout' ? 'opacity-50' : ''}
                    disabled:cursor-not-allowed
                  `}
                >
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl">🚀</span>
                    <div className="text-left">
                      <div>{getText('hud.continue_playing')}</div>
                      <div className="text-xs font-normal opacity-80">
                        {getText('hud.risk_reward')}
                      </div>
                    </div>
                  </div>
                </motion.button>

                {/* Cash Out Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCashOut}
                  disabled={selectedOption !== null}
                  className={`
                    w-full rounded-sm px-6 py-4 text-lg font-bold transition-all
                    ${
                      selectedOption === 'cashout'
                        ? 'bg-amber-600 text-white'
                        : 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg shadow-amber-600/30 hover:from-amber-500 hover:to-yellow-500'
                    }
                    ${selectedOption === 'continue' ? 'opacity-50' : ''}
                    disabled:cursor-not-allowed
                  `}
                >
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl">💰</span>
                    <div className="text-left">
                      <div>{getText('hud.cash_out')}</div>
                      <div className="text-xs font-normal opacity-80">
                        {getText('hud.secure_rewards')}
                      </div>
                    </div>
                  </div>
                </motion.button>
              </div>

              {/* Footer hint */}
              <div className="px-6 pb-4 text-center">
                <p className="text-xs text-slate-500">{getText('hud.decision_hint')}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CycleDecisionScreen;
