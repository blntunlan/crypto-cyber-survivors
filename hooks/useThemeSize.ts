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
 * Scaled to match Cyberpunk theme for consistency.
 */
const RETRO_SIZES: ThemeSizeConfig = {
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
