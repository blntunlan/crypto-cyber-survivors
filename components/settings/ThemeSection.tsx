/**
 * ThemeSection - Theme Selection Settings
 *
 * Allows users to switch between Cyberpunk and 16-bit Retro themes.
 * Supports keyboard navigation with left/right arrows to switch themes.
 */

import React from 'react';
import { useTheme } from '../../contexts/useTheme';

import { IconCyberpunk, IconRetro } from '../icons/CardIcons';

interface ThemeSectionProps {
  isFocused?: boolean;
}

export const ThemeSection: React.FC<ThemeSectionProps> = ({ isFocused = false }) => {
  const { themeName, toggleTheme, theme } = useTheme();

  const isCyberpunk = themeName === 'cyberpunk';

  // Note: Keyboard navigation is handled by parent SettingsPanel
  // This component only needs to render and respond to clicks

  return (
    <section
      className={`p-4 md:p-5 bg-slate-800/30 border rounded-2xl transition-all ${
        isFocused
          ? 'border-white/60 ring-2 ring-white/30 scale-[1.01]'
          : 'border-slate-700/50'
      }`}
    >
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-[11px] md:text-xs font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
          Visual Style
          {isFocused && (
            <span className="text-[8px] text-cyan-400 animate-pulse ml-2">← →</span>
          )}
        </h4>
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded"
          style={{
            backgroundColor: `${theme.colors.primary}30`,
            color: theme.colors.primary,
          }}
        >
          {theme.displayName}
        </span>
      </div>

      {/* Theme Toggle Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {/* Cyberpunk Button */}
        <button
          onClick={() => !isCyberpunk && toggleTheme()}
          className={`
            relative p-4 rounded-xl border-2 transition-all duration-200
            flex flex-col items-center gap-2
            ${
              isCyberpunk
                ? 'border-cyan-500 bg-cyan-500/20 scale-[1.02]'
                : 'border-slate-600 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-700/50'
            }
            ${isFocused && !isCyberpunk ? 'ring-1 ring-white/30' : ''}
          `}
        >
          {/* Selected Indicator */}
          {isCyberpunk && (
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          )}

          <IconCyberpunk
            className="w-8 h-8 md:w-10 md:h-10"
            color={isCyberpunk ? '#06b6d4' : '#64748b'}
          />
          <span className="text-[10px] font-bold uppercase tracking-wider text-white">
            Cyberpunk
          </span>
          <span className="text-[8px] text-slate-400">Neon • Glow • Modern</span>
        </button>

        {/* 16-Bit Retro Button */}
        <button
          onClick={() => isCyberpunk && toggleTheme()}
          className={`
            relative p-4 rounded-xl border-2 transition-all duration-200
            flex flex-col items-center gap-2
            ${
              !isCyberpunk
                ? 'border-orange-500 bg-orange-500/20 scale-[1.02]'
                : 'border-slate-600 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-700/50'
            }
            ${isFocused && isCyberpunk ? 'ring-1 ring-white/30' : ''}
          `}
        >
          {/* Selected Indicator */}
          {!isCyberpunk && (
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          )}

          <IconRetro
            className="w-8 h-8 md:w-10 md:h-10"
            color={!isCyberpunk ? '#f97316' : '#64748b'}
          />
          <span className="text-[10px] font-bold uppercase tracking-wider text-white">
            16-Bit
          </span>
          <span className="text-[8px] text-slate-400">Pixel • Retro • Classic</span>
        </button>
      </div>

      {/* Theme Description */}
      <p className="text-[9px] text-slate-500 text-center mt-3">
        {isCyberpunk
          ? 'Modern aesthetic with neon colors and smooth effects'
          : 'Classic 16-bit style with pixel fonts and scanlines'}
      </p>
    </section>
  );
};
