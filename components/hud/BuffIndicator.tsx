/**
 * BuffIndicator - UI Component for Active Buffs/Debuffs
 *
 * Displays active effects with icons, names, and remaining time.
 * Integrates with BuffManager via EventBus for real-time updates.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { BuffManager } from '../../services/patterns/decorators/BuffManager';
import { EventBus } from '../../services/core/EventBus';
import { GameStatus } from '../../types';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import { useLanguage } from '../../contexts/LanguageContext';

import { screenService } from '../../services/system/ScreenService';

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
  const { isVeryNarrow } = useResponsiveUI();
  const [isMobile, setIsMobile] = useState(() => screenService.isMobile());

  // Handle resizing
  useEffect(() => {
    const unsub = screenService.onChange(() => {
      setIsMobile(screenService.isMobile());
    });
    return unsub;
  }, []);

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

  // Don't show when not playing or no effects
  if (status !== GameStatus.PLAYING || effects.length === 0) {
    return null;
  }

  // On small devices, show more effects since they are now horizontal and compact.
  // Very narrow screens (<320px) get an ultra-compact icon-only row instead of
  // being hidden entirely — players still need to see active buffs/debuffs.
  const MOBILE_CAP = isVeryNarrow ? 4 : 6;
  const displayEffects = isMobile ? effects.slice(0, MOBILE_CAP) : effects;
  const overflowCount = isMobile ? Math.max(0, effects.length - MOBILE_CAP) : 0;

  return (
    <div
      className={`flex ${isMobile ? 'flex-row flex-wrap gap-1.5' : 'flex-col gap-1'} pointer-events-none mt-2`}
    >
      {displayEffects.map(effect => (
        <BuffItem
          key={effect.id}
          effect={effect}
          isMobile={isMobile}
          isVeryNarrow={isVeryNarrow}
        />
      ))}
      {overflowCount > 0 && (
        <div className="flex items-center rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5">
          <span className="text-[8px] font-bold text-slate-400">+{overflowCount}</span>
        </div>
      )}
    </div>
  );
};

interface BuffItemProps {
  effect: ActiveEffect;
  isMobile?: boolean;
  isVeryNarrow?: boolean;
}

const BuffItem: React.FC<BuffItemProps> = ({
  effect,
  isMobile = false,
  isVeryNarrow = false,
}) => {
  const { t } = useLanguage();
  const remainingSeconds = effect.isPermanent
    ? null
    : Math.ceil(effect.remainingMs / 1000);

  // Determine if buff or debuff based on common indicators
  const isDebuff = ['Slowed', 'Vulnerable', 'Liquidated', 'Weakened'].includes(
    effect.name
  );

  const localizedName = t(`hud.buffs.${effect.name.toLowerCase().replace(/ /g, '_')}`, {
    defaultValue: effect.name,
  });

  if (isMobile) {
    // Ultra-compact: icon + timer only (very narrow screens <320px)
    if (isVeryNarrow) {
      return (
        <div
          className={`
            flex items-center gap-0.5 rounded border border-white/10 px-1 py-0.5
            ${isDebuff ? 'bg-rose-500/20' : 'bg-emerald-500/20'}
            animate-pulse-slow
          `}
          title={`${localizedName} — ${effect.description}`}
        >
          <span className="text-[10px]">{effect.icon}</span>
          {remainingSeconds !== null ? (
            <span
              className={`font-stats text-[7px] font-bold ${remainingSeconds <= 3 ? 'animate-pulse text-white' : 'opacity-90'}`}
            >
              {remainingSeconds}s
            </span>
          ) : (
            <span className="text-[7px] font-bold text-yellow-400">∞</span>
          )}
        </div>
      );
    }

    // Mobile: icon + truncated name + timer
    return (
      <div
        className={`
          flex items-center gap-1 rounded-md border border-white/10 px-1.5 py-0.5
          ${isDebuff ? 'bg-rose-500/20' : 'bg-emerald-500/20'}
          animate-pulse-slow
        `}
        title={`${localizedName} — ${effect.description}`}
      >
        <span className="text-xs">{effect.icon}</span>
        <span
          className={`max-w-[48px] truncate text-[8px] font-medium ${isDebuff ? 'text-rose-200' : 'text-emerald-200'}`}
        >
          {localizedName}
        </span>
        {remainingSeconds !== null ? (
          <span
            className={`font-stats text-[8px] font-bold ${remainingSeconds <= 3 ? 'animate-pulse text-white' : 'opacity-90'}`}
          >
            {remainingSeconds}s
          </span>
        ) : (
          <span className="text-[8px] font-bold text-yellow-400">∞</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`
        flex items-center gap-1 rounded-lg px-2 py-1 md:gap-2 md:px-3 md:py-1.5
        md:backdrop-blur-md
        ${
          isDebuff
            ? 'md:border md:border-rose-500/30 md:bg-rose-950/30 md:shadow-[0_0_10px_rgba(225,29,72,0.1)]'
            : 'md:border md:border-emerald-400/30 md:bg-emerald-950/30 md:shadow-[0_0_10px_rgba(52,211,153,0.1)]'
        }
        animate-pulse-slow
      `}
      title={effect.description}
    >
      {/* Icon */}
      <span className="text-base md:text-xl">{effect.icon}</span>

      {/* Name */}
      <span
        className={`text-xs font-medium md:text-sm ${isDebuff ? 'text-rose-200' : 'text-emerald-200'}`}
      >
        {localizedName}
      </span>

      {/* Duration */}
      {remainingSeconds !== null && (
        <span
          className={`
            ml-0.5 rounded px-1 py-0.5 font-stats text-[10px] md:ml-1 md:px-1.5 md:text-sm
            ${
              remainingSeconds <= 3
                ? 'animate-pulse bg-rose-600/80 text-white'
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
        <span className="text-[10px] text-yellow-400 md:text-xs">∞</span>
      )}
    </div>
  );
};

export default BuffIndicator;
