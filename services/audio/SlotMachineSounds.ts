/**
 * SlotMachineSounds - Professional Casino Slot Machine Sound Effects
 *
 * All sounds are designed in C Major scale for psychological pleasantness.
 * Based on professional casino slot machine audio design research:
 * - C Major: The standard key for slot machines (psychologically pleasant)
 * - Rising arpeggios: Build excitement and anticipation
 * - Metallic coin sounds: Trigger dopamine response
 * - Mechanical clicks: Provide satisfying feedback
 *
 * C Major Scale Reference:
 * C4: 261.63 Hz | E4: 329.63 Hz | G4: 392.00 Hz
 * C5: 523.25 Hz | E5: 659.25 Hz | G5: 783.99 Hz
 * C6: 1046.50 Hz | E6: 1318.51 Hz | G6: 1567.98 Hz
 */

import { synthEngine } from './SynthEngine';
import { AUDIO_PRESETS } from '../../config/AudioRegistry';

// C Major scale frequencies for easy reference
const C_MAJOR = {
  C4: 261.63,
  E4: 329.63,
  G4: 392.0,
  C5: 523.25,
  E5: 659.25,
  G5: 783.99,
  C6: 1046.5,
  E6: 1318.51,
  G6: 1567.98,
  C7: 2093.0,
} as const;

/**
 * Play slot tick sound - single card change during spin
 * Quick, subtle tick for rapid card changes
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
 * Play reel stop sound - satisfying mechanical "clunk"
 * Each reel has rising pitch for building excitement
 * Uses square wave for mechanical feel + sine for warmth
 */
export function playReelStop(reelNumber: number): void {
  // Rising pitch per reel (0, 1, 2) for building excitement
  const pitchMultiplier = 1 + reelNumber * 0.15; // 1.0, 1.15, 1.30
  const volume = 0.8 + reelNumber * 0.1; // 0.8, 0.9, 1.0

  // Use the new professional preset
  if (AUDIO_PRESETS.reelStopClick) {
    synthEngine.playPreset(AUDIO_PRESETS.reelStopClick, {
      frequencyMultiplier: pitchMultiplier,
      volumeMultiplier: volume,
    });
  }

  // Add subtle sparkle on final reel
  if (reelNumber === 2 && AUDIO_PRESETS.slotSparkle) {
    synthEngine.playPreset(AUDIO_PRESETS.slotSparkle, {
      volumeMultiplier: 0.5,
      delay: 0.02,
    });
  }
}

/**
 * Play slot win fanfare - powerful C Major celebration
 * Rich, full sound with bass foundation and chord stacking
 * Slower arpeggio for more impact
 */
export function playSlotWin(): void {
  if (synthEngine.getMuted()) return;

  // === Impact Hit at Start ===
  synthEngine.playPreset(
    {
      components: [
        // Low impact thump
        {
          type: 'sine',
          frequency: 80,
          frequencyEnd: 40,
          envelope: { initial: 0.15, peak: 0.2, duration: 0.1, ramp: 'exponential' },
        },
        // Click for attack
        {
          type: 'square',
          frequency: 200,
          frequencyEnd: 100,
          envelope: { initial: 0.1, peak: 0.1, duration: 0.03, ramp: 'exponential' },
          filter: { type: 'lowpass', frequency: 800 },
        },
      ],
    },
    { volumeMultiplier: 1.0 }
  );

  // === C Major Chord Arpeggio ===
  // Slower timing (150ms between notes) for more impact
  const fanfareNotes = [C_MAJOR.C5, C_MAJOR.E5, C_MAJOR.G5, C_MAJOR.C6];

  fanfareNotes.forEach((freq, i) => {
    if (AUDIO_PRESETS.slotWinNote) {
      // Main note - louder
      synthEngine.playPreset(AUDIO_PRESETS.slotWinNote, {
        frequencyMultiplier: freq / C_MAJOR.C5,
        volumeMultiplier: 1.2 + i * 0.15, // Rising volume: 1.2, 1.35, 1.5, 1.65
        delay: 0.05 + i * 0.15, // Slower: 50ms, 200ms, 350ms, 500ms
      });
    }
  });

  // === Final Chord (all notes together) ===
  [C_MAJOR.C5, C_MAJOR.E5, C_MAJOR.G5].forEach(freq => {
    if (AUDIO_PRESETS.slotWinNote) {
      synthEngine.playPreset(AUDIO_PRESETS.slotWinNote, {
        frequencyMultiplier: freq / C_MAJOR.C5,
        volumeMultiplier: 0.8,
        delay: 0.7, // After arpeggio finishes
      });
    }
  });

  // === Coin accent at end ===
  if (AUDIO_PRESETS.coinDing) {
    synthEngine.playPreset(AUDIO_PRESETS.coinDing, {
      frequencyMultiplier: 1.0,
      volumeMultiplier: 0.6,
      delay: 0.75,
    });
  }
}

