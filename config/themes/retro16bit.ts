/**
 * 16-Bit Retro Theme Configuration
 *
 * Classic gaming aesthetic with:
 * - SNES/Genesis era color palette
 * - Pixel fonts (Press Start 2P)
 * - Scanlines and CRT effects
 * - Chiptune audio
 */

import { type ThemeConfig } from '../../types/theme';

export const retro16bitTheme: ThemeConfig = {
  name: 'retro-16bit',
  displayName: '16-Bit',

  colors: {
    primary: '#5dade2', // SNES blue
    secondary: '#f39c12', // Orange/gold
    accent: '#2ecc71', // Green
    background: '#1a1a2e', // Dark purple
    surface: '#16213e', // Navy blue
    text: '#eaecee',
    textMuted: '#aab7b8',
    success: '#2ecc71',
    danger: '#e74c3c',
    warning: '#f1c40f',
    // Game-specific
    health: '#e74c3c',
    xp: '#3498db',
    combo: '#f1c40f',
  },

  fonts: {
    display: '"Press Start 2P", monospace',
    primary: '"VT323", monospace',
    secondary: '"DotGothic16", sans-serif',
    mono: '"VT323", monospace',
    numbers: '"Press Start 2P", monospace',
  },

  effects: {
    blur: false,
    glow: false,
    shadows: false,
    scanlines: true,
    crtCurvature: false,
    pixelated: true,
    smoothTransitions: false,
  },

  audio: {
    preset: 'chiptune',
  },
};
