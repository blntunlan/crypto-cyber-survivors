/**
 * Theme Context Provider
 *
 * Provides theme switching functionality throughout the app.
 * - Persists theme preference to localStorage
 * - Applies CSS variables to document root
 * - Toggles effect classes (scanlines, pixelated, etc.)
 *
 * Usage:
 *   import { ThemeProvider } from './contexts/ThemeContext';
 *   import { useTheme } from './contexts/useTheme';
 */

import React, { useState, useEffect, useCallback, type ReactNode } from 'react';
import { type ThemeName, type ThemeConfig } from '../types/theme';
import { cyberpunkTheme, retro16bitTheme } from '../config/themes';
import { ThemeContext, type ThemeContextType } from './themeContextDef';
import { ThemeService } from '../services/system/ThemeService';

const STORAGE_KEY = 'crypto-survivor-theme';

const themes: Record<ThemeName, ThemeConfig> = {
  cyberpunk: cyberpunkTheme,
  'retro-16bit': retro16bitTheme,
};

/**
 * Apply theme configuration to DOM
 */
function applyThemeToDOM(theme: ThemeConfig): void {
  const root = document.documentElement;

  // Apply colors as CSS variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });

  // Apply fonts
  root.style.setProperty('--font-display', theme.fonts.display);
  root.style.setProperty('--font-primary', theme.fonts.primary);
  root.style.setProperty('--font-secondary', theme.fonts.secondary);
  root.style.setProperty('--font-mono', theme.fonts.mono);
  root.style.setProperty('--font-numbers', theme.fonts.numbers);

  // Apply effect classes
  root.classList.toggle('theme-blur', theme.effects.blur);
  root.classList.toggle('theme-glow', theme.effects.glow);
  root.classList.toggle('theme-shadows', theme.effects.shadows);
  root.classList.toggle('theme-scanlines', theme.effects.scanlines);
  root.classList.toggle('theme-pixelated', theme.effects.pixelated);
  root.classList.toggle('theme-smooth', theme.effects.smoothTransitions);

  // Set theme name as data attribute for CSS selectors
  root.setAttribute('data-theme', theme.name);
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): React.JSX.Element {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    if (typeof window === 'undefined') return 'cyberpunk';
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'cyberpunk' || saved === 'retro-16bit') {
      return saved;
    }
    return 'cyberpunk';
  });

  const theme = themes[themeName];
  const isRetro = themeName === 'retro-16bit';

  // Apply theme to DOM and sync with ThemeService whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, themeName);

    // Trigger transition effect
    const root = document.documentElement;
    root.setAttribute('data-theme-switching', 'true');
    setIsTransitioning(true);

    applyThemeToDOM(theme);
    ThemeService.setTheme(themeName); // Sync for non-React code (renderers)

    const timer = setTimeout(() => {
      root.removeAttribute('data-theme-switching');
      setIsTransitioning(false);
    }, 400); // Match glitch animation duration

    return () => clearTimeout(timer);
  }, [themeName, theme]);

  const setTheme = useCallback((name: ThemeName) => {
    setThemeName(name);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeName(prev => (prev === 'cyberpunk' ? 'retro-16bit' : 'cyberpunk'));
  }, []);

  const value: ThemeContextType = {
    theme,
    themeName,
    setTheme,
    toggleTheme,
    isRetro,
    isTransitioning,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
