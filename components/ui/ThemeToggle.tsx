/**
 * ThemeToggle - Theme switching button
 *
 * Allows users to switch between Cyberpunk and 16-bit Retro themes.
 */

import React from 'react';
import { useTheme } from '../../contexts/useTheme';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({
  className = '',
  showLabel = true,
}: ThemeToggleProps): React.JSX.Element {
  const { themeName, toggleTheme, theme } = useTheme();

  const isCyberpunk = themeName === 'cyberpunk';

  return (
    <button
      onClick={toggleTheme}
      className={`
        flex items-center gap-2 rounded-lg border-2
        px-4 py-2
        transition-all duration-200
        hover:scale-105 active:scale-95
        ${className}
      `}
      style={{
        borderColor: theme.colors.primary,
        backgroundColor: `${theme.colors.primary}20`,
        color: theme.colors.text,
      }}
      aria-label={`Switch to ${isCyberpunk ? '16-bit Retro' : 'Cyberpunk'} theme`}
    >
      {/* Theme Icon */}
      <span className="text-xl" role="img" aria-hidden="true">
        {isCyberpunk ? '🎮' : '🌃'}
      </span>

      {/* Theme Label */}
      {showLabel && (
        <span className="font-medium">
          {isCyberpunk ? '16-Bit Mode' : 'Cyber Mode'}
        </span>
      )}
    </button>
  );
}

/**
 * Compact theme toggle for mobile/smaller spaces
 */
export function ThemeToggleCompact(): React.JSX.Element {
  const { themeName, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex h-10 w-10 items-center justify-center rounded-lg border-2
                 border-cyan-500/50 bg-cyan-500/10 text-xl
                 transition-all hover:bg-cyan-500/20 active:scale-95"
      aria-label={`Switch to ${themeName === 'cyberpunk' ? '16-bit Retro' : 'Cyberpunk'} theme`}
    >
      {themeName === 'cyberpunk' ? '🎮' : '🌃'}
    </button>
  );
}
