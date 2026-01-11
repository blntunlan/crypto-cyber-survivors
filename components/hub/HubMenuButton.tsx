/**
 * HubMenuButton - A single hub menu tile
 *
 * Supports both Cyberpunk and Retro 16-bit themes
 * with responsive sizing for mobile/desktop.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/useTheme';
import { COLORS } from '../../config/Colors';

export type HubButtonId = 'play' | 'stash' | 'loot' | 'skins' | 'ranks' | 'gear';

interface HubMenuButtonProps {
  id: HubButtonId;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: number;
  badgeColor?: string;
  accentColor: string;
  isSelected?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const HubMenuButton: React.FC<HubMenuButtonProps> = ({
  icon,
  title,
  subtitle,
  badge,
  badgeColor = COLORS.JACKPOT_YELLOW,
  accentColor,
  isSelected = false,
  onClick,
  disabled = false,
}) => {
  const { isRetro } = useTheme();

  // Cyberpunk styles
  const cyberStyles = {
    base: `
      relative overflow-hidden
      bg-white/5 backdrop-blur-xl
      border border-white/10
      rounded-2xl
      transition-all duration-300
      hover:bg-white/10 hover:border-white/20
      hover:shadow-[0_0_30px_-5px_${accentColor}40]
      active:scale-[0.98]
    `,
    selected: `
      bg-white/10
      border-[${accentColor}]
      shadow-[0_0_40px_-5px_${accentColor}60]
      scale-[1.02]
    `,
    disabled: 'opacity-50 cursor-not-allowed grayscale',
  };

  // Retro 16-bit styles
  const retroStyles = {
    base: `
      relative
      bg-zinc-900
      border-2 border-zinc-700
      rounded-none
      transition-all duration-150
      hover:border-zinc-500
      active:translate-x-[2px] active:translate-y-[2px]
      shadow-[4px_4px_0px_rgba(0,0,0,0.5)]
      active:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]
    `,
    selected: `
      border-[${COLORS.JACKPOT_YELLOW}]
      bg-zinc-800
      shadow-[4px_4px_0px_rgba(0,0,0,0.8)]
    `,
    disabled: 'opacity-50 cursor-not-allowed',
  };

  const styles = isRetro ? retroStyles : cyberStyles;

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!isRetro ? { scale: 1.02 } : undefined}
      whileTap={!isRetro ? { scale: 0.98 } : undefined}
      className={`
        flex flex-col items-center justify-center
        p-4 sm:p-6 lg:p-8
        min-h-[100px] sm:min-h-[140px]
        w-full
        touch-manipulation
        ${styles.base}
        ${isSelected ? styles.selected : ''}
        ${disabled ? styles.disabled : ''}
      `}
      style={{
        borderColor: isSelected ? accentColor : undefined,
        boxShadow:
          isSelected && !isRetro
            ? `0 0 40px -5px ${accentColor}60, inset 0 0 20px ${accentColor}10`
            : undefined,
      }}
    >
      {/* Cyberpunk: Gradient overlay on hover */}
      {!isRetro && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background: `linear-gradient(135deg, ${accentColor}10 0%, transparent 50%)`,
          }}
        />
      )}

      {/* Badge (for lootbox count etc.) */}
      {badge !== undefined && badge > 0 && (
        <div
          className={`
            absolute top-2 right-2
            px-2 py-0.5
            text-[10px] sm:text-xs font-black
            ${
              isRetro
                ? 'border-2 border-zinc-900 font-retro-pixel text-[8px]'
                : 'rounded-full font-cyber'
            }
          `}
          style={{
            backgroundColor: badgeColor,
            color: isRetro ? '#000' : '#000',
            boxShadow: isRetro
              ? '2px 2px 0px rgba(0,0,0,0.5)'
              : `0 0 15px ${badgeColor}60`,
          }}
        >
          {badge}
        </div>
      )}

      {/* Icon */}
      <div
        className={`
          text-3xl sm:text-4xl lg:text-5xl
          mb-2 sm:mb-3
          ${isRetro ? '' : 'filter drop-shadow-lg'}
        `}
        style={{
          textShadow: !isRetro ? `0 0 20px ${accentColor}60` : undefined,
        }}
      >
        {icon}
      </div>

      {/* Title */}
      <div
        className={`
          text-xs sm:text-sm lg:text-base
          font-black uppercase tracking-wider
          ${isRetro ? 'font-retro-pixel text-[8px] sm:text-[10px]' : 'font-cyber'}
        `}
        style={{
          color: isSelected ? accentColor : isRetro ? COLORS.JACKPOT_YELLOW : '#fff',
        }}
      >
        {title}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div
          className={`
            text-[10px] sm:text-xs
            mt-1
            ${isRetro ? 'font-retro-pixel text-[7px]' : 'font-cyber'}
            text-slate-400
          `}
        >
          {subtitle}
        </div>
      )}

      {/* Cyberpunk: Bottom accent line when selected */}
      {!isRetro && isSelected && (
        <motion.div
          layoutId="hub-selected-bar"
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ backgroundColor: accentColor }}
        />
      )}

      {/* Retro: Selection indicator */}
      {isRetro && isSelected && (
        <div
          className="absolute left-2 top-1/2 -translate-y-1/2 text-lg font-retro-pixel"
          style={{ color: COLORS.JACKPOT_YELLOW }}
        >
          ▶
        </div>
      )}
    </motion.button>
  );
};
