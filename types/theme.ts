/**
 * Theme System Type Definitions
 *
 * Supports dual themes:
 * - Cyberpunk: Modern, neon, glassmorphism
 * - Retro 16-bit: Pixel fonts, scanlines, chiptune
 */

export type ThemeName = 'cyberpunk' | 'retro-16bit';

export interface ThemeConfig {
  name: ThemeName;
  displayName: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  effects: ThemeEffects;
  audio: ThemeAudio;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  success: string;
  danger: string;
  warning: string;
  // Game-specific
  health: string;
  xp: string;
  combo: string;
}

export interface ThemeFonts {
  /** Large titles, "GAME OVER", "LEVEL UP" */
  display: string;
  /** UI elements, buttons, menus */
  primary: string;
  /** Body text, card descriptions */
  secondary: string;
  /** Numbers, stats, prices */
  mono: string;
  /** Damage numbers, combo counter */
  numbers: string;
}

export interface ThemeEffects {
  blur: boolean;
  glow: boolean;
  shadows: boolean;
  scanlines: boolean;
  crtCurvature: boolean;
  pixelated: boolean;
  smoothTransitions: boolean;
}

export interface ThemeAudio {
  preset: 'modern' | 'chiptune';
}
