/**
 * GameSounds - Core Game Sound Effects
 *
 * Now refactored to use the data-driven AudioRegistry.
 */

import { synthEngine } from './SynthEngine';
import { getPreset } from '../../config/AudioRegistry';

/**
 * Play shoot sound - quick laser pew
 */
export function playShoot(fireRate: number = 1, projectileCount: number = 1): void {
  if (synthEngine.isOnCooldown('shoot')) return;
  synthEngine.recordPlay('shoot');

  // Dynamic pitch based on fire rate
  const pitchVariation = 0.85 + Math.random() * 0.3;
  const freqMultiplier = ((350 + fireRate * 50) / 400) * pitchVariation;

  const shootPreset = getPreset('shoot');

  // Play main shot
  if (shootPreset) {
    synthEngine.playPreset(shootPreset, { frequencyMultiplier: freqMultiplier });
  }

  // Extra harmonics for multi-projectile shots
  if (projectileCount > 1 && shootPreset) {
    synthEngine.playPreset(shootPreset, {
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
  const critPreset = getPreset('crit');
  if (critPreset) {
    synthEngine.playPreset(critPreset);
  }
}

/**
 * Play hit/damage sound
 */
export function playHit(): void {
  if (synthEngine.isOnCooldown('hit')) return;
  synthEngine.recordPlay('hit');
  const hitPreset = getPreset('hit');
  if (hitPreset) {
    synthEngine.playPreset(hitPreset);
  }
}

/**
 * Play low HP heartbeat
 */
export function playHeartbeat(): void {
  const heartbeatPreset = getPreset('heartbeat');
  if (heartbeatPreset) {
    synthEngine.playPreset(heartbeatPreset);
  }
}

/**
 * Play gem collection sound
 */
export function playGem(): void {
  if (synthEngine.isOnCooldown('gem')) return;
  synthEngine.recordPlay('gem');
  const gemPreset = getPreset('gem');
  if (gemPreset) {
    synthEngine.playPreset(gemPreset);
  }
}

/**
 * Play level up sound - ascending arpeggio
 */
export function playLevelUp(): void {
  const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  const levelUpPreset = getPreset('levelUpNote');

  freqs.forEach((freq, i) => {
    if (levelUpPreset) {
      synthEngine.playPreset(levelUpPreset, {
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
  const dashPreset = getPreset('dash');
  if (dashPreset) {
    synthEngine.playPreset(dashPreset);
  }
}

/**
 * Play near miss whoosh sound
 */
export function playWhoosh(): void {
  if (synthEngine.isOnCooldown('nearMiss')) return;
  synthEngine.recordPlay('nearMiss');
  const nearMissPreset = getPreset('nearMiss');
  if (nearMissPreset) {
    synthEngine.playPreset(nearMissPreset);
  }
}

/**
 * Play combo sound
 */
export function playCombo(multiplier: number = 1): void {
  const comboPreset = getPreset('combo');
  if (comboPreset) {
    synthEngine.playPreset(comboPreset, {
      frequencyMultiplier: (600 + multiplier * 50) / 650,
    });
  }
}

/**
 * Play death sound - descending doom
 */
export function playDeath(): void {
  const deathPreset = getPreset('deathNote');
  [0, 0.1, 0.2].forEach((delay, i) => {
    const startFreq = 300 - i * 50;
    if (deathPreset) {
      synthEngine.playPreset(deathPreset, {
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
  const whalePreset = getPreset('whaleArrival');
  if (whalePreset) {
    synthEngine.playPreset(whalePreset);
  }
}

/**
 * Play button click sound
 */
export function playButton(): void {
  const buttonPreset = getPreset('button');
  if (buttonPreset) {
    synthEngine.playPreset(buttonPreset);
  }
}
