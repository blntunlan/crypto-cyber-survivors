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
        className="fixed bottom-4 right-80 z-[9999] bg-slate-800 text-slate-400 p-2 rounded-lg 
                           border border-slate-700 hover:bg-slate-700 transition-colors text-[10px]"
      >
        ⚡ COMBO DBG (ALT+C)
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 w-72 bg-slate-900/90 border border-amber-500/40 rounded-xl p-4 z-[9999] shadow-[0_0_30px_rgba(245,158,11,0.15)] backdrop-blur-md">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_#f59e0b]"></div>
          <h3 className="text-amber-500 font-bold uppercase tracking-wider text-[10px]">
            Combo Debugger
          </h3>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-slate-500 hover:text-white transition-colors"
        >
          <svg
            className="w-4 h-4"
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
        <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 shadow-inner">
          <div className="flex justify-between items-end mb-1">
            <span className="text-slate-500 text-[9px] uppercase font-bold">
              Current Streak
            </span>
            <span className="text-white font-black text-xl leading-none">
              {state.killStreak}
            </span>
          </div>

          <div className="flex justify-between items-center mb-3">
            <span className="text-slate-500 text-[9px] uppercase font-bold">
              Multiplier
            </span>
            <span className="text-amber-400 font-bold">
              {state.comboMultiplier.toFixed(1)}x
            </span>
          </div>

          {/* Timer Bar */}
          <div className="relative h-2 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner border border-slate-700/50">
            <div
              className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(245,158,11,0.5)]"
              style={{ width: `${timeRemaining * 100}%` }}
            />
            {/* Pulse effect when low time */}
            {timeRemaining < 0.3 && (
              <div className="absolute inset-0 bg-red-500/20 animate-pulse"></div>
            )}
          </div>

          <div className="flex justify-between mt-2 text-[9px]">
            <span className="text-slate-500">Bonus XP:</span>
            <span className="text-green-400 font-bold">+{state.totalBonusXp}</span>
          </div>
        </div>

        {/* Simulation Controls */}
        <div className="space-y-2">
          <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest pl-1">
            Simulation
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 10, 50].map(n => (
              <button
                key={n}
                onClick={() => simulateKill(n)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-lg border border-slate-700 transition-all active:scale-95 text-[10px] font-bold"
              >
                +{n} Kill
              </button>
            ))}
          </div>

          <button
            onClick={goToNextMilestone}
            className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 py-2 rounded-lg border border-amber-500/30 transition-all active:scale-[0.98] text-[10px] font-bold shadow-[0_0_15px_rgba(245,158,11,0.05)]"
          >
            ⚡ Trigger Next Milestone
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => simulateGem(false)}
            className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 py-2 rounded-lg border border-blue-500/20 transition-all active:scale-95 text-[10px] font-bold"
          >
            💎 Common Gem
          </button>
          <button
            onClick={() => simulateGem(true)}
            className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 py-2 rounded-lg border border-purple-500/20 transition-all active:scale-95 text-[10px] font-bold"
          >
            ✨ Rare Gem
          </button>
        </div>

        <button
          onClick={() => ComboSystem.resetCombo()}
          className="w-full bg-slate-800 hover:bg-red-900/20 hover:text-red-400 hover:border-red-500/30 text-slate-400 py-2 rounded-lg border border-slate-700 transition-all active:scale-[0.98] text-[10px] font-bold"
        >
          🛑 Force Reset Combo
        </button>

        {/* Milestone Roadmap */}
        <div className="pt-2 border-t border-slate-800/50">
          <div className="text-[8px] text-slate-600 uppercase font-bold tracking-[0.2em] mb-2 flex justify-between">
            <span>Milestone Path</span>
            <span>{COMBO_MILESTONES.length} Total</span>
          </div>
          <div className="space-y-1">
            {COMBO_MILESTONES.map(m => {
              const isAchieved = state.killStreak >= m.kills;
              return (
                <div key={m.kills} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-1 h-1 rounded-full ${isAchieved ? 'bg-amber-500 shadow-[0_0_4px_#f59e0b]' : 'bg-slate-800'}`}
                    ></div>
                    <span
                      className={`text-[9px] ${isAchieved ? 'text-amber-500/80 font-bold' : 'text-slate-600'}`}
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
