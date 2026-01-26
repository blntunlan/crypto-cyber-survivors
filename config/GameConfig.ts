/**
 * GameConfig - Game Timing and Wave Settings
 *
 * Configuration for game flow, waves, and timing.
 */

import { type WavePhase } from '../services/difficulty/types';
export type { WavePhase };

// =============================================================================
// WAVE SYSTEM (5-minute cycle = 300 seconds)
// =============================================================================

export const WAVE_CONFIG = {
  // Ordered phases for the difficulty cycle
  PHASES: [
    { name: 'warmup', duration: 25, multiplier: 0.3 },
    { name: 'buildup', duration: 60, multiplier: 0.5 },
    { name: 'firstPeak', duration: 30, multiplier: 1.3 },
    { name: 'breather', duration: 45, multiplier: 0.6 },
    { name: 'escalation', duration: 60, multiplier: 1.15 },
    { name: 'climax', duration: 45, multiplier: 1.5 },
    { name: 'resolution', duration: 35, multiplier: 0.5 },
  ] as Array<{ name: WavePhase; duration: number; multiplier: number }>,

  // Phase order for cycling (keys only)
  PHASE_ORDER: [
    'warmup',
    'buildup',
    'firstPeak',
    'breather',
    'escalation',
    'climax',
    'resolution',
  ] as WavePhase[],

  // Total cycle duration (calculated: 300s = 5 minutes)
  TOTAL_DURATION: 300,
};

// =============================================================================
// DIFFICULTY V2 SYSTEM CONFIG
// =============================================================================

export const DIFFICULTY_CONFIG = {
  /** PnL history buffer size */
  PNL_HISTORY_SIZE: 30,

  /** Kill streak timeout (ms) */
  STREAK_TIMEOUT_MS: 3000,

  /** Shock detection threshold (underlying price %) */
  SHOCK_THRESHOLD: 0.005,

  /** Clamp limits for engine outputs */
  LIMITS: {
    total: { min: 0.5, max: 20.0 }, // Increased from 10.0
    spawnRate: { min: 0.5, max: 35.0 }, // Dramatically increased from 8.0 to allow high leverage chaos
    enemySpeed: { min: 0.5, max: 4.0 },
    enemyHP: { min: 0.5, max: 5.0 },
    enemyDamage: { min: 0.8, max: 8.0 },
  },

  /** Near Death Threshold */
  NEAR_DEATH_HP_THRESHOLD: 20, // %
  NEAR_DEATH_DIFFICULTY_MODIFIER: 0.7, // 30% easier

  /** Admin scaling */
  BASE_ADMIN_DIVISOR: 5,

  /** Output scaling */
  SPAWN_RATE_TOTAL_MULTIPLIER: 3.2,
};

/**
 * Leverage Scaling Tiers
 * Maps player leverage to difficulty multipliers and XP requirements.
 */
export const LEVERAGE_TIERS: Record<
  number,
  { spawn: number; speed: number; hp: number; damage: number; xpReq: number }
> = {
  1: { spawn: 0.8, speed: 0.8, hp: 0.8, damage: 0.8, xpReq: 1.0 },
  2: { spawn: 1.0, speed: 0.85, hp: 0.9, damage: 0.9, xpReq: 1.0 },
  5: { spawn: 1.4, speed: 1.0, hp: 1.0, damage: 1.0, xpReq: 1.0 },
  10: { spawn: 2.0, speed: 1.1, hp: 1.1, damage: 1.15, xpReq: 1.0 },
  25: { spawn: 3.0, speed: 1.25, hp: 1.2, damage: 1.4, xpReq: 1.0 },
  50: { spawn: 4.0, speed: 1.4, hp: 1.4, damage: 1.8, xpReq: 1.0 },
  100: { spawn: 6.0, speed: 2.0, hp: 1.6, damage: 3.0, xpReq: 1.0 },
};

