/**
 * useThemeSize Hook
 *
 * Provides theme-aware sizing classes for UI elements.
 * Returns different Tailwind classes based on active theme.
 *
 * Usage:
 *   const sizes = useThemeSize();
 *   <h1 className={sizes.title}>PAUSED</h1>
 */

import { useMemo } from 'react';
import { useTheme } from '../contexts/useTheme';
import { type ThemeSizeConfig } from '../types/theme';

/**
 * Cyberpunk theme sizes
 * Modern, spacious layout with standard font sizing
 */
const CYBERPUNK_SIZES: ThemeSizeConfig = {
  // Text sizes
  title: 'text-5xl sm:text-6xl',
  heading: 'text-2xl sm:text-3xl',
  subheading: 'text-lg sm:text-xl',
  body: 'text-sm',
  small: 'text-xs',
  tiny: 'text-[10px]',

  // Number sizes
  price: 'text-4xl sm:text-5xl',
  stat: 'text-base sm:text-lg',
  combo: 'text-3xl sm:text-4xl',
  damage: 'text-xl sm:text-2xl',
  timer: 'text-3xl sm:text-4xl',

  // Button sizes
  buttonLg: 'py-4 px-6 text-sm',
  buttonMd: 'py-3 px-4 text-xs',
  buttonSm: 'py-2 px-3 text-[10px]',

  // Spacing
  gap: 'gap-4',
  padding: 'p-4 md:p-6',
  cardPadding: 'p-4',
};

/**
 * 16-Bit Retro theme sizes
 * Compact layout - pixel fonts appear larger so we use smaller values
 * Scale factor: ~0.5-0.6x compared to Cyberpunk
 */
const RETRO_SIZES: ThemeSizeConfig = {
  // Text sizes (Press Start 2P is visually larger)
  title: 'text-xl sm:text-2xl',
  heading: 'text-base sm:text-lg',
  subheading: 'text-sm',
  body: 'text-[10px] sm:text-xs',
  small: 'text-[8px] sm:text-[9px]',
  tiny: 'text-[7px] sm:text-[8px]',

  // Number sizes
  price: 'text-lg sm:text-xl',
  stat: 'text-xs sm:text-sm',
  combo: 'text-lg sm:text-xl',
  damage: 'text-base sm:text-lg',
  timer: 'text-lg sm:text-xl',

  // Button sizes (keep touch targets reasonable)
  buttonLg: 'py-3 px-4 text-[9px] sm:text-[10px]',
  buttonMd: 'py-2.5 px-3 text-[8px] sm:text-[9px]',
  buttonSm: 'py-2 px-2.5 text-[7px] sm:text-[8px]',

  // Spacing (tighter for retro feel)
  gap: 'gap-2 sm:gap-3',
  padding: 'p-3 md:p-4',
  cardPadding: 'p-2 sm:p-3',
};

/**
 * Hook to get theme-appropriate size classes
 */
export function useThemeSize(): ThemeSizeConfig {
  const { isRetro } = useTheme();

  return useMemo(() => {
    return isRetro ? RETRO_SIZES : CYBERPUNK_SIZES;
  }, [isRetro]);
}

/**
 * Convenience function to merge size class with additional classes
 */
export function useSizeClass(sizeKey: keyof ThemeSizeConfig, additionalClasses?: string): string {
  const sizes = useThemeSize();
  const sizeClass = sizes[sizeKey];

  if (additionalClasses) {
    return `${sizeClass} ${additionalClasses}`;
  }
  return sizeClass;
}
