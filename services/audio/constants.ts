/**
 * Audio System Constants
 *
 * Default volumes and cooldown configurations.
 */

import {
  type SoundType,
  type SoundConfig,
  type SoundCategory,
  type CategoryVolumes,
} from './types';

/**
 * Default volume levels for each sound type
 */
export const SOUND_DEFAULTS: Record<SoundType, SoundConfig> = {
  shoot: { volume: 0.025 },
  crit: { volume: 0.04 },
  hit: { volume: 0.035 },
  gem: { volume: 0.015 },
  levelUp: { volume: 0.025 },
  dash: { volume: 0.035 },
  combo: { volume: 0.03 },
  death: { volume: 0.05 },
  button: { volume: 0.025 },
  slotTick: { volume: 0.06 },
  slowdownTension: { volume: 0.03 },
  reelStop: { volume: 0.08 },
  coinShower: { volume: 0.05 },
  multiplierChime: { volume: 0.035 },
  nearMiss: { volume: 0.04 },
};

/**
 * Cooldown times (ms) to prevent sound spam
 */
export const COOLDOWN_MS: Partial<Record<SoundType, number>> = {
  shoot: 50, // Allow rapid fire sound
  gem: 30, // Rapid gem collection
  hit: 100, // Damage cooldown
  slotTick: 40, // Prevent slot sound overlap artifacts
  slowdownTension: 1000, // Only play once per second (prevents 3x overlap)
  coinShower: 500, // Prevent double trigger
  multiplierChime: 100, // Allow quick succession for rising effect
};

/**
 * Map each sound to its category
 */
export const SOUND_CATEGORY_MAP: Record<string, SoundCategory> = {
  // Combat
  shoot: 'combat',
  crit: 'combat',
  hit: 'combat',
  // Feedback
  gem: 'feedback',
  levelUp: 'feedback',
  levelUpNote: 'feedback',
  combo: 'feedback',
  comboMilestone: 'feedback',
  combo1: 'feedback',
  combo2: 'feedback',
  combo3: 'feedback',
  combo4: 'feedback',
  combo5: 'feedback',
  // Movement
  dash: 'movement',
  nearMiss: 'movement',
  whoosh: 'movement',
  // UI
  button: 'ui',
  selection_tick: 'ui',
  keystroke: 'ui',
  toggle_switch: 'ui',
  achievement_glint: 'ui',
  pair_select: 'ui',
  // Alerts
  heartbeat: 'alerts',
  death: 'alerts',
  deathNote: 'alerts',
  whaleArrival: 'alerts',
  // Slots
  slotTick: 'slots',
  reelStop: 'slots',
  slotWin: 'slots',
  anticipation: 'slots',
  jackpot: 'slots',
  coinShower: 'slots',
  multiplierChime: 'slots',
  slowdownTension: 'slots',
  spinStart: 'slots',
};

/**
 * Default volume for each category (0-1)
 */
export const DEFAULT_CATEGORY_VOLUMES: CategoryVolumes = {
  combat: 1.0,
  feedback: 1.0,
  movement: 1.0,
  ui: 1.0,
  alerts: 1.0,
  slots: 1.0,
  music: 0.4,
  sfx: 1.0,
};
