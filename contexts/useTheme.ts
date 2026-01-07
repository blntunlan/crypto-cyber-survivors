/**
 * Theme Hooks
 *
 * Custom hooks for accessing theme context.
 * Separated from ThemeContext.tsx for React Fast Refresh compatibility.
 */

import { useContext } from 'react';
import { ThemeContext, type ThemeContextType } from './themeContextDef';

/**
 * Hook to access theme context
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Hook for components that only need to know if retro mode is active
 */
export function useIsRetro(): boolean {
  const { isRetro } = useTheme();
  return isRetro;
}
