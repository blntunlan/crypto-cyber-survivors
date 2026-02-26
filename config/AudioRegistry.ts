import { type AudioPreset } from '../services/audio/types';
import { ThemeService } from '../services/system/ThemeService';

/**
 * AUDIO_PRESETS - Central registry for synthesized sound configurations.
 *
 * Separates data (frequencies, envelopes) from the playback logic.
 */
export const AUDIO_PRESETS: Record<string, AudioPreset> = {
  nearMiss: {
    components: [
      {
        type: 'sawtooth',
        frequency: 80,
        frequencyEnd: 250,
        envelope: { initial: 0.03, peak: 0.05, duration: 0.25, ramp: 'exponential' },
        filter: { type: 'lowpass', frequency: 400, frequencyEnd: 1600 },
      },
    ],
    cooldown: 800,
  },
  heartbeat: {
    components: [
      {
        type: 'triangle',
        frequency: 70,
        frequencyEnd: 25,
        envelope: { initial: 0.06, peak: 0.09, duration: 0.12, ramp: 'exponential' },
        filter: { type: 'lowpass', frequency: 120 },
      },
    ],
  },
  // Laser pew — tight sine sweep with sub-harmonic
  shoot: {
    components: [
      {
        type: 'sine',
        frequency: 500,
        frequencyEnd: 180,
        envelope: { initial: 0.015, peak: 0.018, duration: 0.05, ramp: 'linear' },
      },
      {
        type: 'triangle',
        frequency: 250,
        frequencyEnd: 90,
        envelope: { initial: 0.008, peak: 0.01, duration: 0.04, ramp: 'linear' },
      },
    ],
    cooldown: 50,
  },
  // Crit — digital rising ping with bright harmonic
  crit: {
    components: [
      {
        type: 'triangle',
        frequency: 700,
        frequencyEnd: 1100,
        envelope: { initial: 0.04, peak: 0.04, duration: 0.12, ramp: 'exponential' },
      },
      {
        type: 'sine',
        frequency: 350,
        frequencyEnd: 550,
        envelope: { initial: 0.03, peak: 0.03, duration: 0.1, ramp: 'exponential' },
      },
    ],
  },
  // Hit — punchy impact with filtered body
  hit: {
    components: [
      {
        type: 'square',
        frequency: 90,
        frequencyEnd: 35,
        envelope: { initial: 0.035, peak: 0.035, duration: 0.08, ramp: 'linear' },
        filter: { type: 'lowpass', frequency: 350 },
      },
    ],
    cooldown: 100,
  },
  // Gem — quick digital chirp (not harsh)
  gem: {
    components: [
      {
        type: 'sine',
        frequency: 1200,
        frequencyEnd: 1800,
        envelope: { initial: 0.012, peak: 0.015, duration: 0.05, ramp: 'linear' },
      },
    ],
    cooldown: 30,
  },
  // Dash — filtered ascending sweep
  dash: {
    components: [
      {
        type: 'sine',
        frequency: 120,
        frequencyEnd: 700,
        envelope: { initial: 0.035, peak: 0.035, duration: 0.15, ramp: 'exponential' },
        filter: { type: 'lowpass', frequency: 600, frequencyEnd: 3000 },
      },
    ],
  },
  // Combo — ascending chime
  combo: {
    components: [
      {
        type: 'triangle',
        frequency: 600,
        frequencyEnd: 900,
        envelope: { initial: 0.03, peak: 0.03, duration: 0.12, ramp: 'exponential' },
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
  selection_tick: {
    components: [
      {
        type: 'sine',
        frequency: 1200,
        envelope: { initial: 0.02, peak: 0.02, duration: 0.02, ramp: 'exponential' },
      },
    ],
    cooldown: 40,
  },
  keystroke: {
    components: [
      {
        type: 'sine',
        frequency: 800,
        envelope: { initial: 0.015, peak: 0.02, duration: 0.03, ramp: 'linear' },
      },
    ],
    cooldown: 30,
  },
  toggle_switch: {
    components: [
      {
        type: 'sine',
        frequency: 600,
        frequencyEnd: 800,
        envelope: { initial: 0.03, peak: 0.03, duration: 0.05, ramp: 'linear' },
      },
    ],
  },
  achievement_glint: {
    components: [
      {
        type: 'sine',
        frequency: 2000,
        frequencyEnd: 3000,
        envelope: { initial: 0.04, peak: 0.04, duration: 0.3, ramp: 'exponential' },
      },
      {
        type: 'sine',
        frequency: 2500,
        delay: 0.05,
        envelope: { initial: 0.02, peak: 0.02, duration: 0.2, ramp: 'exponential' },
      },
    ],
  },
  pair_select: {
    components: [
      {
        type: 'triangle',
        frequency: 440,
        frequencyEnd: 880,
        envelope: { initial: 0.05, peak: 0.05, duration: 0.1, ramp: 'exponential' },
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
        frequency: 280,
        frequencyEnd: 80,
        envelope: { initial: 0.05, peak: 0.05, duration: 0.4, ramp: 'exponential' },
        filter: { type: 'lowpass', frequency: 700, frequencyEnd: 180 },
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
        frequency: 55,
        frequencyEnd: 38,
        envelope: { initial: 0.06, peak: 0.06, duration: 0.8, ramp: 'exponential' },
        filter: { type: 'lowpass', frequency: 250, frequencyEnd: 80 },
      },
      {
        type: 'sine',
        frequency: 38,
        envelope: { initial: 0.08, peak: 0.08, duration: 1.0, ramp: 'exponential' },
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

  // ============================================================
  // SLOT MACHINE SOUNDS - C Major Based Professional Design
  // ============================================================

  // Reel Stop - Mechanical "clunk" with harmonic richness
  reelStopClick: {
    components: [
      // Main click - square wave for mechanical feel
      {
        type: 'square',
        frequency: 523.25, // C5
        frequencyEnd: 261.63, // C4
        envelope: { initial: 0.08, peak: 0.1, duration: 0.04, ramp: 'exponential' },
        filter: { type: 'lowpass', frequency: 2000 },
      },
      // Harmonic layer - sine for warmth
      {
        type: 'sine',
        frequency: 659.25, // E5
        frequencyEnd: 329.63, // E4
        envelope: { initial: 0.05, peak: 0.06, duration: 0.05, ramp: 'exponential' },
      },
    ],
  },

  // Win Fanfare Note - Rich, powerful single note for arpeggio
  slotWinNote: {
    components: [
      // Main tone - warm triangle for body
      {
        type: 'triangle',
        frequency: 523.25, // C5 base
        envelope: { initial: 0.08, peak: 0.1, duration: 0.4, ramp: 'exponential' },
      },
      // Brightness layer - sine for clarity
      {
        type: 'sine',
        frequency: 1046.5, // C6 (octave up)
        envelope: { initial: 0.04, peak: 0.05, duration: 0.35, ramp: 'exponential' },
      },
      // Sub bass for power
      {
        type: 'sine',
        frequency: 261.63, // C4 (octave down)
        envelope: { initial: 0.05, peak: 0.06, duration: 0.3, ramp: 'exponential' },
      },
    ],
  },

  // Coin Ding - Metallic coin sound
  coinDing: {
    components: [
      // High metallic ping
      {
        type: 'sine',
        frequency: 2093, // C7 - high metallic
        frequencyEnd: 1568, // G6
        envelope: { initial: 0.04, peak: 0.05, duration: 0.08, ramp: 'exponential' },
      },
      // Lower body
      {
        type: 'triangle',
        frequency: 1318.5, // E6
        frequencyEnd: 1046.5, // C6
        envelope: { initial: 0.03, peak: 0.04, duration: 0.1, ramp: 'exponential' },
      },
    ],
  },

  // Anticipation Tremolo - Building tension
  slotAnticipationTremolo: {
    components: [
      {
        type: 'sine',
        frequency: 261.63, // C4
        frequencyEnd: 523.25, // C5 - rising
        envelope: { initial: 0.02, peak: 0.04, duration: 0.4, ramp: 'linear' },
      },
    ],
  },

  // Near Miss - Descending minor feel
  slotNearMissNote: {
    components: [
      // Main descending tone
      {
        type: 'sawtooth',
        frequency: 392, // G4
        frequencyEnd: 196, // G3
        envelope: { initial: 0.06, peak: 0.08, duration: 0.25, ramp: 'exponential' },
        filter: { type: 'lowpass', frequency: 1000, frequencyEnd: 400 },
      },
      // Dissonant layer
      {
        type: 'sine',
        frequency: 369.99, // F#4 - slight dissonance
        frequencyEnd: 184.99, // F#3
        envelope: { initial: 0.03, peak: 0.04, duration: 0.2, ramp: 'exponential' },
      },
    ],
  },

  // Multiplier Chime - Bell/Glockenspiel tone
  slotMultiplierBell: {
    components: [
      // Bell fundamental
      {
        type: 'sine',
        frequency: 1046.5, // C6
        envelope: { initial: 0.06, peak: 0.08, duration: 0.25, ramp: 'exponential' },
      },
      // Bell overtone
      {
        type: 'sine',
        frequency: 2093, // C7 (2x fundamental)
        envelope: { initial: 0.03, peak: 0.04, duration: 0.15, ramp: 'exponential' },
      },
      // Third harmonic for richness
      {
        type: 'sine',
        frequency: 3136, // G7 (3x-ish for bell character)
        envelope: { initial: 0.015, peak: 0.02, duration: 0.1, ramp: 'exponential' },
      },
    ],
  },

  // Slowdown Tension - Suspenseful tremolo
  slotSlowdownTension: {
    components: [
      // Deep rumble
      {
        type: 'sine',
        frequency: 82.41, // E2 - low tension
        frequencyEnd: 65.41, // C2
        envelope: { initial: 0.06, peak: 0.1, duration: 0.6, ramp: 'linear' },
      },
      // Mid layer for body
      {
        type: 'triangle',
        frequency: 130.81, // C3
        frequencyEnd: 98, // G2
        envelope: { initial: 0.04, peak: 0.06, duration: 0.5, ramp: 'linear' },
      },
    ],
  },

  // Sparkle Effect - High shimmering sound
  slotSparkle: {
    components: [
      {
        type: 'sine',
        frequency: 2637, // E7
        frequencyEnd: 3136, // G7
        envelope: { initial: 0.03, peak: 0.04, duration: 0.15, ramp: 'exponential' },
      },
    ],
  },

  // ============================================================
  // RETRO 16-BIT PRESETS - Square Wave Aesthetics
  // ============================================================

  retro_shoot: {
    components: [
      {
        type: 'square',
        frequency: 300,
        frequencyEnd: 100,
        envelope: { initial: 0.03, peak: 0.03, duration: 0.08, ramp: 'linear' },
      },
    ],
    cooldown: 50,
  },
  retro_hit: {
    components: [
      {
        type: 'square',
        frequency: 100,
        frequencyEnd: 40,
        envelope: { initial: 0.08, peak: 0.08, duration: 0.12, ramp: 'linear' },
      },
    ],
    cooldown: 80,
  },
  retro_gem: {
    components: [
      {
        type: 'square',
        frequency: 1200,
        frequencyEnd: 1800,
        envelope: { initial: 0.03, peak: 0.03, duration: 0.08, ramp: 'linear' },
      },
    ],
    cooldown: 30,
  },
  retro_dash: {
    components: [
      {
        type: 'square',
        frequency: 150,
        frequencyEnd: 1000,
        envelope: { initial: 0.06, peak: 0.06, duration: 0.15, ramp: 'exponential' },
      },
    ],
  },
  retro_levelUpNote: {
    components: [
      {
        type: 'square',
        frequency: 440,
        envelope: { initial: 0.04, peak: 0.04, duration: 0.2, ramp: 'linear' },
      },
    ],
  },
  retro_crit: {
    components: [
      {
        type: 'square',
        frequency: 600,
        frequencyEnd: 2400,
        envelope: { initial: 0.06, peak: 0.06, duration: 0.2, ramp: 'exponential' },
      },
    ],
  },
  retro_slotTick: {
    components: [
      {
        type: 'square',
        frequency: 1000,
        frequencyEnd: 100,
        envelope: { initial: 0.05, peak: 0.05, duration: 0.02, ramp: 'linear' },
      },
    ],
    cooldown: 30,
  },
  retro_reelStopClick: {
    components: [
      {
        type: 'square',
        frequency: 150,
        frequencyEnd: 70,
        envelope: { initial: 0.12, peak: 0.12, duration: 0.1, ramp: 'linear' },
        filter: { type: 'lowpass', frequency: 1000 },
      },
      {
        type: 'square',
        frequency: 300,
        frequencyEnd: 300,
        envelope: { initial: 0.05, peak: 0.05, duration: 0.05, ramp: 'linear' },
      },
    ],
  },
  retro_slotWinNote: {
    components: [
      {
        type: 'square',
        frequency: 523.25,
        envelope: { initial: 0.07, peak: 0.07, duration: 0.3, ramp: 'linear' },
      },
    ],
  },
  retro_coinDing: {
    components: [
      {
        type: 'square',
        frequency: 2400,
        frequencyEnd: 1800,
        envelope: { initial: 0.03, peak: 0.03, duration: 0.1, ramp: 'linear' },
      },
    ],
  },
  retro_button: {
    components: [
      {
        type: 'square',
        frequency: 1000,
        envelope: { initial: 0.04, peak: 0.04, duration: 0.05, ramp: 'linear' },
      },
    ],
  },
  retro_deathNote: {
    components: [
      {
        type: 'square',
        frequency: 200,
        frequencyEnd: 50,
        envelope: { initial: 0.08, peak: 0.08, duration: 0.4, ramp: 'linear' },
      },
    ],
  },
  retro_nearMiss: {
    components: [
      {
        type: 'square',
        frequency: 120,
        frequencyEnd: 400,
        envelope: { initial: 0.05, peak: 0.05, duration: 0.2, ramp: 'linear' },
      },
    ],
  },
  retro_selection_tick: {
    components: [
      {
        type: 'square',
        frequency: 1200,
        envelope: { initial: 0.03, peak: 0.03, duration: 0.02, ramp: 'linear' },
      },
    ],
  },
  retro_keystroke: {
    components: [
      {
        type: 'square',
        frequency: 800,
        envelope: { initial: 0.02, peak: 0.02, duration: 0.03, ramp: 'linear' },
      },
    ],
  },
  retro_toggle_switch: {
    components: [
      {
        type: 'square',
        frequency: 600,
        frequencyEnd: 900,
        envelope: { initial: 0.05, peak: 0.05, duration: 0.05, ramp: 'linear' },
      },
    ],
  },
  retro_achievement_glint: {
    components: [
      {
        type: 'square',
        frequency: 2000,
        frequencyEnd: 3000,
        envelope: { initial: 0.05, peak: 0.05, duration: 0.2, ramp: 'linear' },
      },
      {
        type: 'square',
        frequency: 2500,
        delay: 0.05,
        envelope: { initial: 0.03, peak: 0.03, duration: 0.15, ramp: 'linear' },
      },
    ],
  },
  retro_pair_select: {
    components: [
      {
        type: 'square',
        frequency: 440,
        frequencyEnd: 880,
        envelope: { initial: 0.06, peak: 0.06, duration: 0.1, ramp: 'linear' },
      },
    ],
  },
  retro_whaleArrival: {
    components: [
      {
        type: 'square',
        frequency: 100,
        frequencyEnd: 30,
        envelope: { initial: 0.1, peak: 0.1, duration: 1.0, ramp: 'linear' },
        filter: { type: 'lowpass', frequency: 500 },
      },
    ],
  },
  retro_combo: {
    components: [
      {
        type: 'square',
        frequency: 600,
        frequencyEnd: 900,
        envelope: { initial: 0.05, peak: 0.05, duration: 0.15, ramp: 'exponential' },
      },
    ],
  },
} as const;

export type AudioPresetId = keyof typeof AUDIO_PRESETS;

/**
 * Helper to get theme-appropriate preset
 */
export function getPreset(id: string): AudioPreset | undefined {
  const isRetro = ThemeService.isRetro();
  if (isRetro) {
    const retroId = `retro_${id}`;
    if (retroId in AUDIO_PRESETS) {
      return (AUDIO_PRESETS as Record<string, AudioPreset>)[retroId];
    }
  }
  return (AUDIO_PRESETS as Record<string, AudioPreset>)[id];
}
