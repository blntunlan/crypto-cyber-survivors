/**
 * SlotMachineSounds - Slot Machine Sound Effects
 *
 * Refactored to use declarative AudioPresets.
 */

import { synthEngine } from './SynthEngine';
import { AUDIO_PRESETS } from '../../config/AudioRegistry';

/**
 * Play slot tick sound - single card change
 */
export function playSlotTick(pitch: number = 1): void {
  if (synthEngine.isOnCooldown('slotTick')) return;
  synthEngine.recordPlay('slotTick');

  if (AUDIO_PRESETS.slotTick) {
    synthEngine.playPreset(AUDIO_PRESETS.slotTick, {
      frequencyMultiplier: pitch,
    });
  }
}

/**
 * Play reel stop sound
 * @deprecated Use audio files instead
 */
export function playReelStop(_reelNumber: number): void {
  // Disabled as per original implementation
}

/**
 * Play slot win fanfare
 */
export function playSlotWin(): void {
  if (synthEngine.getMuted()) return;

  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C5, E5, G5, C6, E6

  notes.forEach((freq, i) => {
    // We reuse the levelUpNote preset for the win fanfare as well
    if (AUDIO_PRESETS.levelUpNote) {
      synthEngine.playPreset(AUDIO_PRESETS.levelUpNote, {
        frequencyMultiplier: freq / 440,
        volumeMultiplier: 3.3, // Boost for fanfare
        delay: i * 0.08,
      });

      // Original had dual oscillators, we can simulate by playing a second slightly detuned note
      synthEngine.playPreset(AUDIO_PRESETS.levelUpNote, {
        frequencyMultiplier: (freq * 1.01) / 440,
        volumeMultiplier: 1.5,
        delay: i * 0.08,
      });
    }
  });
}

/**
 * Play anticipation rising tone
 */
export function playAnticipation(intensity: number = 1): void {
  // Creating a one-off preset-like call for anticipation
  // or we could add it to the registry
  synthEngine.playPreset({
    components: [
      {
        type: 'sine',
        frequency: 400 * intensity,
        frequencyEnd: 800 * intensity,
        envelope: { initial: 0.02, peak: 0.02, duration: 0.25, ramp: 'exponential' },
      },
    ],
  });
}
