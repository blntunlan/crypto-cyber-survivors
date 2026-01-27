import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { type Card, TIER_CONFIG, ALL_CARDS_FLAT } from '../../../services/cards/CardSystem';
import { audio } from '../../../services/audio';
import { type SlotReelProps } from './types';
import { SLOT_CONFIG } from './constants';
import { CardIcon } from './CardIcon';

import { useThemeSize } from '../../../hooks/useThemeSize';
import { useIsRetro } from '../../../contexts/useTheme';

export const SlotReel: React.FC<SlotReelProps> = ({
  finalCard,
  reelIndex,
  stopOrder,
  onSelect,
  onStopped,
  isSelected = false,
}) => {
  const sizes = useThemeSize();
  const isRetro = useIsRetro();
  const [isStopped, setIsStopped] = useState(false);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [phase, setPhase] = useState<'spinning' | 'slowing' | 'stopped'>('spinning');

  const spinCards = useMemo(() => {
    const pool = ALL_CARDS_FLAT.filter(c => c.id !== finalCard.id);
    const cards: Card[] = [];
    for (let i = 0; i < SLOT_CONFIG.CARDS_PER_SPIN; i++) {
      cards.push(pool[Math.floor(Math.random() * pool.length)]!);
    }
    return [...cards, finalCard];
  }, [finalCard]);

  useEffect(() => {
    const startTime = Date.now();
    let lastTickTime = 0;
    let isSlowing = false;
    let isDone = false;

    const stopDelay =
      SLOT_CONFIG.SPIN_DURATION +
      stopOrder * SLOT_CONFIG.STOP_DELAY_INCREMENT +
      SLOT_CONFIG.STOP_DELAY_BASE;

    const totalDuration = stopDelay;
    const slowdownStartTime = stopDelay - SLOT_CONFIG.SLOWDOWN_DURATION;

    let rafId: number;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;

      if (elapsed >= totalDuration) {
        if (!isDone) {
          isDone = true;
          setDisplayIndex(spinCards.length - 1);
          setPhase('stopped');
          setIsStopped(true);
        }
        return;
      }

      // Determine current speed based on phase
      let currentInterval = SLOT_CONFIG.SPIN_INTERVAL;
      if (elapsed > slowdownStartTime) {
        if (!isSlowing) {
          isSlowing = true;
          setPhase('slowing');
          audio.playSlowdownTension();
        }
        const slowdownProgress =
          (elapsed - slowdownStartTime) / SLOT_CONFIG.SLOWDOWN_DURATION;
        currentInterval = SLOT_CONFIG.SPIN_INTERVAL + slowdownProgress * 200;
      }

      // High-precision ticking for sounds and visual swaps
      if (now - lastTickTime > currentInterval) {
        lastTickTime = now;
        setDisplayIndex(prev => (prev + 1) % (spinCards.length - 1));
        if (totalDuration - elapsed > 100) {
          audio.playSlotTick(isSlowing ? 0.8 : 1);
        }
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [stopOrder, spinCards]);

  const hasCalledOnStopped = useRef(false);

  useEffect(() => {
    if (isStopped && !hasCalledOnStopped.current) {
      hasCalledOnStopped.current = true;
      audio.playReelStop(reelIndex);
      audio.playMultiplierChime(reelIndex);
      onStopped();
    }
  }, [isStopped, onStopped, reelIndex]);

  const displayCard =
    (phase === 'stopped' ? finalCard : spinCards[displayIndex]) ?? finalCard;
  const tierConfig = TIER_CONFIG[displayCard.tier];
  const isSpinning = phase !== 'stopped';
  const isSlowingDown = phase === 'slowing';

  // Selection Pulse Animation
  const pulseProps =
    isSelected && isStopped
      ? {
          boxShadow: isRetro
            ? [
                '4px 4px 0px rgba(0,0,0,0.5)',
                '8px 8px 0px rgba(0,0,0,0.3)',
                '4px 4px 0px rgba(0,0,0,0.5)',
              ]
            : [
                `0 0 20px ${tierConfig.glowColor}40, 0 0 0px #ffffff00`,
                `0 0 40px ${tierConfig.glowColor}80, 0 0 20px #ffffff40`,
                `0 0 20px ${tierConfig.glowColor}40, 0 0 0px #ffffff00`,
              ],
          borderColor: isRetro
            ? ['#ffffff', '#fbbf24', '#ffffff']
            : ['#ffffff', tierConfig.borderColor, '#ffffff'],
        }
      : {};

  return (
    <motion.button
      onClick={() => isStopped && onSelect(finalCard)}
      disabled={!isStopped}
      className={`group flex flex-row items-center text-left p-3 md:p-5 w-full relative overflow-hidden min-h-[100px] md:min-h-[140px]
        ${isRetro ? 'rounded-none' : 'rounded-xl md:rounded-2xl'}
        ${isStopped ? 'cursor-pointer' : 'cursor-wait'} 
        ${isSelected && isStopped ? 'z-10' : 'z-0'}
      `}
      style={{
        backgroundColor:
          isSelected && isStopped ? `${tierConfig.bgColor}ee` : tierConfig.bgColor,
        borderWidth: isRetro ? '4px' : '2px',
        borderStyle: 'solid',
        borderColor: isSelected && isStopped ? '#ffffff' : tierConfig.borderColor,
        boxShadow:
          !isSelected && isStopped && displayCard.tier !== 'common'
            ? isRetro
              ? `4px 4px 0px rgba(0,0,0,0.4)`
              : `0 0 30px ${tierConfig.glowColor}30`
            : 'none',
      }}
      initial={{ opacity: 0, x: -100 }}
      animate={{
        opacity: 1,
        x: isSelected && isStopped ? (isRetro ? 20 : 12) : 0,
        scale: isSelected && isStopped ? 1.05 : 1,
        ...pulseProps,
        transition: {
          opacity: { duration: 0.3 },
          x: { type: 'spring', stiffness: 400, damping: 25 },
          scale: { type: 'spring', stiffness: 400, damping: 25 },
          boxShadow: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
          borderColor: { duration: 1, repeat: Infinity, ease: 'linear' },
          delay: reelIndex * 0.1,
        },
      }}
      whileHover={
        isStopped && !isSelected
          ? { backgroundColor: `${tierConfig.bgColor}ee`, x: 4 }
          : {}
      }
      whileTap={isStopped ? { scale: 0.98 } : {}}
    >
      {/* Selected Indicator Pointer */}
      {isSelected && isStopped && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute left-1 top-1/2 -translate-y-1/2 flex items-center"
        >
          <div
            className={`w-1.5 h-12 ${isRetro ? 'bg-yellow-400' : 'bg-white rounded-full blur-[1px]'}`}
          />
        </motion.div>
      )}

      {/* Left: Icon & Badge */}
      <div className="flex flex-col items-center justify-center mr-4 md:mr-8 shrink-0 w-20 md:w-28 pl-2">
        {/* Tier Badge */}
        <motion.div
          className={`${sizes.tiny} font-black uppercase tracking-widest mb-1 md:mb-2 text-center`}
          style={{ color: tierConfig.color }}
          animate={{
            opacity: isSpinning ? [0.5, 1, 0.5] : 1,
            scale: isSelected && isStopped ? [1, 1.1, 1] : 1,
          }}
          transition={{
            duration: isSpinning ? 0.1 : 1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {tierConfig.name}
        </motion.div>

        {/* Spinning Icon Container */}
        <div className="text-3xl md:text-5xl flex items-center justify-center w-14 h-14 md:w-20 md:h-20 relative">
          <motion.div
            className={`absolute inset-0 ${isRetro ? '' : 'rounded-full blur-xl'}`}
            style={{ backgroundColor: isRetro ? 'transparent' : tierConfig.color }}
            animate={
              isRetro
                ? {}
                : {
                    opacity: isSlowingDown
                      ? [0.3, 0.6, 0.3]
                      : isSpinning
                        ? [0.1, 0.3, 0.1]
                        : isSelected
                          ? [0.4, 0.8, 0.4]
                          : [0.1, 0.4, 0.1],
                    scale: isSlowingDown
                      ? [1, 1.3, 1]
                      : isSpinning
                        ? 1
                        : isSelected
                          ? [1, 1.5, 1]
                          : [0.9, 1.2, 0.9],
                  }
            }
            transition={{
              duration: isSlowingDown ? 0.3 : isSpinning ? 0.2 : 1.5,
              repeat: Infinity,
            }}
          />

          <motion.div
            className="relative z-10"
            style={{ mixBlendMode: isRetro ? 'normal' : 'plus-lighter' }}
            animate={{
              y: isSpinning ? (isSlowingDown ? [-10, 10] : [-20, 20]) : 0,
              opacity: isSpinning ? (isSlowingDown ? [0.9, 1, 0.9] : [0.7, 1, 0.7]) : 1,
              scale: isStopped
                ? isSelected
                  ? [1, 1.25, 1.15]
                  : [0.8, 1.15, 1]
                : isSlowingDown
                  ? 1.05
                  : 1,
              rotate: isSelected ? [0, 5, -5, 0] : 0,
            }}
            transition={
              isSpinning
                ? {
                    duration: isSlowingDown ? 0.15 : 0.1,
                    repeat: Infinity,
                    ease: 'linear',
                  }
                : isStopped
                  ? {
                      duration: isSelected ? 2 : 0.4,
                      repeat: isSelected ? Infinity : 0,
                      ease: 'easeInOut',
                    }
                  : {}
            }
          >
            <CardIcon
              card={displayCard}
              color={isSelected ? '#ffffff' : tierConfig.color}
              scaleDown={true}
            />
          </motion.div>
        </div>
      </div>

      {/* Middle/Right: Info */}
      <div className="flex-1 flex flex-col justify-center">
        <motion.div
          className={`${sizes.heading} ${isRetro ? 'font-retro-jersey text-3xl md:text-5xl' : 'font-black tracking-tight'} uppercase leading-tight mb-1 ${isSpinning ? 'truncate whitespace-nowrap' : 'whitespace-normal'}`}
          style={{
            color: isSelected ? '#ffffff' : tierConfig.color,
            textShadow: isRetro
              ? isSelected
                ? '2px 2px 0px #000000'
                : '1px 1px 0px #000000'
              : 'none',
          }}
          animate={{
            opacity: isSpinning ? 0.7 : 1,
            filter: isSpinning ? (isRetro ? 'none' : 'blur(2px)') : 'blur(0px)',
            textShadow:
              !isRetro && isSelected
                ? [
                    `0 0 10px ${tierConfig.color}`,
                    `0 0 20px ${tierConfig.color}`,
                    `0 0 10px ${tierConfig.color}`,
                  ]
                : undefined,
          }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {displayCard.name}
        </motion.div>

        <motion.div
          className={`${sizes.subheading} ${isRetro ? 'font-retro-jersey text-xl md:text-2xl' : 'font-bold'} ${isSelected ? 'text-white' : 'text-slate-300'} leading-tight`}
          animate={{ opacity: isStopped ? 1 : 0 }}
        >
          {isStopped ? displayCard.description : 'Decrypting slot...'}
        </motion.div>
      </div>

      {/* Far Right: Status/Instruction */}
      <div className="ml-4 shrink-0 hidden md:block pr-4">
        {isStopped ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: 1,
              scale: isSelected ? [1, 1.2, 1] : 1,
              backgroundColor: isSelected
                ? isRetro
                  ? '#fbbf24'
                  : '#ffffff'
                : 'rgba(255,255,255,0.1)',
              color: isSelected ? '#000000' : '#ffffff',
            }}
            transition={{ duration: 0.5, repeat: isSelected ? Infinity : 0 }}
            className={`px-4 py-1.5 border border-white/20 text-xs font-black uppercase tracking-tighter ${isRetro ? 'rounded-none' : 'rounded-lg shadow-xl'}`}
          >
            {isSelected ? '★ Select' : 'Select'}
          </motion.div>
        ) : (
          <div className="w-8 h-8 flex items-center justify-center">
            <div
              className={`w-1 h-4 bg-white/20 animate-pulse mx-0.5 ${isRetro ? '' : 'rounded-full'}`}
            />
            <div
              className={`w-1 h-6 bg-white/40 animate-pulse mx-0.5 ${isRetro ? '' : 'rounded-full'}`}
              style={{ animationDelay: '0.1s' }}
            />
            <div
              className={`w-1 h-4 bg-white/20 animate-pulse mx-0.5 ${isRetro ? '' : 'rounded-full'}`}
              style={{ animationDelay: '0.2s' }}
            />
          </div>
        )}
      </div>

      {/* Retro Highlight Overlay */}
      {isSelected && isStopped && isRetro && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0, 0.1, 0] }}
          transition={{ duration: 0.2, repeat: Infinity }}
          style={{ backgroundColor: '#ffffff' }}
        />
      )}
    </motion.button>
  );
};
