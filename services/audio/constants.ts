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
  shoot: { volume: 0.04 },
  crit: { volume: 0.06 },
  hit: { volume: 0.05 },
  gem: { volume: 0.02 },
  levelUp: { volume: 0.03 },
  dash: { volume: 0.05 },
  combo: { volume: 0.04 },
  death: { volume: 0.08 },
  button: { volume: 0.03 },
  slotTick: { volume: 0.1 },
  slowdownTension: { volume: 0.04 },
  reelStop: { volume: 0.12 },
  coinShower: { volume: 0.08 },
  multiplierChime: { volume: 0.05 },
  nearMiss: { volume: 0.06 },
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
};
