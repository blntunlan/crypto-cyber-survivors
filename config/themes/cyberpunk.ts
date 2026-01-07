/**
 * Cyberpunk Theme Configuration
 *
 * Modern, neon-lit aesthetic with:
 * - Cyan/Magenta color scheme
 * - Glassmorphism effects
 * - Glow and shadows
 * - Smooth animations
 */

import { type ThemeConfig } from '../../types/theme';

export const cyberpunkTheme: ThemeConfig = {
  name: 'cyberpunk',
  displayName: 'Cyberpunk',

  colors: {
    primary: '#00ffff', // Cyan
    secondary: '#ff00ff', // Magenta
    accent: '#ffff00', // Yellow
    background: '#0a0a0f', // Deep dark
    surface: 'rgba(20, 20, 40, 0.85)',
    text: '#ffffff',
    textMuted: '#8888aa',
    success: '#00ff88',
    danger: '#ff4444',
    warning: '#ffaa00',
    // Game-specific
    health: '#ff4444',
    xp: '#00ffff',
    combo: '#ffff00',
  },

  fonts: {
    display: '"Orbitron", sans-serif',
    primary: '"Oxanium", sans-serif',
    secondary: '"Exo 2", sans-serif',
    mono: '"Share Tech Mono", monospace',
    numbers: '"Orbitron", sans-serif',
  },

  effects: {
    blur: true,
    glow: true,
    shadows: true,
    scanlines: false,
    crtCurvature: false,
    pixelated: false,
    smoothTransitions: true,
  },

  audio: {
    preset: 'modern',
  },
};
