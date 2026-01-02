/**
 * GameSounds - Core Game Sound Effects
 *
 * Synthesized sounds for basic game actions:
 * - shoot, crit, hit, gem, levelUp, dash, combo, death, button
 */

import { synthEngine } from './SynthEngine';
import { SOUND_DEFAULTS } from './constants';

/**
 * Play shoot sound - quick laser pew
 * @param fireRate - Current fire rate (higher = faster shooting = higher pitch)
 * @param projectileCount - Number of projectiles (more = richer sound)
 */
export function playShoot(fireRate: number = 1, projectileCount: number = 1): void {
  if (synthEngine.isOnCooldown('shoot')) return;
  synthEngine.recordPlay('shoot');

  const context = synthEngine.init();
  if (!context) return;

  const { ctx, masterGain } = context;
  const vol = SOUND_DEFAULTS.shoot.volume;

  // Random pitch variation (±15%) for organic feel
  const pitchVariation = 0.85 + Math.random() * 0.3;

  // Dynamic pitch based on fire rate (1x = 400Hz, 3x = 600Hz)
  const basePitch = (350 + fireRate * 50) * pitchVariation;
  const endPitch = basePitch * 0.4;

  // Main shot sound
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(basePitch, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(endPitch, ctx.currentTime + 0.07);

  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.07);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start();
  osc.stop(ctx.currentTime + 0.07);

  // Extra harmonics for multi-projectile shots
  if (projectileCount > 1) {
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(basePitch * 1.5, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(endPitch * 1.5, ctx.currentTime + 0.05);

    gain2.gain.setValueAtTime((vol * 0.3 * Math.min(projectileCount, 5)) / 5, ctx.currentTime);
    gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);

    osc2.connect(gain2);
    gain2.connect(masterGain);

    osc2.start();
    osc2.stop(ctx.currentTime + 0.05);
  }
}

/**
 * Play critical hit sound - impactful dual tone
 */
export function playCrit(): void {
  const context = synthEngine.init();
  if (!context) return;

  const { ctx, masterGain } = context;

  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  const vol = SOUND_DEFAULTS.crit.volume;

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(400, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);

  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(masterGain);

  osc.start();
  osc2.start();
  osc.stop(ctx.currentTime + 0.15);
  osc2.stop(ctx.currentTime + 0.15);
}

/**
 * Play hit/damage sound - low thud
 */
export function playHit(): void {
  if (synthEngine.isOnCooldown('hit')) return;
  synthEngine.recordPlay('hit');

  const context = synthEngine.init();
  if (!context) return;

  const { ctx, masterGain } = context;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const vol = SOUND_DEFAULTS.hit.volume;

  osc.type = 'square';
  osc.frequency.setValueAtTime(100, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.1);

  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(400, ctx.currentTime);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  osc.start();
  osc.stop(ctx.currentTime + 0.1);
}

/**
 * Play gem collection sound - sparkly ping
 */
export function playGem(): void {
  if (synthEngine.isOnCooldown('gem')) return;
  synthEngine.recordPlay('gem');

  const context = synthEngine.init();
  if (!context) return;

  const { ctx, masterGain } = context;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const vol = SOUND_DEFAULTS.gem.volume;

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(2200, ctx.currentTime + 0.04);

  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.06);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start();
  osc.stop(ctx.currentTime + 0.06);
}

/**
 * Play level up sound - ascending arpeggio
 */
export function playLevelUp(): void {
  const context = synthEngine.init();
  if (!context) return;

  const { ctx, masterGain } = context;

  const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  const vol = SOUND_DEFAULTS.levelUp.volume;

  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);

    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + i * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.4);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(ctx.currentTime + i * 0.08);
    osc.stop(ctx.currentTime + i * 0.08 + 0.4);
  });
}

/**
 * Play dash sound - whoosh
 */
export function playDash(): void {
  const context = synthEngine.init();
  if (!context) return;

  const { ctx, masterGain } = context;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const vol = SOUND_DEFAULTS.dash.volume;

  osc.type = 'sine';
  osc.frequency.setValueAtTime(100, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);

  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}

/**
 * Play combo sound - rising chime
 */
export function playCombo(multiplier: number = 1): void {
  const context = synthEngine.init();
  if (!context) return;

  const { ctx, masterGain } = context;

  const baseFreq = 600 + multiplier * 50; // Higher pitch for higher combos
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const vol = SOUND_DEFAULTS.combo.volume;

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.1);

  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

/**
 * Play death sound - descending doom
 */
export function playDeath(): void {
  const context = synthEngine.init();
  if (!context) return;

  const { ctx, masterGain } = context;
  const vol = SOUND_DEFAULTS.death.volume;

  // Multiple descending tones
  [0, 0.1, 0.2].forEach((delay, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    const startFreq = 300 - i * 50;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime + delay);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 0.3, ctx.currentTime + delay + 0.3);

    gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.4);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(200, ctx.currentTime + delay + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.4);
  });
}

/**
 * Play button click sound - UI feedback
 */
export function playButton(): void {
  const context = synthEngine.init();
  if (!context) return;

  const { ctx, masterGain } = context;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const vol = SOUND_DEFAULTS.button.volume;

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1000, ctx.currentTime);

  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start();
  osc.stop(ctx.currentTime + 0.05);
}