/**
 * Play anticipation rising tone - builds tension as reels slow
 * Tremolo effect with rising pitch for suspense
 */
export function playAnticipation(intensity: number = 1): void {
  if (synthEngine.getMuted()) return;

  // Use the anticipation tremolo preset
  if (AUDIO_PRESETS.slotAnticipationTremolo) {
    synthEngine.playPreset(AUDIO_PRESETS.slotAnticipationTremolo, {
      frequencyMultiplier: intensity,
      volumeMultiplier: 0.6 * intensity,
    });
  }

  // Add subtle rising overtone
  synthEngine.playPreset(
    {
      components: [
        {
          type: 'triangle',
          frequency: C_MAJOR.G4 * intensity,
          frequencyEnd: C_MAJOR.G5 * intensity,
          envelope: { initial: 0.01, peak: 0.03, duration: 0.35, ramp: 'linear' },
        },
      ],
    },
    { volumeMultiplier: 0.5, delay: 0.05 }
  );
}

/**
 * Play coin shower - rhythmic "cha-ching" cascade
 * Metallic coin sounds in 16th note pattern
 */
export function playCoinShower(): void {
  if (synthEngine.getMuted()) return;
  if (synthEngine.isOnCooldown('coinShower')) return;
  synthEngine.recordPlay('coinShower');

  const coinCount = 12;
  const baseDelay = 0.04; // 16th note feel at ~150 BPM

  for (let i = 0; i < coinCount; i++) {
    // Slight randomization for natural feel
    const delay = i * baseDelay + Math.random() * 0.015;
    const pitchVariation = 0.9 + Math.random() * 0.2; // ±10% pitch variation

    if (AUDIO_PRESETS.coinDing) {
      synthEngine.playPreset(AUDIO_PRESETS.coinDing, {
        frequencyMultiplier: pitchVariation,
        volumeMultiplier: 0.4 + Math.random() * 0.2,
        delay,
      });
    }
  }

  // Add final "big coin" for closure
  if (AUDIO_PRESETS.coinDing) {
    synthEngine.playPreset(AUDIO_PRESETS.coinDing, {
      frequencyMultiplier: 0.7, // Lower pitch for "bigger" coin
      volumeMultiplier: 0.8,
      delay: coinCount * baseDelay + 0.1,
    });
  }
}

/**
 * Play near miss sound - almost-won disappointment
 * Descending tone with slight dissonance (minor feel)
 */
export function playNearMiss(): void {
  if (synthEngine.getMuted()) return;

  if (AUDIO_PRESETS.slotNearMissNote) {
    // Main descending tone
    synthEngine.playPreset(AUDIO_PRESETS.slotNearMissNote, {
      volumeMultiplier: 0.7,
    });

    // Echo for "wah-wah" effect
    synthEngine.playPreset(AUDIO_PRESETS.slotNearMissNote, {
      frequencyMultiplier: 0.95, // Slight pitch down
      volumeMultiplier: 0.4,
      delay: 0.15,
    });
  }
}

