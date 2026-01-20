/**
 * BuffIndicator - UI Component for Active Buffs/Debuffs
 *
 * Displays active effects with icons, names, and remaining time.
 * Integrates with BuffManager via EventBus for real-time updates.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { BuffManager } from '../../services/patterns/decorators/BuffManager';
import { EventBus } from '../../services/EventBus';
import { GameStatus } from '../../types';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import { useLanguage } from '../../contexts/LanguageContext';

interface ActiveEffect {
  id: string;
  name: string;
  icon: string;
  description: string;
  remainingMs: number;
  isPermanent: boolean;
}

interface BuffIndicatorProps {
  status: GameStatus;
}

export const BuffIndicator: React.FC<BuffIndicatorProps> = ({ status }) => {
  const [effects, setEffects] = useState<ActiveEffect[]>([]);
  const { isVeryNarrow, isSmallDevice } = useResponsiveUI();

  // Update effects list
  const updateEffects = useCallback(() => {
    if (!BuffManager.isInitialized()) return;
    setEffects(BuffManager.getActiveEffects());
  }, []);

  // Subscribe to buff events
  useEffect(() => {
    const unsubApplied = EventBus.on('buffApplied', () => {
      updateEffects();
    });

    const unsubExpired = EventBus.on('buffExpired', () => {
      updateEffects();
    });

    // Initial load
    updateEffects();

    // Periodic update for remaining time
    const interval = setInterval(updateEffects, 100);

    return () => {
      unsubApplied();
      unsubExpired();
      clearInterval(interval);
    };
  }, [updateEffects]);

  // Don't show when not playing, no effects, or on very narrow screens
  if (status !== GameStatus.PLAYING || effects.length === 0 || isVeryNarrow) {
    return null;
  }

  // On small devices, only show first 2 effects to save space
  const displayEffects = isSmallDevice ? effects.slice(0, 2) : effects;

  return (
    <div className="flex flex-col gap-1 mt-2 pointer-events-none">
      {displayEffects.map(effect => (
        <BuffItem key={effect.id} effect={effect} isSmallDevice={isSmallDevice} />
      ))}
    </div>
  );
};

interface BuffItemProps {
  effect: ActiveEffect;
  isSmallDevice?: boolean;
}

const BuffItem: React.FC<BuffItemProps> = ({ effect, isSmallDevice = false }) => {
  const { t } = useLanguage();
  const remainingSeconds = effect.isPermanent
    ? null
    : Math.ceil(effect.remainingMs / 1000);

  // Determine if buff or debuff based on common indicators
  const isDebuff = ['Slowed', 'Vulnerable', 'Liquidated', 'Weakened'].includes(
    effect.name
  );

  return (
    <div
      className={`
        flex items-center rounded-lg
        ${isSmallDevice ? 'gap-0.5 px-1.5 py-0.5' : 'gap-1 md:gap-2 px-2 py-1 md:px-3 md:py-1.5'}
        ${/* Mobile: fully transparent, Desktop: keep blur effect */ ''}
        md:backdrop-blur-md
        ${
          isDebuff
            ? 'bg-transparent md:bg-rose-950/30 border-0 md:border md:border-rose-500/30 md:shadow-[0_0_10px_rgba(225,29,72,0.1)]'
            : 'bg-transparent md:bg-emerald-950/30 border-0 md:border md:border-emerald-400/30 md:shadow-[0_0_10px_rgba(52,211,153,0.1)]'
        }
        animate-pulse-slow
      `}
      title={effect.description}
    >
      {/* Icon - smaller on isSmallDevice */}
      <span className={isSmallDevice ? 'text-sm' : 'text-base md:text-xl'}>
        {effect.icon}
      </span>

      {/* Name - hidden on isSmallDevice to save space */}
      {!isSmallDevice && (
        <span
          className={`text-xs md:text-sm font-medium ${isDebuff ? 'text-rose-200' : 'text-emerald-200'}`}
        >
          {t(`hud.buffs.${effect.name.toLowerCase().replace(/ /g, '_')}`, {
            defaultValue: effect.name,
          })}
        </span>
      )}

      {/* Duration - smaller on isSmallDevice */}
      {remainingSeconds !== null && (
        <span
          className={`
            font-stats rounded
            ${isSmallDevice ? 'text-[8px] px-0.5 py-0' : 'text-[10px] md:text-sm ml-0.5 md:ml-1 px-1 md:px-1.5 py-0.5'}
            ${
              remainingSeconds <= 3
                ? 'bg-rose-600/80 text-white animate-pulse'
                : isDebuff
                  ? 'bg-rose-900/40 text-rose-200'
                  : 'bg-emerald-900/40 text-emerald-200'
            }
          `}
        >
          {remainingSeconds}s
        </span>
      )}

      {/* Permanent indicator */}
      {effect.isPermanent && (
        <span
          className={
            isSmallDevice
              ? 'text-[8px] text-yellow-400'
              : 'text-[10px] md:text-xs text-yellow-400'
          }
        >
          ∞
        </span>
      )}
    </div>
  );
};

export default BuffIndicator;
