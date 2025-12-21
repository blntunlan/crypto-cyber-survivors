/**
 * Audio System Types
 *
 * Shared type definitions for the modular audio system.
 */

/**
 * Sound types for synthesized effects
 */
export type SoundType =
  | 'shoot'
  | 'crit'
  | 'hit'
  | 'gem'
  | 'levelUp'
  | 'dash'
  | 'combo'
  | 'death'
  | 'button'
  | 'slotTick';

/**
 * Sound configuration for volume and playback rate
 */
export interface SoundConfig {
  volume: number;
  rate?: number;
}

/**
 * Combo milestone sound identifiers
 */
export type ComboMilestoneSound = 'combo1' | 'combo2' | 'combo3' | 'combo4' | 'combo5';

/**
 * Synth engine context - shared audio context and master gain
 */
export interface SynthContext {
  ctx: AudioContext;
  masterGain: GainNode;
}
