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
import { cn } from '../../utils/classnames';

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
      cyber-glass rounded-2xl
      transition-all duration-300 ease-out
      hover:bg-white/10 hover:border-white/30
      hover:shadow-[var(--hub-shadow-hover)]
      active:scale-[0.98]
      lg:hover:scale-[1.03] lg:hover:bg-white/15
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
      focus-visible:ring-[var(--hub-accent)]
    `,
    selected: `
      !bg-white/[0.08]
      border-[var(--hub-accent)]/60
      shadow-[var(--hub-shadow-selected)]
      scale-[1.02]
    `,
    disabled:
      'opacity-50 cursor-not-allowed grayscale hover:scale-100 lg:hover:scale-100',
  };

  // Retro 16-bit styles - matching MainMenu's neon green aesthetic
  const retroStyles = {
    base: `
      relative
      bg-zinc-950/90
      border-2 border-[#39FF14]/30
      rounded-none
      transition-all duration-100
      hover:border-[#39FF14]/60 hover:bg-[#39FF14]/10
      active:translate-x-[2px] active:translate-y-[2px]
      shadow-[4px_4px_0px_rgba(57,255,20,0.15)]
      active:shadow-[2px_2px_0px_rgba(57,255,20,0.15)]
    `,
    selected: `
      !bg-[#39FF14]/10
      !border-[#39FF14]
      shadow-[4px_4px_0px_rgba(57,255,20,0.4)]
    `,
    disabled: 'opacity-60 cursor-not-allowed saturate-50',
  };

  const styles = isRetro ? retroStyles : cyberStyles;

  // Define dynamic CSS variables
  const dynamicVars = {
    '--hub-accent': accentColor,
    '--hub-shadow-hover': `0 0 30px -5px ${accentColor}50, 0 4px 20px -4px rgba(0,0,0,0.3)`,
    '--hub-shadow-selected': `0 0 40px -5px ${accentColor}70, 0 0 60px -10px ${accentColor}40`,
  } as React.CSSProperties;

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!isRetro ? { scale: 1.02 } : undefined}
      whileTap={!isRetro ? { scale: 0.98 } : undefined}
      className={cn(
        'flex min-h-[110px] w-full touch-manipulation flex-col items-center justify-center p-4 sm:min-h-[140px] sm:p-6 lg:p-8',
        styles.base,
        isSelected && styles.selected,
        disabled && styles.disabled
      )}
      style={{
        ...dynamicVars,
        borderColor: isSelected
          ? isRetro
            ? COLORS.JACKPOT_YELLOW
            : accentColor
          : undefined,
        boxShadow:
          isSelected && !isRetro
            ? `0 0 40px -5px ${accentColor}60, inset 0 0 20px ${accentColor}10`
            : isSelected && isRetro
              ? '4px 4px 0px rgba(0,0,0,0.8)'
              : undefined,
      }}
    >
      {/* Cyberpunk: Gradient overlay on hover */}
      {!isRetro && (
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
          style={{
            background: `linear-gradient(135deg, ${accentColor}15 0%, transparent 60%), radial-gradient(ellipse at bottom, ${accentColor}08 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Badge (for lootbox count etc.) */}
      {badge !== undefined && badge > 0 && (
        <div
          className={`
            absolute right-2 top-2
            px-2 py-0.5
            text-[10px] font-black sm:text-xs
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
          mb-2 text-3xl sm:mb-3
          sm:text-4xl lg:text-5xl
          ${isRetro ? '' : 'drop-shadow-lg filter'}
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
          text-xs font-black uppercase
          tracking-wider sm:text-sm lg:text-base
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
            mt-1 text-[10px]
            sm:text-xs
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
          className="absolute bottom-0 left-0 right-0 h-1 lg:h-1.5"
          style={{
            backgroundColor: accentColor,
            boxShadow: `0 0 12px 2px ${accentColor}80`,
          }}
        />
      )}

      {/* Retro: Selection indicator */}
      {isRetro && isSelected && (
        <div
          className="absolute left-2 top-1/2 -translate-y-1/2 font-retro-pixel text-lg"
          style={{ color: COLORS.JACKPOT_YELLOW }}
        >
          ▶
        </div>
      )}
    </motion.button>
  );
};
