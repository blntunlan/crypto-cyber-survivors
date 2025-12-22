import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { COLORS } from '../../../constants';
import { audio } from '../../../services/audioService';
import { type LevelUpScreenProps } from './types';
import { containerVariants, titleVariants } from './constants';
import { LevelUpErrorBoundary } from './LevelUpErrorBoundary';
import { SlotReel } from './SlotReel';

export const LevelUpScreen: React.FC<LevelUpScreenProps> = ({ upgradeChoices, onSelect }) => {
  // Track how many reels have stopped
  const [stoppedCount, setStoppedCount] = useState(0);
  const allStopped = stoppedCount >= upgradeChoices.length;

  // Keyboard navigation state
  const [selectedIndex, setSelectedIndex] = useState(0);

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
      }, 500);
    }
  }, [allStopped]);

  // Keyboard navigation
  useEffect(() => {
    if (!allStopped) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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
          const selected = upgradeChoices[selectedIndex];
          if (selected) {
            onSelect(selected);
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allStopped, selectedIndex, upgradeChoices, onSelect]);

  // Get status text
  const getStatusText = () => {
    if (allStopped) return '✨ Choose your upgrade! (W/S + Space)';
    if (stoppedCount === 0) return '🎰 Spinning...';
    if (stoppedCount === 1) return '🎯 Almost there...';
    return '⚡ Last one!';
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

  return (
    <LevelUpErrorBoundary debugInfo={debugInfo}>
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
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
                className="text-2xl md:text-5xl font-black italic text-white tracking-tighter"
                animate={{
                  textShadow: allStopped
                    ? [
                        '0 0 30px rgba(74, 222, 128, 0.5)',
                        '0 0 60px rgba(74, 222, 128, 0.8)',
                        '0 0 30px rgba(74, 222, 128, 0.5)',
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
                className="font-bold uppercase text-[10px] md:text-xs mt-1 md:mt-2"
                style={{ color: allStopped ? '#4ade80' : COLORS.ELECTRIC_BLUE }}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                {getStatusText()}
              </motion.p>
            </motion.div>

            {/* Slot Reels - Vertical Layout for Web */}
            <div className="flex flex-col gap-3 md:gap-4 max-w-2xl mx-auto">
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
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </LevelUpErrorBoundary>
  );
};
