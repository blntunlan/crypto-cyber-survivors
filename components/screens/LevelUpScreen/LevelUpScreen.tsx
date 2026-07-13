import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trackRender } from '../../../utils/trackRender';
import { COLORS, COMPETITIVE_LIMITS } from '../../../constants';
import { Z_LAYERS } from '../../../constants/ZIndex';
import { audio } from '../../../services/audio';
import { type LevelUpScreenProps } from './types';
import { containerVariants, createRandomStopOrder, titleVariants } from './constants';
import { LevelUpErrorBoundary } from './LevelUpErrorBoundary';
import { SlotReel } from './SlotReel';

import { useThemeSize } from '../../../hooks/useThemeSize';
import { useIsRetro } from '../../../contexts/useTheme';
import {
  IconSparkles,
  IconSlot,
  IconTarget,
  IconBolt,
} from '../../../components/icons/CardIcons';
import { useLanguage } from '../../../contexts/LanguageContext';
import { GameMode } from '../../../types/gameMode';
import { Logger } from '../../../services/system/Logger';
import { MODERN_SCREEN_OVERLAY } from '../../../config/modernSurface';
import { HUD_WAR_ROOM } from '../../../config/HUDWarRoom';

export const LevelUpScreen: React.FC<LevelUpScreenProps> = ({
  upgradeChoices,
  onSelect,
  gameMode,
}) => {
  trackRender('LevelUpScreen');
  const sizes = useThemeSize();
  const { t } = useLanguage();

  // Track how many reels have stopped
  const [stoppedCount, setStoppedCount] = useState(0);
  const allStopped = stoppedCount >= upgradeChoices.length;

  // Keyboard navigation state
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedIndexRef = useRef(0);
  const hasSelectedRef = useRef(false);

  // Competitive mode auto-select timer
  const [timeRemaining, setTimeRemaining] = useState<number>(
    COMPETITIVE_LIMITS.MAX_LEVEL_UP_SECONDS
  );
  const isCompetitive = gameMode === GameMode.COMPETITIVE;

  // Sync ref with state for use in stable event listener
  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  const stopOrder = useMemo(
    () => createRandomStopOrder(upgradeChoices.length),
    [upgradeChoices.length]
  );

  const handleReelStopped = useCallback(() => {
    setStoppedCount(prev => prev + 1);
  }, []);

  // Competitive mode: Auto-select timer (10 seconds max)
  useEffect(() => {
    if (!isCompetitive || !allStopped || hasSelectedRef.current) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Time's up - auto-select first card
          if (!hasSelectedRef.current && upgradeChoices.length > 0) {
            hasSelectedRef.current = true;
            Logger.info('[LevelUp] Competitive auto-select triggered (timeout)');
            const autoCard =
              upgradeChoices[selectedIndexRef.current] ?? upgradeChoices[0];
            if (autoCard) {
              onSelect(autoCard);
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isCompetitive, allStopped, upgradeChoices, onSelect]);

  // Play win fanfare when all reels stopped
  useEffect(() => {
    if (!allStopped) return;
    // Wait for the last card to settle visually before playing the fanfare
    const timerId = setTimeout(() => {
      audio.playSlotWin();
      // TEST: Para yağmuru efekti (kaldırılabilir)
      audio.playCoinShower();
    }, 500);
    return () => clearTimeout(timerId);
  }, [allStopped]);

  // Keyboard navigation
  useEffect(() => {
    if (!allStopped) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent multiple selections
      if (hasSelectedRef.current) return;

      switch (e.key) {
        case 'w':
        case 'W':
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => {
            const newIndex = prev > 0 ? prev - 1 : upgradeChoices.length - 1;
            audio.playSlotTick(0.5);
            return newIndex;
          });
          break;
        case 's':
        case 'S':
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => {
            const newIndex = prev < upgradeChoices.length - 1 ? prev + 1 : 0;
            audio.playSlotTick(0.5);
            return newIndex;
          });
          break;
        case ' ':
        case 'Enter': {
          e.preventDefault();
          const currentIdx = selectedIndexRef.current;
          const selected = upgradeChoices[currentIdx];
          if (selected) {
            hasSelectedRef.current = true;
            audio.playButton();
            onSelect(selected);
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allStopped, upgradeChoices, onSelect]);

  // Get status text
  const renderStatusText = () => {
    if (allStopped) {
      // Show timer in competitive mode
      const timerText = isCompetitive ? ` (${timeRemaining}s)` : '';
      return (
        <span className="flex items-center justify-center gap-2">
          <IconSparkles className="h-3.5 w-3.5" color={COLORS.NEON_GREEN} />
          {t('levelup.choose_upgrade')}
          {timerText}
        </span>
      );
    }
    if (stoppedCount === 0) {
      return (
        <span className="flex items-center justify-center gap-2">
          <IconSlot className="h-3.5 w-3.5" color={COLORS.ELECTRIC_BLUE} />
          {t('levelup.spinning')}
        </span>
      );
    }
    if (stoppedCount === 1) {
      return (
        <span className="flex items-center justify-center gap-2">
          <IconTarget className="h-3.5 w-3.5" color={COLORS.ELECTRIC_BLUE} />
          {t('levelup.almost_there')}
        </span>
      );
    }
    return (
      <span className="flex items-center justify-center gap-2">
        <IconBolt className="h-3.5 w-3.5" color={COLORS.ELECTRIC_BLUE} />
        {t('levelup.last_one')}
      </span>
    );
  };

  // Debug info for error boundary (memoized to avoid JSON.stringify on every spin render)
  const debugInfo = useMemo(
    () =>
      JSON.stringify(
        {
          choicesCount: upgradeChoices.length,
          choiceIds: upgradeChoices.map(c => c.id),
          choiceNames: upgradeChoices.map(c => c.name),
          stoppedCount,
          allStopped,
          stopOrder,
          selectedIndex,
        },
        null,
        2
      ),
    [upgradeChoices, stoppedCount, allStopped, stopOrder, selectedIndex]
  );

  const isRetro = useIsRetro();

  return (
    <LevelUpErrorBoundary debugInfo={debugInfo}>
      <AnimatePresence>
        <motion.div
          className={`allow-scroll fixed inset-0 flex items-center justify-center overflow-y-auto p-4 ${isRetro ? 'bg-black/90' : MODERN_SCREEN_OVERLAY}`}
          style={{ zIndex: Z_LAYERS.LEVEL_UP_SCREEN }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="my-auto w-full max-w-3xl"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div className="mb-4 text-center md:mb-6" variants={titleVariants}>
              <div
                className={`${isRetro ? 'font-retro-pixel text-[8px]' : 'font-mono text-[9px]'} mb-2 font-bold uppercase tracking-[0.32em]`}
                style={{ color: isRetro ? COLORS.JACKPOT_YELLOW : COLORS.CASINO_GOLD }}
              >
                {String(stoppedCount).padStart(2, '0')} /{' '}
                {String(upgradeChoices.length).padStart(2, '0')}
              </div>
              <motion.h3
                className={`${isRetro ? 'font-retro-jersey text-5xl md:text-8xl' : 'cyber-glitch-text font-cyber font-black italic tracking-tighter'} ${sizes.title} text-white`}
                animate={{
                  textShadow: isRetro
                    ? `3px 3px 0 ${allStopped ? COLORS.NEON_GREEN : COLORS.SLOT_BLACK}`
                    : allStopped
                      ? `0 0 28px ${HUD_WAR_ROOM.colors.mint}55`
                      : `0 0 22px ${COLORS.ELECTRIC_BLUE}2e`,
                }}
                transition={{ duration: 0.25 }}
              >
                {t('levelup.title')}
              </motion.h3>
            </motion.div>

            <div
              data-testid="level-up-payline-cabinet"
              className={`relative mx-auto max-w-2xl overflow-hidden transition-all ${
                isRetro
                  ? 'rounded-none border-4 bg-zinc-950 shadow-[8px_8px_0_rgba(0,0,0,0.65)]'
                  : 'border bg-[#05090f] shadow-[0_24px_80px_rgba(0,0,0,0.72),inset_0_0_0_3px_#020509]'
              }`}
              style={{
                borderColor: isRetro
                  ? 'var(--color-primary)'
                  : `${COLORS.CASINO_GOLD}88`,
              }}
            >
              {!isRetro && (
                <>
                  <div className="pointer-events-none absolute left-0 top-0 z-20 h-6 w-6 border-l-[3px] border-t-[3px] border-[#d6b85c]" />
                  <div className="pointer-events-none absolute bottom-0 right-0 z-20 h-6 w-6 border-b-[3px] border-r-[3px] border-[#d6b85c]" />
                </>
              )}

              <div
                className={`flex min-h-11 items-center justify-between gap-4 border-b px-3 py-2 sm:px-4 ${isRetro ? 'bg-black' : 'bg-slate-950/95'}`}
                style={{
                  borderColor: isRetro
                    ? `${COLORS.ELECTRIC_BLUE}66`
                    : `${COLORS.CASINO_GOLD}38`,
                }}
              >
                <motion.p
                  className={`${isRetro ? 'font-retro-pixel text-[8px]' : 'font-cyber text-[10px] sm:text-xs'} min-h-[1.5em] font-bold uppercase tracking-[0.14em]`}
                  style={{
                    color: allStopped ? HUD_WAR_ROOM.colors.mint : COLORS.ELECTRIC_BLUE,
                  }}
                  animate={{ opacity: allStopped ? 1 : 0.82 }}
                >
                  {renderStatusText()}
                </motion.p>

                <div
                  data-testid="level-up-lock-progress"
                  className="flex shrink-0 items-center gap-1.5"
                  aria-label={`${stoppedCount}/${upgradeChoices.length}`}
                >
                  {upgradeChoices.map((card, index) => {
                    const isLocked = index < stoppedCount;
                    return (
                      <span
                        key={card.id}
                        data-locked={isLocked}
                        className={`h-1.5 w-4 border transition-colors sm:w-5 ${isRetro ? 'rounded-none' : 'rounded-full'}`}
                        style={{
                          borderColor: isLocked
                            ? HUD_WAR_ROOM.colors.mint
                            : `${COLORS.SLOT_SILVER}30`,
                          backgroundColor: isLocked
                            ? HUD_WAR_ROOM.colors.mint
                            : `${COLORS.SLOT_SILVER}10`,
                          boxShadow: isLocked
                            ? `0 0 9px ${HUD_WAR_ROOM.colors.mint}88`
                            : 'none',
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <div
                className={`relative overflow-hidden border-y p-2 sm:p-3 ${isRetro ? 'bg-zinc-900' : 'bg-[linear-gradient(180deg,#030609,#08131c_48%,#030609)]'}`}
                style={{
                  borderColor: isRetro
                    ? `${COLORS.ELECTRIC_BLUE}88`
                    : `${COLORS.ELECTRIC_BLUE}70`,
                }}
              >
                <div className="relative z-10 flex flex-col gap-2 sm:gap-2.5">
                  {upgradeChoices.map((card, index) => (
                    <SlotReel
                      key={card.id}
                      finalCard={card}
                      reelIndex={index}
                      stopOrder={stopOrder[index] ?? index}
                      onSelect={c => {
                        if (!hasSelectedRef.current) {
                          hasSelectedRef.current = true;
                          onSelect(c);
                        }
                      }}
                      onStopped={handleReelStopped}
                      isSelected={allStopped && selectedIndex === index}
                    />
                  ))}
                </div>
              </div>

              <div
                className={`flex items-center justify-between gap-3 px-3 py-2 font-mono text-[8px] font-bold uppercase tracking-[0.15em] sm:px-4 ${isRetro ? 'bg-black text-[#DCDCDC]' : 'bg-slate-950/95 text-slate-500'}`}
              >
                <span>
                  {stoppedCount === 0
                    ? '•••'
                    : `${stoppedCount}/${upgradeChoices.length}`}
                </span>
                <span
                  style={{
                    color: allStopped ? COLORS.CASINO_GOLD : COLORS.SLOT_SILVER,
                  }}
                >
                  {allStopped ? '↑ ↓ / ENTER' : '◫ ◫ ◫'}
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </LevelUpErrorBoundary>
  );
};
