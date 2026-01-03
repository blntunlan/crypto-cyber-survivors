/**
 * GameSounds - Core Game Sound Effects
 *
 * Now refactored to use the data-driven AudioRegistry.
 */

import { synthEngine } from './SynthEngine';
import { AUDIO_PRESETS } from '../../config/AudioRegistry';

/**
 * Play shoot sound - quick laser pew
 */
export function playShoot(fireRate: number = 1, projectileCount: number = 1): void {
  if (synthEngine.isOnCooldown('shoot')) return;
  synthEngine.recordPlay('shoot');

  // Dynamic pitch based on fire rate
  const pitchVariation = 0.85 + Math.random() * 0.3;
  const freqMultiplier = ((350 + fireRate * 50) / 400) * pitchVariation;

  // Play main shot
  if (AUDIO_PRESETS.shoot) {
    synthEngine.playPreset(AUDIO_PRESETS.shoot, { frequencyMultiplier: freqMultiplier });
  }

  // Extra harmonics for multi-projectile shots
  if (projectileCount > 1 && AUDIO_PRESETS.shoot) {
    synthEngine.playPreset(AUDIO_PRESETS.shoot, {
      frequencyMultiplier: freqMultiplier * 1.5,
      volumeMultiplier: (0.3 * Math.min(projectileCount, 5)) / 5,
      durationMultiplier: 0.7,
    });
  }
}

/**
 * Play critical hit sound
 */
export function playCrit(): void {
  if (AUDIO_PRESETS.crit) {
    synthEngine.playPreset(AUDIO_PRESETS.crit);
  }
}

/**
 * Play hit/damage sound
 */
export function playHit(): void {
  if (synthEngine.isOnCooldown('hit')) return;
  synthEngine.recordPlay('hit');
  if (AUDIO_PRESETS.hit) {
    synthEngine.playPreset(AUDIO_PRESETS.hit);
  }
}

/**
 * Play low HP heartbeat
 */
export function playHeartbeat(): void {
  if (AUDIO_PRESETS.heartbeat) {
    synthEngine.playPreset(AUDIO_PRESETS.heartbeat);
  }
}

/**
 * Play gem collection sound
 */
export function playGem(): void {
  if (synthEngine.isOnCooldown('gem')) return;
  synthEngine.recordPlay('gem');
  if (AUDIO_PRESETS.gem) {
    synthEngine.playPreset(AUDIO_PRESETS.gem);
  }
}

/**
 * Play level up sound - ascending arpeggio
 */
export function playLevelUp(): void {
  const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

  freqs.forEach((freq, i) => {
    if (AUDIO_PRESETS.levelUpNote) {
      synthEngine.playPreset(AUDIO_PRESETS.levelUpNote, {
        frequencyMultiplier: freq / 440,
        delay: i * 0.08,
      });
    }
  });
}

/**
 * Play dash sound
 */
export function playDash(): void {
  if (AUDIO_PRESETS.dash) {
    synthEngine.playPreset(AUDIO_PRESETS.dash);
  }
}

/**
 * Play near miss whoosh sound
 */
export function playWhoosh(): void {
  if (synthEngine.isOnCooldown('nearMiss')) return;
  synthEngine.recordPlay('nearMiss');
  if (AUDIO_PRESETS.nearMiss) {
    synthEngine.playPreset(AUDIO_PRESETS.nearMiss);
  }
}

/**
 * Play combo sound
 */
export function playCombo(multiplier: number = 1): void {
  if (AUDIO_PRESETS.combo) {
    synthEngine.playPreset(AUDIO_PRESETS.combo, {
      frequencyMultiplier: (600 + multiplier * 50) / 650,
    });
  }
}

/**
 * Play death sound - descending doom
 */
export function playDeath(): void {
  [0, 0.1, 0.2].forEach((delay, i) => {
    const startFreq = 300 - i * 50;
    if (AUDIO_PRESETS.deathNote) {
      synthEngine.playPreset(AUDIO_PRESETS.deathNote, {
        frequencyMultiplier: startFreq / 300,
        delay,
      });
    }
  });
}

/**
 * Play whale arrival sound - deep sonar pulse
 */
export function playWhaleArrival(): void {
  if (AUDIO_PRESETS.whaleArrival) {
    synthEngine.playPreset(AUDIO_PRESETS.whaleArrival);
  }
}

/**
 * Play button click sound
 */
export function playButton(): void {
  if (AUDIO_PRESETS.button) {
    synthEngine.playPreset(AUDIO_PRESETS.button);
  }
}