// =============================================================================
// COMBAT TIMINGS & LOGIC
// =============================================================================

export const COMBAT_CONFIG = {
  // Projectile
  BULLET_SPEED: 10,
  BULLET_LIFETIME: 2000, // ms
  PROJECTILE_SPREAD: 0.1,
  PROJECTILE_RADIUS_BASE: 4.5,
  PROJECTILE_RADIUS_CRIT: 5.5,
  PROJECTILE_RADIUS_SUPER_CRIT: 6.5,

  // Auto-aim / Lead
  AIM_RANGE: 400, // pixels
  MIN_LEAD_DISTANCE: 100,
  MAX_LEAD_DISTANCE: 400,
  INTERCEPT_EPSILON: 0.0001,
  MAX_INTERCEPT_TIME_FRAMES: 60,

  // Damage Logic
  ARMOR_REDUCTION_PER_POINT: 0.05,
  CRIT_DAMAGE_MULTIPLIER: 2.0,
  SUPER_CRIT_MULTIPLIER: 4.0,
  SUPER_CRIT_LUCK_THRESHOLD: 3,

  // Physics Effects
  SHOCKWAVE: {
    BASE_FORCE: 15,
    STAGGER_DURATION: 0.5,
  },
  LIFESTEAL: {
    HEAL_AMOUNT_NORMAL: 3,
    HEAL_AMOUNT_WHALE: 8,
  },
  DEATH_PARTICLES: {
    NORMAL_COUNT: 10,
    SUPER_CRIT_COUNT: 30,
    VELOCITY_RANGE: 5,
  },

  // Fallbacks & Audio
  FIRE_RATE_AUDIO_THRESHOLD: 200,
  DEFAULT_ENEMY_RADIUS_FALLBACK: 20,
};

// =============================================================================
// VISUAL TIMINGS
// =============================================================================

export const VISUAL_CONFIG = {
  // Screen effects
  CRIT_FLASH_NORMAL: 0.08,
  CRIT_FLASH_SUPER: 0.15,
  CRIT_FLASH_DECAY: 0.85,

  // Particles
  PARTICLE_LIFETIME: 1.0,
  PARTICLE_DECAY: 0.02,

  // Floating text
  FLOATING_TEXT_DURATION: 1.0,

  // Screen shake
  MAX_SHAKE: 10,
  SHAKE_DECAY: 0.9,
};

// =============================================================================
// ECONOMY & PROGRESSION
// =============================================================================

export const ECONOMY_CONFIG = {
  // Experience Gems
  GEMS: {
    BASE_VALUE_NORMAL: 15,
    BASE_VALUE_WHALE: 100,
    RARE_MULTIPLIER: 3,
    RARE_SIZE: 10,
    NORMAL_SIZE: 7,
    BONUS_SIZE: 5,
    BONUS_OFFSET: 20,
    LIFETIME_MS: 5000,
  },

  // Luck System
  LUCK: {
    BASE_RARE_CHANCE: 0.05,
    RARE_CHANCE_PER_LUCK: 0.03,
    MAX_RARE_CHANCE: 0.5,
    BONUS_GEM_CHANCE_PER_LUCK: 0.1,
    MAX_BONUS_GEM_CHANCE: 0.5,
    VALUE_BONUS_PER_LUCK: 0.01,
    BONUS_VALUE_MULTIPLIER: 0.5,
  },
};

// =============================================================================
// ADMIN & DEBUG TOOLS
// =============================================================================

export const CHEAT_CONFIG = {
  TIMEOUT_MS: 2000,
  EXP_BOOST: 500,
  CYCLE_TIME: 300,
  NOTIFICATION_DURATION_MS: 2000,
  BUFFER_CLEAR_DELAY_MS: 2000,
};

// =============================================================================
// UI/X CONFIG
// =============================================================================

export const UI_CONFIG = {
  MAX_CHART_POINTS: 60,
  LEVEL_UP_CHOICES: 3,
};
