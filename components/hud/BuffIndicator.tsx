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

  // Don't show when not playing
  if (status !== GameStatus.PLAYING || effects.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 mt-2 pointer-events-none">
      {effects.map(effect => (
        <BuffItem key={effect.id} effect={effect} />
      ))}
    </div>
  );
};

interface BuffItemProps {
  effect: ActiveEffect;
}

const BuffItem: React.FC<BuffItemProps> = ({ effect }) => {
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
        flex items-center gap-1 md:gap-2 px-2 py-1 md:px-3 md:py-1.5 rounded-lg
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
      {/* Icon - smaller on mobile */}
      <span className="text-base md:text-xl">{effect.icon}</span>

      {/* Name - smaller on mobile */}
      <span
        className={`text-xs md:text-sm font-medium ${isDebuff ? 'text-rose-200' : 'text-emerald-200'}`}
      >
        {effect.name}
      </span>

      {/* Duration - smaller on mobile */}
      {remainingSeconds !== null && (
        <span
          className={`
            text-[10px] md:text-sm font-stats ml-0.5 md:ml-1 px-1 md:px-1.5 py-0.5 rounded
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
        <span className="text-[10px] md:text-xs text-yellow-400">∞</span>
      )}
    </div>
  );
};

export default BuffIndicator;
