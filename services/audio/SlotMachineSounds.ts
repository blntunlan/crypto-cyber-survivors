/**
 * SlotMachineSounds - Slot Machine Sound Effects
 *
 * Casino-style sounds for the level-up slot machine:
 * - slotTick: Card change tick
 * - reelStop: Reel stopping sound (disabled)
 * - slotWin: Victory fanfare
 * - anticipation: Rising tension
 */

import { synthEngine } from './SynthEngine';
import { SOUND_DEFAULTS } from './constants';

/**
 * Play slot tick sound - single card change
 * Higher pitch = more anticipation
 */
export function playSlotTick(pitch: number = 1): void {
  if (synthEngine.isOnCooldown('slotTick')) return;
  synthEngine.recordPlay('slotTick');

  const context = synthEngine.init();
  if (!context) return;

  const { ctx, masterGain } = context;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const vol = SOUND_DEFAULTS.slotTick.volume;

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800 * pitch, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400 * pitch, ctx.currentTime + 0.02);

  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start();
  osc.stop(ctx.currentTime + 0.03);
}

/**
 * Play reel stop sound - satisfying "clunk"
 * reelNumber: 1, 2, or 3 - pitch increases for each
 * @deprecated Disabled - synthesized sounds don't work well for this effect
 */
export function playReelStop(_reelNumber: number): void {
  // Disabled - synthesized sounds don't work well for this effect
  // TODO: Use actual audio file for casino reel stop sound
}

/**
 * Play slot win fanfare - all reels stopped, dopamine explosion! 🎉
 */
export function playSlotWin(): void {
  if (synthEngine.getMuted()) return;

  const context = synthEngine.init();
  if (!context) return;

  const { ctx, masterGain } = context;

  // Ascending arpeggio with shimmer
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C5, E5, G5, C6, E6
  const now = ctx.currentTime;

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Dual oscillator for richer tone (detuned slightly)
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 1.01, now + i * 0.08); // Slight detune

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.08);

    // Envelope
    gain.gain.setValueAtTime(0, now + i * 0.08);
    gain.gain.linearRampToValueAtTime(0.1, now + i * 0.08 + 0.05); // Attack
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.8); // Decay

    osc.connect(gain);
    osc2.connect(gain); // Connect second osc
    gain.connect(masterGain);

    osc.start(now + i * 0.08);
    osc2.start(now + i * 0.08);

    osc.stop(now + i * 0.08 + 0.9);
    osc2.stop(now + i * 0.08 + 0.9);
  });

  /* 
    // Final sparkle/glissando - Disabled by user request
    const sparkle = ctx.createOscillator();
    const sparkleGain = ctx.createGain();

    sparkle.type = 'sine';
    sparkle.frequency.setValueAtTime(1200, now + 0.4);
    sparkle.frequency.exponentialRampToValueAtTime(2000, now + 0.9);

    sparkleGain.gain.setValueAtTime(0, now + 0.4);
    sparkleGain.gain.linearRampToValueAtTime(0.05, now + 0.6);
    sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    sparkle.connect(sparkleGain).connect(masterGain);
    sparkle.start(now + 0.4);
    sparkle.stop(now + 1.1);
    */
}

/**
 * Play anticipation rising tone - for slowing down phase
 */
export function playAnticipation(intensity: number = 1): void {
  const context = synthEngine.init();
  if (!context) return;

  const { ctx, masterGain } = context;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(400 * intensity, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800 * intensity, ctx.currentTime + 0.2);

  gain.gain.setValueAtTime(0.02, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start();
  osc.stop(ctx.currentTime + 0.25);
}
