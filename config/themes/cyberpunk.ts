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

  semanticTokens: {
    'surface.canvas': '#020617',
    'surface.default': 'rgba(15, 23, 42, 0.82)',
    'surface.raised': 'rgba(15, 23, 42, 0.96)',
    'surface.inset': 'rgba(2, 6, 23, 0.7)',
    'text.primary': '#f8fafc',
    'text.muted': '#94a3b8',
    'action.primary.surface': '#d6b85c',
    'action.primary.surface-hover': '#ffd600',
    'action.primary.text': '#020617',
    'action.primary.border': 'rgba(214, 184, 92, 0.6)',
    'focus.ring': '#ffd600',
    'status.success': '#34d399',
    'status.warning': '#fbbf24',
    'status.danger': '#f87171',
    'motion.duration-fast': '150ms',
    'motion.duration-normal': '240ms',
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
