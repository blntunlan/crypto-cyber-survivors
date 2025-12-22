import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { type Card, TIER_CONFIG, ALL_CARDS_FLAT } from '../../../services/CardSystem';
import { audio } from '../../../services/audioService';
import { type SlotReelProps } from './types';
import { SLOT_CONFIG } from './constants';
import { CardIcon } from './CardIcon';

export const SlotReel: React.FC<SlotReelProps> = ({
  finalCard,
  reelIndex,
  stopOrder,
  onSelect,
  onStopped,
  isSelected = false,
}) => {
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
          // Play anticipation sound when slowing starts
          audio.playAnticipation(0.8 + stopOrder * 0.2);
        }
        const slowdownProgress = (elapsed - slowdownStartTime) / SLOT_CONFIG.SLOWDOWN_DURATION;
        currentInterval = SLOT_CONFIG.SPIN_INTERVAL + slowdownProgress * 200;
      }

      // High-precision ticking for sounds and visual swaps
      if (now - lastTickTime > currentInterval) {
        lastTickTime = now;

        setDisplayIndex(prev => (prev + 1) % (spinCards.length - 1));

        // Sound on every display change, AudioService handles cooldown
        // Don't play tick if we are about to stop (within 100ms) to ensure clean Stop sound
        if (totalDuration - elapsed > 100) {
          audio.playSlotTick(isSlowing ? 0.8 : 1);
        }
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [stopOrder, spinCards]);

  const hasCalledOnStopped = useRef(false);

  useEffect(() => {
    if (isStopped && !hasCalledOnStopped.current) {
      hasCalledOnStopped.current = true;
      // Note: playReelStop is deprecated, using playSlotTick as final stop sound
      audio.playSlotTick(1);
      onStopped();
    }
  }, [isStopped, onStopped]);

  const displayCard = (phase === 'stopped' ? finalCard : spinCards[displayIndex]) ?? finalCard;
  const tierConfig = TIER_CONFIG[displayCard.tier];
  const isSpinning = phase !== 'stopped';
  const isSlowingDown = phase === 'slowing';

  return (
    <motion.button
      onClick={() => isStopped && onSelect(finalCard)}
      disabled={!isStopped}
      className={`group flex flex-row items-center text-left p-3 md:p-5 rounded-xl md:rounded-2xl transition-all w-full relative overflow-hidden ${isStopped ? 'cursor-pointer hover:translate-x-2' : 'cursor-wait'} ${isSelected && isStopped ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent translate-x-2' : ''}`}
      style={{
        backgroundColor: isSelected && isStopped ? `${tierConfig.bgColor}` : tierConfig.bgColor,
        borderWidth: isSelected && isStopped ? '3px' : '2px',
        borderStyle: 'solid',
        borderColor: isSelected && isStopped ? '#ffffff' : tierConfig.borderColor,
        boxShadow:
          isSelected && isStopped
            ? `0 0 40px ${tierConfig.glowColor}80, 0 0 20px #ffffff40`
            : displayCard.tier !== 'common'
              ? `0 0 30px ${tierConfig.glowColor}30`
              : 'none',
      }}
      initial={{ opacity: 0, x: -100 }}
      animate={{
        opacity: 1,
        x: isSelected && isStopped ? 8 : 0,
        scale: isSelected && isStopped ? 1.02 : 1,
        transition: { type: 'spring', stiffness: 400, damping: 30, delay: reelIndex * 0.1 },
      }}
      whileHover={isStopped ? { backgroundColor: `${tierConfig.bgColor}ee` } : {}}
      whileTap={isStopped ? { scale: 0.99 } : {}}
    >
      {/* Left: Icon & Badge */}
      <div className="flex flex-col items-center justify-center mr-4 md:mr-8 shrink-0 w-20 md:w-28">
        {/* Tier Badge */}
        <motion.div
          className="text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-1 md:mb-2 text-center"
          style={{ color: tierConfig.color }}
          animate={{ opacity: isSpinning ? [0.5, 1, 0.5] : 1 }}
          transition={isSpinning ? { duration: 0.1, repeat: Infinity } : {}}
        >
          {tierConfig.name}
        </motion.div>

        {/* Spinning Icon Container */}
        <div className="text-3xl md:text-5xl flex items-center justify-center w-14 h-14 md:w-20 md:h-20 relative">
          <motion.div
            className="absolute inset-0 rounded-full blur-xl"
            style={{ backgroundColor: tierConfig.color }}
            animate={{
              opacity: isSlowingDown
                ? [0.3, 0.6, 0.3]
                : isSpinning
                  ? [0.1, 0.3, 0.1]
                  : [0.1, 0.4, 0.1],
              scale: isSlowingDown ? [1, 1.3, 1] : isSpinning ? 1 : [0.9, 1.2, 0.9],
            }}
            transition={{
              duration: isSlowingDown ? 0.3 : isSpinning ? 0.2 : 1.5,
              repeat: Infinity,
            }}
          />

          <motion.div
            className="relative z-10"
            style={{ mixBlendMode: 'plus-lighter' }}
            animate={{
              y: isSpinning ? (isSlowingDown ? [-10, 10] : [-20, 20]) : 0,
              opacity: isSpinning ? (isSlowingDown ? [0.9, 1, 0.9] : [0.7, 1, 0.7]) : 1,
              scale: isStopped ? [0.8, 1.15, 1] : isSlowingDown ? 1.05 : 1,
            }}
            transition={
              isSpinning
                ? { duration: isSlowingDown ? 0.15 : 0.1, repeat: Infinity, ease: 'linear' }
                : isStopped
                  ? { duration: 0.4, ease: 'easeOut' }
                  : {}
            }
          >
            <CardIcon card={displayCard} color={tierConfig.color} scaleDown={true} />
          </motion.div>
        </div>
      </div>

      {/* Middle/Right: Info */}
      <div className="flex-1 flex flex-col justify-center">
        <motion.div
          className="text-base md:text-2xl font-black uppercase leading-none mb-1"
          style={{ color: tierConfig.color }}
          animate={{
            opacity: isSpinning ? 0.7 : 1,
            filter: isSpinning ? 'blur(2px)' : 'blur(0px)',
          }}
        >
          {displayCard.name}
        </motion.div>

        <motion.div
          className="text-[10px] md:text-sm text-slate-300 font-bold leading-tight"
          animate={{ opacity: isStopped ? 1 : 0 }}
        >
          {isStopped ? displayCard.description : 'Decrypting slot...'}
        </motion.div>
      </div>

      {/* Far Right: Status/Instruction */}
      <div className="ml-4 shrink-0 hidden md:block">
        {isStopped ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-3 py-1 rounded bg-white/10 border border-white/20 text-[10px] font-black uppercase tracking-tighter text-white"
          >
            Select
          </motion.div>
        ) : (
          <div className="w-8 h-8 flex items-center justify-center">
            <div className="w-1 h-4 bg-white/20 animate-pulse rounded-full mx-0.5" />
            <div
              className="w-1 h-6 bg-white/40 animate-pulse rounded-full mx-0.5"
              style={{ animationDelay: '0.1s' }}
            />
            <div
              className="w-1 h-4 bg-white/20 animate-pulse rounded-full mx-0.5"
              style={{ animationDelay: '0.2s' }}
            />
          </div>
        )}
      </div>
    </motion.button>
  );
};
