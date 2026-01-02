import { type AudioPreset } from '../services/audio/types';

/**
 * AUDIO_PRESETS - Central registry for synthesized sound configurations.
 *
 * Separates data (frequencies, envelopes) from the playback logic.
 */
export const AUDIO_PRESETS: Record<string, AudioPreset> = {
  shoot: {
    components: [
      {
        type: 'sine',
        frequency: 400, // Base - dynamic override usually applied
        frequencyEnd: 160,
        envelope: { initial: 0.04, peak: 0.04, duration: 0.07, ramp: 'linear' },
      },
    ],
    cooldown: 50,
  },
  crit: {
    components: [
      {
        type: 'triangle',
        frequency: 800,
        frequencyEnd: 1200,
        envelope: { initial: 0.06, peak: 0.06, duration: 0.15, ramp: 'exponential' },
      },
      {
        type: 'sine',
        frequency: 400,
        frequencyEnd: 600,
        envelope: { initial: 0.06, peak: 0.06, duration: 0.15, ramp: 'exponential' },
      },
    ],
  },
  hit: {
    components: [
      {
        type: 'square',
        frequency: 100,
        frequencyEnd: 40,
        envelope: { initial: 0.05, peak: 0.05, duration: 0.1, ramp: 'linear' },
        filter: { type: 'lowpass', frequency: 400 },
      },
    ],
    cooldown: 100,
  },
  gem: {
    components: [
      {
        type: 'sine',
        frequency: 1600,
        frequencyEnd: 2200,
        envelope: { initial: 0.02, peak: 0.02, duration: 0.06, ramp: 'linear' },
      },
    ],
    cooldown: 30,
  },
  dash: {
    components: [
      {
        type: 'sine',
        frequency: 100,
        frequencyEnd: 800,
        envelope: { initial: 0.05, peak: 0.05, duration: 0.2, ramp: 'exponential' },
      },
    ],
  },
  combo: {
    components: [
      {
        type: 'triangle',
        frequency: 650,
        frequencyEnd: 975,
        envelope: { initial: 0.04, peak: 0.04, duration: 0.15, ramp: 'exponential' },
      },
    ],
  },
  button: {
    components: [
      {
        type: 'sine',
        frequency: 1000,
        envelope: { initial: 0.03, peak: 0.03, duration: 0.05, ramp: 'exponential' },
      },
    ],
  },
  levelUpNote: {
    components: [
      {
        type: 'sine',
        frequency: 440, // Base frequency, overridden during arpeggio
        envelope: { initial: 0, peak: 0.03, duration: 0.4, ramp: 'exponential' },
      },
    ],
  },
  deathNote: {
    components: [
      {
        type: 'sawtooth',
        frequency: 300,
        frequencyEnd: 90,
        envelope: { initial: 0.08, peak: 0.08, duration: 0.4, ramp: 'exponential' },
        filter: { type: 'lowpass', frequency: 800, frequencyEnd: 200 },
      },
    ],
  },
  comboNote: {
    components: [
      {
        type: 'triangle',
        frequency: 600,
        frequencyEnd: 900,
        envelope: { initial: 0.06, peak: 0.06, duration: 0.2, ramp: 'exponential' },
      },
    ],
  },
  sineNote: {
    components: [
      {
        type: 'sine',
        frequency: 440,
        envelope: { initial: 0.06, peak: 0.06, duration: 0.3, ramp: 'exponential' },
      },
    ],
  },
  triangleNote: {
    components: [
      {
        type: 'triangle',
        frequency: 440,
        envelope: { initial: 0.05, peak: 0.05, duration: 0.4, ramp: 'exponential' },
      },
    ],
  },
  whaleArrival: {
    components: [
      {
        type: 'sawtooth',
        frequency: 60,
        frequencyEnd: 40,
        envelope: { initial: 0.1, peak: 0.1, duration: 0.8, ramp: 'exponential' },
        filter: { type: 'lowpass', frequency: 300, frequencyEnd: 100 },
      },
      {
        type: 'sine',
        frequency: 40,
        envelope: { initial: 0.15, peak: 0.15, duration: 1.0, ramp: 'exponential' },
      },
    ],
  },
  slotTick: {
    components: [
      {
        type: 'sine',
        frequency: 800,
        frequencyEnd: 400,
        envelope: { initial: 0.1, peak: 0.1, duration: 0.03, ramp: 'exponential' },
      },
    ],
    cooldown: 40,
  },
} as const;

export type AudioPresetId = keyof typeof AUDIO_PRESETS;
