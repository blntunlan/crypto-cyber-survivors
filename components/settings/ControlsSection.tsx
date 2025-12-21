/**
 * ControlsSection - Keyboard Controls Reference Component
 *
 * Displays keyboard shortcuts for the game.
 */

import React from 'react';

export const ControlsSection: React.FC = () => {
  return (
    <section className="space-y-3 md:space-y-4">
      <h3 className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">
        Controls
      </h3>
      <div className="grid grid-cols-2 gap-2 bg-white/5 p-3 md:p-4 rounded-xl border border-white/5">
        <div className="flex flex-col">
          <span className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase">
            Movement
          </span>
          <span className="text-xs md:text-sm font-bold text-white font-mono leading-tight">
            WASD / ARROWS
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase">Dash</span>
          <span className="text-xs md:text-sm font-bold text-white font-mono leading-tight">
            SPACE
          </span>
        </div>
        <div className="flex flex-col mt-1 md:mt-2">
          <span className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase">
            Pause
          </span>
          <span className="text-xs md:text-sm font-bold text-white font-mono leading-tight">
            ESC / P
          </span>
        </div>
        <div className="flex flex-col mt-1 md:mt-2">
          <span className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase">
            Auto-Fire
          </span>
          <span className="text-[8px] md:text-[10px] font-bold text-yellow-500/80 uppercase">
            Always On
          </span>
        </div>
      </div>
    </section>
  );
};
