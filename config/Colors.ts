/**
 * Colors - Global Color Constants
 *
 * This file contains all color definitions used throughout the game.
 * Separated to prevent circular dependencies in the config layer.
 *
 * @note This file should have NO imports to maintain independence.
 */

// =============================================================================
// COLORS (Slot Machine / Casino Palette)
// =============================================================================

export const COLORS = {
  // Market & Core Actions
  LONG: '#22c55e', // green-500
  SHORT: '#ef4444', // red-500
  BG: '#020617', // slate-950 (Dark night)
  TEXT: '#f8fafc', // slate-50

  // Standard Colors
  GEM: '#FFD700', // Gold
  RARE_GEM: '#FF10F0', // Neon pink
  BULLET: '#00FFFF', // Electric blue neon
  WHALE: '#B026FF', // Neon purple
  CRIT: '#FFD700', // Rich gold
  SUPER_CRIT: '#D20202', // Casino hot red

  // Casino Slot Machine / Arcade Palette
  CASINO_GOLD: '#D6B85C',
  CASINO_RED: '#B22222',
  CASINO_GREEN: '#05732c', // Roulette table green
  NEON_ORANGE: '#FF6600',
  NEON_GREEN: '#39FF14',
  ROYAL_PURPLE: '#7558A4',
  BRILLIANT_ROSE: '#F4599D',
  ELECTRIC_BLUE: '#00BFFF',
  SLOT_BLACK: '#1A1A1A',
  SLOT_SILVER: '#DCDCDC',
  PUMP_GREEN: '#00E676',
  DUMP_ORANGE: '#FF3D00',
  JACKPOT_YELLOW: '#FFD600',

  // New Enemy Colors
  RUGPULL_CRIMSON: '#DC143C', // Deep crimson (deceptive danger)
  MEV_CYAN: '#00FFFF', // Bright cyan (algorithmic precision)
  FLASH_LOAN_YELLOW: '#FFEA00', // Electric yellow (burst energy)
  SANDWICH_PINK: '#FF1493', // Hot deep pink (pincer squeeze)
  ATTACK_51_RED: '#8B0000', // Dark blood red (network dominance)

  // Theme Specific - Cyberpunk
  PRIMARY_CYBER: '#c800ff',
  SECONDARY_CYBER: '#00ccff',
  ACCENT_CYBER: '#ffff00',
  BG_CYBER: '#050505',

  // Theme Specific - Retro 16-bit (Casino Arcade Neon)
  BG_RETRO: '#0a0a12', // Deep arcade black
  PRIMARY_RETRO: '#00BFFF', // Electric blue
  SECONDARY_RETRO: '#FFD600', // Jackpot yellow
  ACCENT_RETRO: '#39FF14', // Neon green
  SURFACE_RETRO: '#39FF14', // Neon green borders
  DANGER_RETRO: '#B22222', // Casino red
  WARNING_RETRO: '#FF6600', // Neon orange
} as const;

// Type export for color keys
export type ColorKey = keyof typeof COLORS;
