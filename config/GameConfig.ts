/**
 * GameConfig - Game Timing and Wave Settings
 *
 * Configuration for game flow, waves, and timing.
 */

import { type WavePhase } from '../types/metrics';

// =============================================================================
// WAVE SYSTEM (5-minute cycle = 300 seconds)
// =============================================================================

// Re-export WavePhase for backwards compatibility
export type { WavePhase } from '../types/metrics';

export const WAVE_CONFIG = {
  // Duration of each phase in seconds (total: 300s = 5 minutes)
  DURATIONS: {
    warmup: 25, // 0:00-0:25 - Quick start
    buildup: 60, // 0:45-1:45 - Gradual increase
    firstPeak: 30, // 1:45-2:15 - First spike
    breather: 45, // 2:15-3:00 - Relief
    escalation: 60, // 3:00-4:00 - Building
    climax: 45, // 4:00-4:45 - Maximum
    resolution: 15, // 4:45-5:00 - Decision
  } as Record<WavePhase, number>,

  // Difficulty multipliers for each phase (yo-yo pattern)
  MULTIPLIERS: {
    warmup: 0.75, // Engaging start
    buildup: 0.8, // Ramping up
    firstPeak: 1.3, // First adrenaline hit
    breather: 0.6, // Relief - collect power
    escalation: 1.1, // Building tension
    climax: 1.5, // Maximum intensity
    resolution: 0.4, // Cooldown for decision
  } as Record<WavePhase, number>,

  // Phase order for cycling
  PHASE_ORDER: [
    'warmup',
    'buildup',
    'firstPeak',
    'breather',
    'escalation',
    'climax',
    'resolution',
  ] as WavePhase[],

  // Total cycle duration (calculated)
  TOTAL_DURATION: 300, // 5 minutes in seconds
};

// =============================================================================
// DIFFICULTY SYSTEM
// =============================================================================

export const DIFFICULTY_CONFIG = {
  // Time-based scaling
  BASE_TIME_INCREASE: 0.15, // 15% per minute
  MAX_TIME_MULTIPLIER: 2.5,

  // P&L scaling
  MIN_PNL_MULTIPLIER: 0.7, // when winning
  MAX_PNL_MULTIPLIER: 3.0, // when losing

  // Volatility
  MIN_VOLATILITY_MULT: 0.9,
  MAX_VOLATILITY_MULT: 1.8,

  // Level
  LEVEL_INCREASE: 0.05, // 5% per level
  MAX_LEVEL_MULTIPLIER: 1.5,

  // Special modifiers
  NEAR_DEATH_THRESHOLD: 20, // HP %
  NEAR_DEATH_REDUCTION: 0.7, // 30% easier

  // Kill streak
  STREAK_TIMEOUT: 3000, // ms
  STREAK_BONUS_PER_5: 0.05, // 5% per 5 kills
  MAX_STREAK_BONUS: 0.3, // 30% max

  // Overall caps
  MIN_DIFFICULTY: 0.3,
  MAX_DIFFICULTY: 8.0,
};

// =============================================================================
// COMBAT TIMINGS
// =============================================================================

export const COMBAT_CONFIG = {
  // Bullet
  BULLET_SPEED: 10,
  BULLET_LIFETIME: 2000, // ms

  // Auto-aim
  AIM_RANGE: 400, // pixels

  // Damage
  ARMOR_REDUCTION_PER_POINT: 0.05, // 5% per armor
  CRIT_DAMAGE_MULTIPLIER: 2.0,
  SUPER_CRIT_MULTIPLIER: 3.0,
  SUPER_CRIT_LUCK_THRESHOLD: 3, // luck needed for super crits
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
// UI/UX
// =============================================================================

export const UI_CONFIG = {
  MAX_CHART_POINTS: 60,
  LEVEL_UP_CHOICES: 3,
};
