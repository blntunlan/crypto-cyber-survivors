/**
 * AudioService - Legacy Re-export
 *
 * This file now re-exports from the modular audio system.
 * All functionality has been moved to ./audio/ directory.
 *
 * @deprecated Import from './audio' or './audio/AudioService' directly
 *
 * Structure:
 * - audio/AudioService.ts   - Main facade (this export)
 * - audio/SynthEngine.ts    - Web Audio API primitives
 * - audio/GameSounds.ts     - Core game sounds (shoot, crit, gem, etc.)
 * - audio/ComboSounds.ts    - Combo milestone sounds
 * - audio/SlotMachineSounds.ts - Slot machine sounds
 * - audio/HowlerManager.ts  - File-based audio
 * - audio/types.ts          - Type definitions
 * - audio/constants.ts      - Sound defaults and cooldowns
 */

// Re-export everything from the new modular system
export { audio, AudioService } from './audio';
export type { SoundType, SoundConfig, ComboMilestoneSound } from './audio';