/**
 * Play multiplier chime - bell/glockenspiel for bonus excitement
 * Level-based pitch increase for escalating rewards
 */
export function playMultiplierChime(level: number = 1): void {
  if (synthEngine.getMuted()) return;
  if (synthEngine.isOnCooldown('multiplierChime')) return;
  synthEngine.recordPlay('multiplierChime');

  // Each level raises pitch by a semitone (about 6% per semitone)
  const pitchMultiplier = Math.pow(2, level / 12);

  if (AUDIO_PRESETS.slotMultiplierBell) {
    // Main bell
    synthEngine.playPreset(AUDIO_PRESETS.slotMultiplierBell, {
      frequencyMultiplier: pitchMultiplier,
      volumeMultiplier: 0.6,
    });

    // Quick arpeggio for excitement (C-E-G)
    [0, 4, 7].forEach((semitone, i) => {
      synthEngine.playPreset(AUDIO_PRESETS.slotMultiplierBell, {
        frequencyMultiplier: pitchMultiplier * Math.pow(2, semitone / 12),
        volumeMultiplier: 0.3,
        delay: 0.05 + i * 0.06,
      });
    });
  }
}

/**
 * Play slowdown tension - suspenseful rumble as reel slows
 * Deep bass with tremolo for "drumroll" feel
 */
export function playSlowdownTension(): void {
  if (synthEngine.getMuted()) return;
  if (synthEngine.isOnCooldown('slowdownTension')) return;
  synthEngine.recordPlay('slowdownTension');

  if (AUDIO_PRESETS.slotSlowdownTension) {
    synthEngine.playPreset(AUDIO_PRESETS.slotSlowdownTension, {
      volumeMultiplier: 0.5,
    });
  }

  // Add subtle mid-range tension layer
  synthEngine.playPreset(
    {
      components: [
        {
          type: 'sine',
          frequency: C_MAJOR.C4,
          envelope: { initial: 0.02, peak: 0.04, duration: 0.5, ramp: 'linear' },
        },
      ],
    },
    { volumeMultiplier: 0.3 }
  );
}

/**
 * Play jackpot mega win - extended celebration
 * Full C Major chord + coin shower + sparkles
 */
export function playJackpot(): void {
  if (synthEngine.getMuted()) return;

  // Play the standard win first
  playSlotWin();

  // Add extended celebration after short delay
  setTimeout(() => {
    // Second arpeggio (higher octave)
    const jackpotNotes = [C_MAJOR.C6, C_MAJOR.E6, C_MAJOR.G6, C_MAJOR.C7];

    jackpotNotes.forEach((freq, i) => {
      if (AUDIO_PRESETS.slotWinNote) {
        synthEngine.playPreset(AUDIO_PRESETS.slotWinNote, {
          frequencyMultiplier: freq / C_MAJOR.C5,
          volumeMultiplier: 0.8,
          delay: i * 0.12,
        });
      }
    });

    // Extended coin shower
    playCoinShower();

    // Extra sparkle cascade
    for (let i = 0; i < 8; i++) {
      if (AUDIO_PRESETS.slotSparkle) {
        synthEngine.playPreset(AUDIO_PRESETS.slotSparkle, {
          frequencyMultiplier: 1 + Math.random() * 0.3,
          volumeMultiplier: 0.3 + Math.random() * 0.2,
          delay: 0.6 + i * 0.1 + Math.random() * 0.05,
        });
      }
    }
  }, 600);
}

/**
 * Play spinning loop start - subtle whoosh to indicate spin beginning
 */
export function playSpinStart(): void {
  if (synthEngine.getMuted()) return;

  synthEngine.playPreset(
    {
      components: [
        {
          type: 'sine',
          frequency: C_MAJOR.C4,
          frequencyEnd: C_MAJOR.C5,
          envelope: { initial: 0.02, peak: 0.04, duration: 0.15, ramp: 'exponential' },
        },
      ],
    },
    { volumeMultiplier: 0.4 }
  );
}
