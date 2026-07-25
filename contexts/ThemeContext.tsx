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

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { type ThemeName, type ThemeConfig } from '../types/theme';
import { cyberpunkTheme, retro16bitTheme } from '../config/themes';
import {
  SEMANTIC_TOKEN_NAMES,
  toSemanticCssVariable,
} from '../config/ui/semanticTokens';
import { ThemeContext, type ThemeContextType } from './themeContextDef';
import { ThemeService } from '../services/system/ThemeService';

const STORAGE_KEY = 'crypto-survivor-theme';

const themes: Record<ThemeName, ThemeConfig> = {
  cyberpunk: cyberpunkTheme,
  'retro-16bit': retro16bitTheme,
};

function readStoredThemeName(): ThemeName {
  try {
    const storedThemeName = localStorage.getItem(STORAGE_KEY);
    if (storedThemeName === 'cyberpunk' || storedThemeName === 'retro-16bit') {
      return storedThemeName;
    }
  } catch {
    // Ignore persistence failures and use the safe default.
  }

  return 'cyberpunk';
}

/**
 * Apply theme configuration to DOM
 */
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function applyThemeToDOM(theme: ThemeConfig, reducedMotion: boolean): void {
  const root = document.documentElement;

  // Apply colors as CSS variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });

  for (const token of SEMANTIC_TOKEN_NAMES) {
    const value =
      reducedMotion && token.startsWith('motion.duration')
        ? '0ms'
        : theme.semanticTokens[token];
    root.style.setProperty(toSemanticCssVariable(token), value);
  }

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
  const [themeName, setThemeName] = useState<ThemeName>(readStoredThemeName);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);

  const theme = themes[themeName];
  const isRetro = themeName === 'retro-16bit';

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const eventTarget = mediaQuery as Partial<
      Pick<MediaQueryList, 'addEventListener' | 'removeEventListener'>
    >;
    const addChangeListener = eventTarget.addEventListener;
    const removeChangeListener = eventTarget.removeEventListener;
    if (!addChangeListener || !removeChangeListener) return undefined;

    const syncPreference = (): void => setReducedMotion(mediaQuery.matches);
    addChangeListener.call(mediaQuery, 'change', syncPreference);
    return () => removeChangeListener.call(mediaQuery, 'change', syncPreference);
  }, []);

  // Apply theme to DOM and sync with ThemeService whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, themeName);
    } catch {
      // Ignore persistence failures (private mode, storage disabled, etc.).
    }

    // Trigger transition effect
    const root = document.documentElement;
    root.setAttribute('data-theme-switching', 'true');
    setIsTransitioning(true);

    applyThemeToDOM(theme, reducedMotion);
    ThemeService.setTheme(themeName); // Sync for non-React code (renderers)

    const timer = setTimeout(() => {
      root.removeAttribute('data-theme-switching');
      setIsTransitioning(false);
    }, 400); // Match glitch animation duration

    return () => clearTimeout(timer);
  }, [reducedMotion, themeName, theme]);

  const setTheme = useCallback((name: ThemeName) => {
    setThemeName(name);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeName(previousTheme =>
      previousTheme === 'cyberpunk' ? 'retro-16bit' : 'cyberpunk'
    );
  }, []);

  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      themeName,
      setTheme,
      toggleTheme,
      isRetro,
      isTransitioning,
    }),
    [theme, themeName, setTheme, toggleTheme, isRetro, isTransitioning]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
