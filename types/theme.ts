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
  /** Pixel-style text (optional) */
  pixel?: string;
  /** Headings, section titles (optional) */
  title?: string;
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

/**
 * Theme Size Configuration
 *
 * Defines Tailwind classes for theme-aware sizing.
 * Pixel fonts (16-bit) require smaller sizes due to their larger visual appearance.
 */
export interface ThemeSizeConfig {
  // Text sizes
  /** GAME OVER, PAUSED, LEVEL UP */
  title: string;
  /** Section headings */
  heading: string;
  /** Sub-section headings */
  subheading: string;
  /** Normal body text */
  body: string;
  /** Small labels */
  small: string;
  /** Tiny labels, hints */
  tiny: string;

  // Number sizes
  /** Price display */
  price: string;
  /** HP, DPS, stat values */
  stat: string;
  /** Combo multiplier x10, x50 */
  combo: string;
  /** Damage popup numbers */
  damage: string;
  /** Timer display MM:SS */
  timer: string;

  // Button sizes (includes padding + text)
  /** Primary CTA buttons */
  buttonLg: string;
  /** Standard buttons */
  buttonMd: string;
  /** Small/secondary buttons */
  buttonSm: string;

  // Spacing
  /** Standard gap between items */
  gap: string;
  /** Panel/container padding */
  padding: string;
  /** Card internal padding */
  cardPadding: string;
}
