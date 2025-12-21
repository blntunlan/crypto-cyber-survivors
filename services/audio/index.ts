/**
 * Audio System - Public API
 *
 * Re-exports all public audio functionality.
 * Import from here for the cleanest API.
 *
 * @example
 * import { audio } from './services/audio';
 * audio.playShoot();
 */

// Main service (singleton)
export { audio, AudioService } from './AudioService';

// Types
export type { SoundType, SoundConfig, ComboMilestoneSound, SynthContext } from './types';

// Constants (for advanced usage)
export { SOUND_DEFAULTS, COOLDOWN_MS } from './constants';

// Individual modules (for direct access if needed)
export { synthEngine, SynthEngine } from './SynthEngine';
export { howlerManager, HowlerManager } from './HowlerManager';

// Sound function modules
export * as GameSounds from './GameSounds';
export * as ComboSounds from './ComboSounds';
export * as SlotSounds from './SlotMachineSounds';
