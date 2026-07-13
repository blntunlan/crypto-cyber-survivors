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
import { trackRender } from '../../utils/trackRender';
import { EventBus } from '../../services/core/EventBus';
import { Z_LAYERS } from '../../constants/ZIndex';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIsRetro } from '../../contexts/useTheme';
import { COLORS } from '../../config/Colors';
import { HUD_WAR_ROOM } from '../../config/HUDWarRoom';
import { cn } from '../../utils/classnames';
import { OverlayChrome } from '../ui/OverlayChrome';
import { ThemedButton } from '../themed/ThemedButton';
import { IconZap, IconBitcoin } from '../icons/CardIcons';

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
  trackRender('CycleDecisionScreen');
  const { t } = useLanguage();
  const isRetro = useIsRetro();
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
  const lastProcessedCycleRef = useRef<number>(0);

  // Cleanup transition timer on unmount
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  // Reset on game reset
  useEffect(() => {
    const unsubReset = EventBus.on('gameReset', () => {
      lastProcessedCycleRef.current = 0;
    });

    return () => {
      unsubReset();
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
        if (data.cycleNumber <= lastProcessedCycleRef.current) return;
        lastProcessedCycleRef.current = data.cycleNumber;
        const cycleNumber = data.cycleNumber;
        const currentDifficulty = 1;

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

    return () => {
      unsubscribe();
    };
  }, [externalVisible]);

  // Countdown timer
  useEffect(() => {
    if (!isVisible && externalVisible !== true) return;
    if (testMode) return; // Disable timer in test mode

    const timer = setInterval(() => {
      setState(prev => {
        if (prev.timeRemaining <= 1) {
          // Auto-continue when timer reaches zero - use ref to get latest handler
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
          data-testid="cycle-decision-overlay"
          data-overlay-priority="decision"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <OverlayChrome
            zIndex={Z_LAYERS.CYCLE_COMPLETE}
            maxWidthClassName="max-w-lg"
            title={getText('hud.cycle_complete')}
            subtitle={`${t('hud.cycle_count', { count: state.cycleNumber })} ${getText('hud.finished')}`}
            accentColor={HUD_WAR_ROOM.colors.gold}
            contentClassName="space-y-6"
          >
            {/* Timer row */}
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'text-xs uppercase tracking-[0.18em] text-slate-400',
                  isRetro && 'font-retro-pixel'
                )}
              >
                {getText('hud.auto_continue')}
              </span>
              <span
                className={cn(
                  'font-cyber text-3xl font-bold text-[#D6B85C]',
                  isRetro && 'font-retro-pixel'
                )}
              >
                {state.timeRemaining}s
              </span>
            </div>

            {/* Stats */}
            <section className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={cn(
                    'p-4',
                    isRetro
                      ? 'border-2 border-[#39FF14]/30 bg-[#0a0a12]/80'
                      : 'border-l-2 border-white/35 py-1 pl-3'
                  )}
                >
                  <p
                    className={cn(
                      'mb-1 text-xs uppercase tracking-wider text-slate-400',
                      isRetro && 'font-retro-pixel'
                    )}
                  >
                    {getText('hud.current_difficulty')}
                  </p>
                  <p
                    className={cn(
                      'text-2xl font-bold text-white',
                      isRetro && 'font-retro-pixel'
                    )}
                  >
                    {state.currentDifficulty.toFixed(2)}x
                  </p>
                </div>
                <div
                  className={cn(
                    'p-4',
                    isRetro
                      ? 'border-2 border-orange-500/50 bg-[#0a0a12]/80'
                      : 'border-l-2 border-[#B22222] py-1 pl-3'
                  )}
                >
                  <p
                    className={cn(
                      'mb-1 text-xs uppercase tracking-wider text-orange-400',
                      isRetro && 'font-retro-pixel'
                    )}
                  >
                    {getText('hud.next_difficulty')}
                  </p>
                  <p
                    className={cn(
                      'text-2xl font-bold text-orange-400',
                      isRetro && 'font-retro-pixel'
                    )}
                  >
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
            </section>

            {/* Decision Buttons */}
            <div className="space-y-4">
              <ThemedButton
                intent="primary"
                onClick={handleContinue}
                disabled={selectedOption !== null}
                className="flex min-h-[52px] w-full items-center justify-center gap-3 text-sm font-black uppercase tracking-[0.22em]"
              >
                <IconZap
                  className="h-5 w-5"
                  color={isRetro ? COLORS.NEON_GREEN : 'currentColor'}
                />
                <span className="text-left">
                  <span className="block">{getText('hud.continue_playing')}</span>
                  <span className="block text-xs font-normal opacity-80">
                    {getText('hud.risk_reward')}
                  </span>
                </span>
              </ThemedButton>

              <ThemedButton
                intent="danger"
                onClick={handleCashOut}
                disabled={selectedOption !== null}
                className={cn(
                  'flex min-h-[52px] w-full items-center justify-center gap-3 text-sm font-black uppercase tracking-[0.22em]',
                  selectedOption === 'continue' && 'opacity-50'
                )}
              >
                <IconBitcoin className="h-5 w-5" color="currentColor" />
                <span className="text-left">
                  <span className="block">{getText('hud.cash_out')}</span>
                  <span className="block text-xs font-normal opacity-80">
                    {getText('hud.secure_rewards')}
                  </span>
                </span>
              </ThemedButton>
            </div>

            {/* Footer hint */}
            <div className="text-center">
              <p className="text-xs text-slate-500">{getText('hud.decision_hint')}</p>
            </div>
          </OverlayChrome>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CycleDecisionScreen;
