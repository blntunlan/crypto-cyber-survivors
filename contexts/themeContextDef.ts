/**
 * Theme Context Definition
 *
 * Separated for React Fast Refresh compatibility.
 */

import { createContext } from 'react';
import { type ThemeName, type ThemeConfig } from '../types/theme';

export interface ThemeContextType {
  theme: ThemeConfig;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
  toggleTheme: () => void;
  isRetro: boolean;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
