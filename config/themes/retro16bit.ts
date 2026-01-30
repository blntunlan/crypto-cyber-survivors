/**
 * 16-Bit Retro Theme Configuration
 *
 * Classic gaming aesthetic with:
 * - Casino/Arcade neon color palette
 * - Pixel fonts (Press Start 2P, VT323)
 * - Scanlines and CRT effects
 * - Chiptune audio
 *
 * Color palette inspired by:
 * - Classic arcade cabinets
 * - Casino slot machines
 * - Neon arcade aesthetics
 */

import { type ThemeConfig } from '../../types/theme';

export const retro16bitTheme: ThemeConfig = {
  name: 'retro-16bit',
  displayName: '16-Bit',

  colors: {
    // Casino Arcade Neon Palette
    primary: '#00BFFF', // Electric blue - main accent
    secondary: '#FFD600', // Jackpot yellow - highlights
    accent: '#39FF14', // Neon green - success/positive
    background: '#0a0a12', // Deep black - arcade cabinet dark
    surface: '#39FF14', // Neon green borders
    text: '#DCDCDC', // Slot silver - main text
    textMuted: '#7558A4', // Royal purple - secondary text
    success: '#39FF14', // Neon green
    danger: '#B22222', // Casino red
    warning: '#FF6600', // Neon orange
    // Game-specific
    health: '#B22222', // Casino red
    xp: '#00BFFF', // Electric blue
    combo: '#FFD600', // Jackpot yellow
  },

  fonts: {
    display: '"Bruno Ace", sans-serif',
    primary: '"Chakra Petch", system-ui, sans-serif',
    secondary: '"VT323", monospace',
    mono: '"IBM Plex Mono", monospace',
    numbers: '"Space Mono", monospace',
    // Additional retro fonts
    pixel: '"Pixelify Sans", cursive',
    title: '"VT323", monospace',
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
