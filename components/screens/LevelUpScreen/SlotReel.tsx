import React, { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ALL_CARDS_FLAT,
  type Card,
  TIER_CONFIG,
} from '../../../services/cards/CardSystem';
import { audio } from '../../../services/audio';
import { type SlotReelProps } from './types';
import { SLOT_CONFIG } from './constants';
import { CardIcon } from './CardIcon';
import { useThemeSize } from '../../../hooks/useThemeSize';
import { useIsRetro } from '../../../contexts/useTheme';
import { COLORS } from '../../../constants';
import { HUD_WAR_ROOM } from '../../../config/HUDWarRoom';

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
    const pool = ALL_CARDS_FLAT.filter(card => card.id !== finalCard.id);
    const cards: Card[] = [];
    for (let index = 0; index < SLOT_CONFIG.CARDS_PER_SPIN; index++) {
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
    const soundSkip = 2;
    const minRenderIntervalSource =
      typeof SLOT_CONFIG.MIN_RENDER_INTERVAL === 'number'
        ? SLOT_CONFIG.MIN_RENDER_INTERVAL
        : SLOT_CONFIG.SPIN_INTERVAL;
    const minRenderInterval = Math.max(16, minRenderIntervalSource);
    const stopDelay =
      SLOT_CONFIG.SPIN_DURATION +
      stopOrder * SLOT_CONFIG.STOP_DELAY_INCREMENT +
      SLOT_CONFIG.STOP_DELAY_BASE;
    const slowdownStartTime = stopDelay - SLOT_CONFIG.SLOWDOWN_DURATION;
    let rafId: number;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;

      if (elapsed >= stopDelay) {
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

      if (now - lastTickTime > currentInterval) {
        lastTickTime = now;
        displayIndex = (displayIndex + 1) % (spinCards.length - 1);
        soundTickCount++;

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

        if (stopDelay - elapsed > 100) {
          const shouldPlaySound = isSlowing || soundTickCount % soundSkip === 0;
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
  const reelState = isSelected && isStopped ? 'selected' : isStopped ? 'locked' : phase;
  const stateColor = isSelected
    ? COLORS.CASINO_GOLD
    : isStopped
      ? HUD_WAR_ROOM.colors.mint
      : COLORS.ELECTRIC_BLUE;

  return (
    <motion.button
      data-testid="level-up-reel"
      data-reel-index={reelIndex}
      data-reel-state={reelState}
      onClick={() => isStopped && onSelect(finalCard)}
      disabled={!isStopped}
      aria-busy={isSpinning}
      className={`group relative grid min-h-[86px] w-full grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2 overflow-hidden border p-2 text-left transition-colors motion-reduce:transition-none sm:min-h-[108px] sm:grid-cols-[5.75rem_minmax(0,1fr)_auto] sm:gap-4 sm:p-3 ${isRetro ? 'rounded-none border-2' : 'rounded-none'} ${isStopped ? 'cursor-pointer' : 'cursor-wait'} ${isSelected && isStopped ? 'z-10' : 'z-0'}`}
      style={{
        background: isSelected
          ? `linear-gradient(90deg, ${COLORS.CASINO_GOLD}20, #05090ff5 38%)`
          : isStopped
            ? `linear-gradient(90deg, ${tierConfig.bgColor}, #05090ff5 42%)`
            : 'linear-gradient(90deg, rgba(0,191,255,0.07), rgba(5,9,15,0.96) 40%)',
        borderColor: isSelected
          ? COLORS.CASINO_GOLD
          : isStopped
            ? `${tierConfig.borderColor}aa`
            : `${COLORS.ELECTRIC_BLUE}45`,
        boxShadow:
          isSelected && !isRetro
            ? `inset 0 0 28px ${COLORS.CASINO_GOLD}12, 0 0 18px ${COLORS.CASINO_GOLD}16`
            : isStopped && displayCard.tier !== 'common' && !isRetro
              ? `inset 0 0 22px ${tierConfig.glowColor}12`
              : isRetro && isSelected
                ? '4px 4px 0 rgba(0,0,0,0.65)'
                : 'none',
      }}
      initial={{ opacity: 0, x: -28 }}
      animate={{
        opacity: 1,
        x: isSelected && isStopped ? (isRetro ? 4 : 3) : 0,
        scale: 1,
        transition: {
          opacity: { duration: 0.2, delay: reelIndex * 0.06 },
          x: { type: 'spring', stiffness: 420, damping: 30 },
        },
      }}
      whileHover={
        isStopped && !isSelected ? { x: isRetro ? 2 : 3, borderColor: stateColor } : {}
      }
      whileTap={isStopped ? { scale: 0.99 } : {}}
    >
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[3px] sm:w-1"
        style={{
          backgroundColor: stateColor,
          boxShadow: isStopped ? `0 0 12px ${stateColor}88` : 'none',
        }}
      />

      <div className="flex min-w-0 flex-col items-center justify-center border-r border-white/5 pr-2 sm:pr-4">
        <motion.div
          className={`${sizes.tiny} mb-1 text-center font-black uppercase tracking-[0.16em]`}
          style={{ color: tierConfig.color }}
          animate={{ opacity: isSpinning ? 0.58 : 1 }}
        >
          {tierConfig.name}
        </motion.div>

        <div className="relative flex h-11 w-11 items-center justify-center text-2xl sm:h-14 sm:w-14 sm:text-3xl">
          <motion.div
            className={`absolute inset-1 ${isRetro ? '' : 'blur-lg'}`}
            style={{ backgroundColor: isRetro ? 'transparent' : tierConfig.color }}
            animate={{
              opacity: isRetro ? 0 : isSpinning ? 0.1 : isSelected ? 0.34 : 0.2,
            }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="relative z-10"
            style={{ mixBlendMode: isRetro ? 'normal' : 'plus-lighter' }}
            animate={{
              y: isSlowingDown ? -2 : 0,
              opacity: isSpinning ? 0.62 : 1,
              scale: isStopped ? 1 : 0.94,
            }}
            transition={{ duration: 0.15 }}
          >
            <CardIcon
              card={displayCard}
              color={isSelected ? COLORS.CASINO_GOLD : tierConfig.color}
              scaleDown={true}
            />
          </motion.div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col justify-center">
        <motion.div
          className={`${isRetro ? 'font-retro-jersey text-xl sm:text-3xl' : 'font-cyber text-base font-black tracking-tight sm:text-xl'} mb-1 truncate uppercase leading-tight`}
          style={{
            color: isSelected
              ? COLORS.CASINO_GOLD
              : isStopped
                ? '#ffffff'
                : tierConfig.color,
            textShadow: isRetro
              ? isSelected
                ? `2px 2px 0 ${COLORS.SLOT_BLACK}`
                : '1px 1px 0 #000000'
              : 'none',
          }}
          animate={{
            opacity: isSpinning ? 0.58 : 1,
            filter: isSpinning && !isRetro ? 'blur(1px)' : 'blur(0px)',
          }}
          transition={{ duration: 0.15 }}
        >
          {displayCard.name}
        </motion.div>

        <motion.div
          className={`${isRetro ? 'font-retro-text text-[9px] sm:text-xs' : 'text-[11px] font-semibold sm:text-sm'} line-clamp-2 leading-snug ${isSelected ? 'text-white' : 'text-slate-300'}`}
          animate={{ opacity: isStopped ? 0.92 : 0.42 }}
        >
          {isStopped ? displayCard.description : 'Decrypting slot...'}
        </motion.div>
      </div>

      <div className="hidden shrink-0 pr-1 sm:block">
        {isStopped ? (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            className={`${isRetro ? 'font-retro-pixel text-[7px]' : 'font-mono text-[9px]'} border px-2.5 py-1.5 font-black uppercase tracking-[0.12em]`}
            style={{
              borderColor: isSelected ? COLORS.CASINO_GOLD : `${stateColor}55`,
              color: isSelected ? COLORS.CASINO_GOLD : HUD_WAR_ROOM.colors.mint,
              backgroundColor: isSelected ? `${COLORS.CASINO_GOLD}12` : 'transparent',
            }}
          >
            {isSelected ? '★ Select' : 'Locked'}
          </motion.div>
        ) : (
          <div className="flex h-8 items-center justify-center" aria-hidden="true">
            <div
              className="mx-0.5 h-3 w-0.5 animate-pulse motion-reduce:animate-none"
              style={{ backgroundColor: `${COLORS.ELECTRIC_BLUE}55` }}
            />
            <div
              className="mx-0.5 h-5 w-0.5 animate-pulse motion-reduce:animate-none"
              style={{
                backgroundColor: `${COLORS.ELECTRIC_BLUE}aa`,
                animationDelay: '0.1s',
              }}
            />
            <div
              className="mx-0.5 h-3 w-0.5 animate-pulse motion-reduce:animate-none"
              style={{
                backgroundColor: `${COLORS.ELECTRIC_BLUE}55`,
                animationDelay: '0.2s',
              }}
            />
          </div>
        )}
      </div>
    </motion.button>
  );
};
