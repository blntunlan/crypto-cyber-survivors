/**
 * ThemeService - Provides theme information to non-React code (renderers, services)
 *
 * This service acts as a bridge between React's ThemeContext and vanilla JS/TS code
 * that cannot use hooks.
 */

import { type ThemeName, type ThemeConfig } from '../types/theme';
import { cyberpunkTheme, retro16bitTheme } from '../config/themes';

/** Theme lookup table for quick config access */
const THEMES: Record<ThemeName, ThemeConfig> = {
  cyberpunk: cyberpunkTheme,
  'retro-16bit': retro16bitTheme,
};

class ThemeServiceClass {
  private currentTheme: ThemeName = 'cyberpunk';
  private listeners: Set<(theme: ThemeName) => void> = new Set();

  /**
   * Get current theme name
   */
  getTheme(): ThemeName {
    return this.currentTheme;
  }

  /**
   * Check if current theme is retro 16-bit
   */
  isRetro(): boolean {
    return this.currentTheme === 'retro-16bit';
  }

  /**
   * Check if current theme is cyberpunk
   */
  isCyberpunk(): boolean {
    return this.currentTheme === 'cyberpunk';
  }

  /**
   * Get full theme configuration (colors, fonts, effects)
   */
  getConfig(): ThemeConfig {
    return THEMES[this.currentTheme];
  }

  /**
   * Set theme (called by ThemeContext when theme changes)
   */
  setTheme(theme: ThemeName): void {
    if (this.currentTheme !== theme) {
      this.currentTheme = theme;
      this.notifyListeners();
    }
  }

  /**
   * Subscribe to theme changes
   */
  onChange(callback: (theme: ThemeName) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentTheme));
  }
}

export const ThemeService = new ThemeServiceClass();
