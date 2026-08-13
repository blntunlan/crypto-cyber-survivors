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
import { HudGhostRail } from './HudGhostRail';

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
      className={`flex ${isMobile ? 'flex-row flex-wrap gap-1.5' : 'flex-col items-start gap-1'} pointer-events-none mt-2`}
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
        <HudGhostRail side="left" tone="neutral" className="flex items-center py-0.5">
          <span className="text-[8px] font-bold text-slate-300">+{overflowCount}</span>
        </HudGhostRail>
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
  const tone = isDebuff ? 'danger' : 'positive';
  const effectColor = isDebuff ? 'text-rose-200' : 'text-emerald-200';
  const compactClassName = isVeryNarrow
    ? 'flex items-center gap-0.5 py-0.5 text-[10px]'
    : 'flex items-center gap-1 py-0.5 text-xs';

  if (isMobile) {
    return (
      <div title={`${localizedName} — ${effect.description}`}>
        <HudGhostRail
          side="left"
          tone={tone}
          className={`${compactClassName} ${effectColor}`}
        >
          <span>{effect.icon}</span>
          {!isVeryNarrow && (
            <span className="max-w-[48px] truncate text-[8px] font-medium">
              {localizedName}
            </span>
          )}
          {remainingSeconds !== null ? (
            <span
              className={`font-stats text-[8px] font-bold ${remainingSeconds <= 3 ? 'animate-pulse text-white' : 'opacity-90'}`}
            >
              {remainingSeconds}s
            </span>
          ) : (
            <span className="text-[8px] font-bold text-yellow-400">∞</span>
          )}
        </HudGhostRail>
      </div>
    );
  }

  return (
    <div title={effect.description}>
      <HudGhostRail
        side="left"
        tone={tone}
        className={`flex items-center gap-1 py-1 md:gap-2 md:py-1.5 ${effectColor}`}
      >
        <span className="text-base md:text-xl">{effect.icon}</span>
        <span className="text-xs font-medium md:text-sm">{localizedName}</span>
        {remainingSeconds !== null && (
          <span
            className={`ml-0.5 font-stats text-[10px] md:ml-1 md:text-sm ${
              remainingSeconds <= 3 ? 'animate-pulse text-white' : ''
            }`}
          >
            {remainingSeconds}s
          </span>
        )}
        {effect.isPermanent && (
          <span className="text-[10px] text-yellow-400 md:text-xs">∞</span>
        )}
      </HudGhostRail>
    </div>
  );
};

export default BuffIndicator;
