import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { COLORS } from '../../../constants';
import { audio } from '../../../services/AudioService';
import { type LevelUpScreenProps } from './types';
import { containerVariants, titleVariants } from './constants';
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

export const LevelUpScreen: React.FC<LevelUpScreenProps> = ({
  upgradeChoices,
  onSelect,
}) => {
  const sizes = useThemeSize();
  // Track how many reels have stopped
  const [stoppedCount, setStoppedCount] = useState(0);
  const allStopped = stoppedCount >= upgradeChoices.length;

  // Keyboard navigation state
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedIndexRef = useRef(0);
  const hasSelectedRef = useRef(false);

  // Sync ref with state for use in stable event listener
  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  // Generate random stop order (e.g., [2, 0, 1] means middle stops first, then right, then left)
  const stopOrder = useMemo(() => {
    const order = [0, 1, 2];
    return order.sort(() => Math.random() - 0.5);
  }, []);

  const handleReelStopped = useCallback(() => {
    setStoppedCount(prev => prev + 1);
  }, []);

  // Play win fanfare when all reels stopped
  useEffect(() => {
    if (allStopped) {
      // Wait for the last card to settle visually before playing the fanfare
      setTimeout(() => {
        audio.playSlotWin();
        // TEST: Para yağmuru efekti (kaldırılabilir)
        audio.playCoinShower();
      }, 500);
    }
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
      return (
        <span className="flex items-center justify-center gap-2">
          <IconSparkles className="w-3.5 h-3.5" color={COLORS.NEON_GREEN} />
          Choose your upgrade! (W/S + Space)
        </span>
      );
    }
    if (stoppedCount === 0) {
      return (
        <span className="flex items-center justify-center gap-2">
          <IconSlot className="w-3.5 h-3.5" color={COLORS.ELECTRIC_BLUE} />
          Spinning...
        </span>
      );
    }
    if (stoppedCount === 1) {
      return (
        <span className="flex items-center justify-center gap-2">
          <IconTarget className="w-3.5 h-3.5" color={COLORS.ELECTRIC_BLUE} />
          Almost there...
        </span>
      );
    }
    return (
      <span className="flex items-center justify-center gap-2">
        <IconBolt className="w-3.5 h-3.5" color={COLORS.ELECTRIC_BLUE} />
        Last one!
      </span>
    );
  };

  // Debug info for error boundary
  const debugInfo = JSON.stringify(
    {
      choicesCount: upgradeChoices.length,
      choiceIds: upgradeChoices.map(c => c.id),
      choiceNames: upgradeChoices.map(c => c.name),
      stoppedCount,
      allStopped,
      stopOrder,
      selectedIndex,
      timestamp: new Date().toISOString(),
    },
    null,
    2
  );

  const isRetro = useIsRetro();

  return (
    <LevelUpErrorBoundary debugInfo={debugInfo}>
      <AnimatePresence>
        <motion.div
          className={`fixed inset-0 z-[2000] flex items-center justify-center p-4 overflow-y-auto ${isRetro ? 'bg-black/90' : 'bg-slate-950/40 backdrop-blur-sm'}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="max-w-4xl w-full my-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Title */}
            <motion.div className="text-center mb-4 md:mb-10" variants={titleVariants}>
              <motion.h3
                className={`${isRetro ? 'font-retro-pixel' : 'font-cyber cyber-glitch-text'} ${sizes.title} font-black italic text-white tracking-tighter`}
                animate={{
                  textShadow: allStopped
                    ? isRetro
                      ? [
                          `2px 2px 0px ${COLORS.NEON_GREEN}`,
                          `4px 4px 0px ${COLORS.NEON_GREEN}`,
                          `2px 2px 0px ${COLORS.NEON_GREEN}`,
                        ]
                      : [
                          '0 0 30px rgba(74, 222, 128, 0.5)',
                          '0 0 60px rgba(74, 222, 128, 0.8)',
                          '0 0 30px rgba(74, 222, 128, 0.5)',
                        ]
                    : isRetro
                      ? [
                          '2px 2px 0px rgba(255,255,255,0.5)',
                          '4px 4px 0px rgba(255,255,255,0.5)',
                          '2px 2px 0px rgba(255,255,255,0.5)',
                        ]
                      : [
                          '0 0 20px rgba(255,255,255,0.3)',
                          '0 0 40px rgba(255,255,255,0.5)',
                          '0 0 20px rgba(255,255,255,0.3)',
                        ],
                  scale: allStopped ? [1, 1.05, 1] : 1,
                }}
                transition={{ duration: allStopped ? 0.5 : 2, repeat: Infinity }}
              >
                LEVEL UP
              </motion.h3>
              <motion.p
                className={`font-bold uppercase ${sizes.tiny} mt-1 md:mt-2`}
                style={{ color: allStopped ? COLORS.NEON_GREEN : COLORS.ELECTRIC_BLUE }}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                {renderStatusText()}
              </motion.p>
            </motion.div>

            {/* Slot Reels - Vertical Layout for Web */}
            <div
              className={`max-w-2xl mx-auto p-4 md:p-8 transition-all ${
                isRetro
                  ? 'bg-zinc-900 border-4 border-[var(--color-primary)] rounded-none'
                  : 'cyber-glass rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]'
              }`}
            >
              <div className="flex flex-col gap-3 md:gap-4">
                {upgradeChoices.map((card, index) => (
                  <SlotReel
                    key={card.id}
                    finalCard={card}
                    reelIndex={index}
                    stopOrder={stopOrder[index] ?? index}
                    onSelect={onSelect}
                    onStopped={handleReelStopped}
                    isSelected={allStopped && selectedIndex === index}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </LevelUpErrorBoundary>
  );
};
