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
  | 'slotTick'
  | 'slowdownTension'
  | 'reelStop'
  | 'coinShower'
  | 'multiplierChime'
  | 'nearMiss';

/**
 * Sound categories for volume grouping
 */
export type SoundCategory =
  | 'combat'
  | 'feedback'
  | 'movement'
  | 'ui'
  | 'alerts'
  | 'slots'
  | 'music'
  | 'sfx';

/**
 * Category volumes record type
 */
export type CategoryVolumes = Record<SoundCategory, number>;

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

/**
 * Sound Envelope - Volume or frequency changes over time
 */
export interface SoundEnvelope {
  initial: number;
  peak: number;
  duration: number; // in seconds
  ramp: 'linear' | 'exponential';
}

/**
 * Synth Component - A single layer of a synthesized sound
 */
export interface SynthComponent {
  type: OscillatorType | 'noise';
  frequency: number;
  frequencyEnd?: number; // for sweeps/pitch slides
  envelope: SoundEnvelope;
  filter?: {
    type: BiquadFilterType;
    frequency: number;
    frequencyEnd?: number;
  };
  delay?: number;
}

/**
 * Audio Preset - Data-driven definition of a sound effect
 */
export interface AudioPreset {
  components: SynthComponent[];
  cooldown?: number; // optional override for COOLDOWN_MS
}
