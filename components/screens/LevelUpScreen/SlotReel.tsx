import React, { useState, useEffect, useMemo, useRef, startTransition } from 'react';
import { motion } from 'framer-motion';
import {
  type Card,
  TIER_CONFIG,
  ALL_CARDS_FLAT,
} from '../../../services/cards/CardSystem';
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
  const [phase, setPhase] = useState<'spinning' | 'slowing' | 'stopped'>('spinning');
  const [currentCard, setCurrentCard] = useState<Card>(finalCard);
  const currentCardRef = useRef(finalCard);

  const spinCards = useMemo(() => {
    const pool = ALL_CARDS_FLAT.filter(c => c.id !== finalCard.id);
    const cards: Card[] = [];
    for (let i = 0; i < SLOT_CONFIG.CARDS_PER_SPIN; i++) {
      cards.push(pool[Math.floor(Math.random() * pool.length)]!);
    }
    return [...cards, finalCard];
  }, [finalCard]);

  useEffect(() => {
    currentCardRef.current = finalCard;
  }, [finalCard]);

  useEffect(() => {
    const startTime = Date.now();
    let lastTickTime = 0;
    let isSlowing = false;
    let isDone = false;
    let displayIndex = 0;
    let lastRenderTime = 0;
    let soundTickCount = 0;
    const SOUND_SKIP = 2; // Play sound every Nth tick during fast spin
    const minRenderIntervalSource =
      typeof SLOT_CONFIG.MIN_RENDER_INTERVAL === 'number'
        ? SLOT_CONFIG.MIN_RENDER_INTERVAL
        : SLOT_CONFIG.SPIN_INTERVAL;
    const minRenderInterval = Math.max(16, minRenderIntervalSource);

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
          startTransition(() => {
            currentCardRef.current = finalCard;
            setCurrentCard(finalCard);
          });
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
        displayIndex = (displayIndex + 1) % (spinCards.length - 1);
        soundTickCount++;

        // Throttle React re-renders — update card state at most every minRenderInterval ms
        if (now - lastRenderTime >= minRenderInterval) {
          lastRenderTime = now;
          const card = spinCards[displayIndex];
          if (card && card.id !== currentCardRef.current.id) {
            currentCardRef.current = card;
            startTransition(() => {
              setCurrentCard(card);
            });
          }
        }

        // Throttle sound ticks: every Nth during fast spin, every tick during slowdown
        if (totalDuration - elapsed > 100) {
          const shouldPlaySound = isSlowing || soundTickCount % SOUND_SKIP === 0;
          if (shouldPlaySound) {
            audio.playSlotTick(isSlowing ? 0.8 : 1);
          }
        }
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [stopOrder, spinCards, finalCard]);

  const hasCalledOnStopped = useRef(false);

  useEffect(() => {
    if (isStopped && !hasCalledOnStopped.current) {
      hasCalledOnStopped.current = true;
      audio.playReelStop(reelIndex);
      audio.playMultiplierChime(reelIndex);
      onStopped();
    }
  }, [isStopped, onStopped, reelIndex]);

  const displayCard = phase === 'stopped' ? finalCard : currentCard;
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
      className={`group relative flex min-h-[100px] w-full flex-row items-center overflow-hidden p-3 text-left md:min-h-[140px] md:p-5
        ${isRetro ? 'rounded-none' : 'rounded-sm md:rounded-sm'}
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
          className="absolute left-1 top-1/2 flex -translate-y-1/2 items-center"
        >
          <div
            className={`h-12 w-1.5 ${isRetro ? 'bg-yellow-400' : 'rounded-full bg-white blur-[1px]'}`}
          />
        </motion.div>
      )}

      {/* Left: Icon & Badge */}
      <div className="mr-4 flex w-20 shrink-0 flex-col items-center justify-center pl-2 md:mr-8 md:w-28">
        {/* Tier Badge */}
        <motion.div
          className={`${sizes.tiny} mb-1 text-center font-black uppercase tracking-widest md:mb-2`}
          style={{ color: tierConfig.color }}
          animate={{
            opacity: isSpinning ? 0.7 : 1,
            scale: isSelected && isStopped ? [1, 1.1, 1] : 1,
          }}
          transition={{
            duration: 1,
            repeat: isSelected && isStopped ? Infinity : 0,
            ease: 'easeInOut',
          }}
        >
          {tierConfig.name}
        </motion.div>

        {/* Spinning Icon Container */}
        <div className="relative flex h-14 w-14 items-center justify-center text-3xl md:h-20 md:w-20 md:text-5xl">
          <motion.div
            className={`absolute inset-0 ${isRetro ? '' : 'rounded-full blur-xl'}`}
            style={{ backgroundColor: isRetro ? 'transparent' : tierConfig.color }}
            animate={
              isRetro
                ? {}
                : {
                    opacity: isSpinning
                      ? 0.2
                      : isSelected
                        ? [0.4, 0.8, 0.4]
                        : [0.1, 0.4, 0.1],
                    scale: isSpinning ? 1 : isSelected ? [1, 1.5, 1] : [0.9, 1.2, 0.9],
                  }
            }
            transition={{
              duration: isStopped ? 1.5 : 0.3,
              repeat: isStopped ? Infinity : 0,
            }}
          />

          <motion.div
            className="relative z-10"
            style={{ mixBlendMode: isRetro ? 'normal' : 'plus-lighter' }}
            animate={{
              y: isSpinning ? (isSlowingDown ? -5 : 0) : 0,
              opacity: isSpinning ? 0.8 : 1,
              scale: isStopped ? (isSelected ? [1, 1.25, 1.15] : [0.8, 1.15, 1]) : 1,
              rotate: isSelected ? [0, 5, -5, 0] : 0,
            }}
            transition={
              isStopped
                ? {
                    duration: isSelected ? 2 : 0.4,
                    repeat: isSelected ? Infinity : 0,
                    ease: 'easeInOut',
                  }
                : { duration: 0.15 }
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
      <div className="flex flex-1 flex-col justify-center">
        <motion.div
          className={`${sizes.heading} ${isRetro ? 'font-retro-jersey text-3xl md:text-5xl' : 'font-black tracking-tight'} mb-1 uppercase leading-tight ${isSpinning ? 'truncate whitespace-nowrap' : 'whitespace-normal'}`}
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
          transition={{ duration: 1, repeat: isSelected ? Infinity : 0 }}
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
      <div className="ml-4 hidden shrink-0 pr-4 md:block">
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
            className={`border border-white/20 px-4 py-1.5 text-xs font-black uppercase tracking-tighter ${isRetro ? 'rounded-none' : 'rounded-lg shadow-xl'}`}
          >
            {isSelected ? '★ Select' : 'Select'}
          </motion.div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center">
            <div
              className={`mx-0.5 h-4 w-1 animate-pulse bg-white/20 ${isRetro ? '' : 'rounded-full'}`}
            />
            <div
              className={`mx-0.5 h-6 w-1 animate-pulse bg-white/40 ${isRetro ? '' : 'rounded-full'}`}
              style={{ animationDelay: '0.1s' }}
            />
            <div
              className={`mx-0.5 h-4 w-1 animate-pulse bg-white/20 ${isRetro ? '' : 'rounded-full'}`}
              style={{ animationDelay: '0.2s' }}
            />
          </div>
        )}
      </div>

      {/* Retro Highlight Overlay */}
      {isSelected && isStopped && isRetro && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          animate={{ opacity: [0, 0.1, 0] }}
          transition={{ duration: 0.2, repeat: Infinity }}
          style={{ backgroundColor: '#ffffff' }}
        />
      )}
    </motion.button>
  );
};
