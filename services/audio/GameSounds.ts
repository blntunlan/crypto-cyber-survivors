/**
 * GameSounds - Core Game Sound Effects
 *
 * Now refactored to use the data-driven AudioRegistry.
 * Each sound uses its category volume for proper mixing.
 */

import { synthEngine } from './SynthEngine';
import { getPreset } from '../../config/AudioRegistry';
import { SOUND_CATEGORY_MAP } from './constants';

/**
 * Helper to get category volume multiplier for a sound
 */
function getCategoryVolumeMultiplier(soundName: string): number {
  const category = SOUND_CATEGORY_MAP[soundName];
  return category ? synthEngine.getEffectiveVolume(category) / synthEngine.getVolume() : 1;
}

/**
 * Play shoot sound - quick laser pew
 */
export function playShoot(fireRate: number = 1, projectileCount: number = 1): void {
  if (synthEngine.isOnCooldown('shoot')) return;
  synthEngine.recordPlay('shoot');

  const catVol = getCategoryVolumeMultiplier('shoot');

  // Dynamic pitch based on fire rate
  const pitchVariation = 0.85 + Math.random() * 0.3;
  const freqMultiplier = ((350 + fireRate * 50) / 400) * pitchVariation;

  const shootPreset = getPreset('shoot');

  // Play main shot
  if (shootPreset) {
    synthEngine.playPreset(shootPreset, {
      frequencyMultiplier: freqMultiplier,
      volumeMultiplier: catVol,
    });
  }

  // Extra harmonics for multi-projectile shots
  if (projectileCount > 1 && shootPreset) {
    synthEngine.playPreset(shootPreset, {
      frequencyMultiplier: freqMultiplier * 1.5,
      volumeMultiplier: (catVol * (0.3 * Math.min(projectileCount, 5))) / 5,
      durationMultiplier: 0.7,
    });
  }
}

/**
 * Play critical hit sound
 */
export function playCrit(): void {
  const catVol = getCategoryVolumeMultiplier('crit');
  const critPreset = getPreset('crit');
  if (critPreset) {
    synthEngine.playPreset(critPreset, { volumeMultiplier: catVol });
  }
}

/**
 * Play hit/damage sound
 */
export function playHit(): void {
  if (synthEngine.isOnCooldown('hit')) return;
  synthEngine.recordPlay('hit');
  const catVol = getCategoryVolumeMultiplier('hit');
  const hitPreset = getPreset('hit');
  if (hitPreset) {
    synthEngine.playPreset(hitPreset, { volumeMultiplier: catVol });
  }
}

/**
 * Play low HP heartbeat
 */
export function playHeartbeat(): void {
  const catVol = getCategoryVolumeMultiplier('heartbeat');
  const heartbeatPreset = getPreset('heartbeat');
  if (heartbeatPreset) {
    synthEngine.playPreset(heartbeatPreset, { volumeMultiplier: catVol });
  }
}

/**
 * Play gem collection sound
 */
export function playGem(): void {
  if (synthEngine.isOnCooldown('gem')) return;
  synthEngine.recordPlay('gem');
  const catVol = getCategoryVolumeMultiplier('gem');
  const gemPreset = getPreset('gem');
  if (gemPreset) {
    synthEngine.playPreset(gemPreset, { volumeMultiplier: catVol });
  }
}

/**
 * Play level up sound - ascending arpeggio
 */
export function playLevelUp(): void {
  const catVol = getCategoryVolumeMultiplier('levelUpNote');
  const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  const levelUpPreset = getPreset('levelUpNote');

  freqs.forEach((freq, i) => {
    if (levelUpPreset) {
      synthEngine.playPreset(levelUpPreset, {
        frequencyMultiplier: freq / 440,
        delay: i * 0.08,
        volumeMultiplier: catVol,
      });
    }
  });
}

/**
 * Play dash sound
 */
export function playDash(): void {
  const catVol = getCategoryVolumeMultiplier('dash');
  const dashPreset = getPreset('dash');
  if (dashPreset) {
    synthEngine.playPreset(dashPreset, { volumeMultiplier: catVol });
  }
}

/**
 * Play near miss whoosh sound
 */
export function playWhoosh(): void {
  if (synthEngine.isOnCooldown('nearMiss')) return;
  synthEngine.recordPlay('nearMiss');
  const catVol = getCategoryVolumeMultiplier('nearMiss');
  const nearMissPreset = getPreset('nearMiss');
  if (nearMissPreset) {
    synthEngine.playPreset(nearMissPreset, { volumeMultiplier: catVol });
  }
}

/**
 * Play combo sound
 */
export function playCombo(multiplier: number = 1): void {
  const catVol = getCategoryVolumeMultiplier('combo');
  const comboPreset = getPreset('combo');
  if (comboPreset) {
    synthEngine.playPreset(comboPreset, {
      frequencyMultiplier: (600 + multiplier * 50) / 650,
      volumeMultiplier: catVol,
    });
  }
}

/**
 * Play death sound - descending doom
 */
export function playDeath(): void {
  const catVol = getCategoryVolumeMultiplier('deathNote');
  const deathPreset = getPreset('deathNote');
  [0, 0.1, 0.2].forEach((delay, i) => {
    const startFreq = 300 - i * 50;
    if (deathPreset) {
      synthEngine.playPreset(deathPreset, {
        frequencyMultiplier: startFreq / 300,
        delay,
        volumeMultiplier: catVol,
      });
    }
  });
}

/**
 * Play whale arrival sound - deep sonar pulse
 */
export function playWhaleArrival(): void {
  const catVol = getCategoryVolumeMultiplier('whaleArrival');
  const whalePreset = getPreset('whaleArrival');
  if (whalePreset) {
    synthEngine.playPreset(whalePreset, { volumeMultiplier: catVol });
  }
}

/**
 * Play button click sound
 */
export function playButton(): void {
  const catVol = getCategoryVolumeMultiplier('button');
  const buttonPreset = getPreset('button');
  if (buttonPreset) {
    synthEngine.playPreset(buttonPreset, { volumeMultiplier: catVol });
  }
}
