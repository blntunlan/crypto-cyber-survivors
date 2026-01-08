/**
 * Audio System Constants
 *
 * Default volumes and cooldown configurations.
 */

import { type SoundType, type SoundConfig } from './types';

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
