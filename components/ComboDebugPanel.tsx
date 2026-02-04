/**
 * ComboDebugPanel - Development-only combo system debugging
 *
 * Allows manual triggering of combo events and visualization of internal state.
 * Only visible in development mode.
 */

import React, { useState, useEffect, useRef } from 'react';
import { ComboSystem, COMBO_MILESTONES } from '../services/combat/ComboSystem';
import { EventBus } from '../services/core/EventBus';

export const ComboDebugPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [state, setState] = useState(ComboSystem.getState());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const requestRef = useRef<number | null>(null);

  // Check if we should show the panel (must check before conditional return)
  const shouldShow = import.meta.env.DEV;

  useEffect(() => {
    if (!shouldShow) return;

    const unsub = EventBus.on('comboUpdate', () => {
      setState(ComboSystem.getState());
    });

    const updateLoop = () => {
      setTimeRemaining(ComboSystem.getComboTimeRemaining());
      requestRef.current = requestAnimationFrame(updateLoop);
    };
    requestRef.current = requestAnimationFrame(updateLoop);

    // Listen for 'C' key to toggle debug panel
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'c' && e.altKey) {
        setIsVisible(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsub();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shouldShow]);

  // Early return AFTER all hooks
  if (!shouldShow) return null;

  const simulateKill = (count: number = 1) => {
    for (let i = 0; i < count; i++) {
      EventBus.emit('enemyKilled', {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        type: 'debug',
        isCrit: false,
      });
    }
  };

  const simulateGem = (isRare: boolean = false) => {
    EventBus.emit('gemCollected', {
      value: isRare ? 50 : 10,
      isRare,
    });
  };

  const goToNextMilestone = () => {
    const next = ComboSystem.getNextMilestone();
    if (next) {
      const needed = next.kills - state.killStreak;
      if (needed > 0) simulateKill(needed);
    } else {
      // If no more milestones, just add 10
      simulateKill(10);
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-80 z-[9999] rounded-lg border border-slate-700 bg-slate-800 
                           p-2 text-[10px] text-slate-400 transition-colors hover:bg-slate-700"
      >
        ⚡ COMBO DBG (ALT+C)
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-[9999] w-72 rounded-sm border border-amber-500/40 bg-slate-900/90 p-4 shadow-[0_0_30px_rgba(245,158,11,0.15)] backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></div>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
            Combo Debugger
          </h3>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-slate-500 transition-colors hover:text-white"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {/* Stats Card */}
        <div className="rounded-lg border border-slate-800/50 bg-slate-950/50 p-3 shadow-inner">
          <div className="mb-1 flex items-end justify-between">
            <span className="text-[9px] font-bold uppercase text-slate-500">
              Current Streak
            </span>
            <span className="text-xl font-black leading-none text-white">
              {state.killStreak}
            </span>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase text-slate-500">
              Multiplier
            </span>
            <span className="font-bold text-amber-400">
              {state.comboMultiplier.toFixed(1)}x
            </span>
          </div>

          {/* Timer Bar */}
          <div className="relative h-2 w-full overflow-hidden rounded-full border border-slate-700/50 bg-slate-800 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all duration-100 ease-linear"
              style={{ width: `${timeRemaining * 100}%` }}
            />
            {/* Pulse effect when low time */}
            {timeRemaining < 0.3 && (
              <div className="absolute inset-0 animate-pulse bg-red-500/20"></div>
            )}
          </div>

          <div className="mt-2 flex justify-between text-[9px]">
            <span className="text-slate-500">Bonus XP:</span>
            <span className="font-bold text-green-400">+{state.totalBonusXp}</span>
          </div>
        </div>

        {/* Simulation Controls */}
        <div className="space-y-2">
          <div className="pl-1 text-[9px] font-bold uppercase tracking-widest text-slate-500">
            Simulation
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 10, 50].map(n => (
              <button
                key={n}
                onClick={() => simulateKill(n)}
                className="rounded-lg border border-slate-700 bg-slate-800 py-2 text-[10px] font-bold text-slate-200 transition-all hover:bg-slate-700 active:scale-95"
              >
                +{n} Kill
              </button>
            ))}
          </div>

          <button
            onClick={goToNextMilestone}
            className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 py-2 text-[10px] font-bold text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.05)] transition-all hover:bg-amber-500/20 active:scale-[0.98]"
          >
            ⚡ Trigger Next Milestone
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => simulateGem(false)}
            className="rounded-lg border border-blue-500/20 bg-blue-500/10 py-2 text-[10px] font-bold text-blue-400 transition-all hover:bg-blue-500/20 active:scale-95"
          >
            💎 Common Gem
          </button>
          <button
            onClick={() => simulateGem(true)}
            className="rounded-lg border border-purple-500/20 bg-purple-500/10 py-2 text-[10px] font-bold text-purple-400 transition-all hover:bg-purple-500/20 active:scale-95"
          >
            ✨ Rare Gem
          </button>
        </div>

        <button
          onClick={() => ComboSystem.resetCombo()}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 text-[10px] font-bold text-slate-400 transition-all hover:border-red-500/30 hover:bg-red-900/20 hover:text-red-400 active:scale-[0.98]"
        >
          🛑 Force Reset Combo
        </button>

        {/* Milestone Roadmap */}
        <div className="border-t border-slate-800/50 pt-2">
          <div className="mb-2 flex justify-between text-[8px] font-bold uppercase tracking-[0.2em] text-slate-600">
            <span>Milestone Path</span>
            <span>{COMBO_MILESTONES.length} Total</span>
          </div>
          <div className="space-y-1">
            {COMBO_MILESTONES.map(m => {
              const isAchieved = state.killStreak >= m.kills;
              return (
                <div key={m.kills} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-1 w-1 rounded-full ${isAchieved ? 'bg-amber-500 shadow-[0_0_4px_#f59e0b]' : 'bg-slate-800'}`}
                    ></div>
                    <span
                      className={`text-[9px] ${isAchieved ? 'font-bold text-amber-500/80' : 'text-slate-600'}`}
                    >
                      {m.name}
                    </span>
                  </div>
                  <span
                    className={`text-[8px] ${isAchieved ? 'text-amber-500/60' : 'text-slate-700'}`}
                  >
                    {m.kills} kills
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
