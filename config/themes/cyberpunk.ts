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
    primary: '#d6b85c', // Casino Gold
    secondary: '#b22222', // Casino Red
    accent: '#00ffff', // Cyan accent
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
    combo: '#d6b85c',
  },

  fonts: {
    display: '"Orbitron", system-ui, sans-serif',
    primary: '"Chakra Petch", sans-serif',
    secondary: '"Michroma", sans-serif',
    mono: '"Quantico", monospace',
    numbers: '"Quantico", sans-serif',
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
