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
  const remainingSeconds = effect.isPermanent ? null : Math.ceil(effect.remainingMs / 1000);

  // Determine if buff or debuff based on common indicators
  const isDebuff = ['Slowed', 'Vulnerable', 'Liquidated', 'Weakened'].includes(effect.name);

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-md
        ${
          isDebuff
            ? 'bg-red-900/60 border border-red-500/50'
            : 'bg-emerald-900/60 border border-emerald-500/50'
        }
        animate-pulse-slow
      `}
      title={effect.description}
    >
      {/* Icon */}
      <span className="text-lg">{effect.icon}</span>

      {/* Name */}
      <span className={`text-xs font-medium ${isDebuff ? 'text-red-300' : 'text-emerald-300'}`}>
        {effect.name}
      </span>

      {/* Duration */}
      {remainingSeconds !== null && (
        <span
          className={`
            text-xs font-mono ml-1 px-1.5 py-0.5 rounded
            ${
              remainingSeconds <= 3
                ? 'bg-red-600/80 text-white animate-pulse'
                : isDebuff
                  ? 'bg-red-800/60 text-red-200'
                  : 'bg-emerald-800/60 text-emerald-200'
            }
          `}
        >
          {remainingSeconds}s
        </span>
      )}

      {/* Permanent indicator */}
      {effect.isPermanent && <span className="text-xs text-yellow-400">∞</span>}
    </div>
  );
};

export default BuffIndicator;
