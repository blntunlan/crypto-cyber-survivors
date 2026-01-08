/**
 * ComboSounds - Combo Milestone Sound Effects
 *
 * Escalating sounds for combo milestones:
 * - combo1 (5 kills): Simple rising tone
 * - combo2 (10 kills): Double tone
 * - combo3 (25 kills): Triple arpeggio
 * - combo4 (50 kills): Epic fanfare
 * - combo5 (100 kills): Ultimate casino explosion
 */

import { synthEngine } from './SynthEngine';
import { type ComboMilestoneSound } from './types';
import { ThemeService } from '../ThemeService';

/**
 * Play combo milestone sound based on level
 */
export function playComboMilestone(sound: ComboMilestoneSound): void {
  switch (sound) {
    case 'combo1':
      playCombo1();
      break;
    case 'combo2':
      playCombo2();
      break;
    case 'combo3':
      playCombo3();
      break;
    case 'combo4':
      playCombo4();
      break;
    case 'combo5':
      playCombo5();
      break;
  }
}

/**
 * COMBO! (5 kills) - Simple rising tone
 */
function playCombo1(): void {
  const context = synthEngine.init();
  if (!context) return;

  const { ctx, masterGain } = context;
  const isRetro = ThemeService.isRetro();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = isRetro ? 'square' : 'triangle';
  osc.frequency.setValueAtTime(500, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);

  gain.gain.setValueAtTime(0.06, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}

/**
 * SUPER COMBO! (10 kills) - Double tone
 */
function playCombo2(): void {
  const context = synthEngine.init();
  if (!context) return;

  const { ctx, masterGain } = context;
  const isRetro = ThemeService.isRetro();

  [0, 0.1].forEach((delay, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isRetro ? 'square' : 'triangle';
    const freq = 600 + i * 200;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + delay + 0.15);

    gain.gain.setValueAtTime(0.06, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.2);
  });
}

/**
 * MEGA COMBO! (25 kills) - Triple arpeggio
 */
function playCombo3(): void {
  const context = synthEngine.init();
  if (!context) return;

  const { ctx, masterGain } = context;
  const isRetro = ThemeService.isRetro();

  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const delay = i * 0.08;

    osc.type = isRetro ? 'square' : 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

    gain.gain.setValueAtTime(0.06, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.3);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.3);
  });
}

/**
 * ULTRA COMBO! (50 kills) - Epic fanfare
 */
function playCombo4(): void {
  const context = synthEngine.init();
  if (!context) return;

  const { ctx, masterGain } = context;
  const isRetro = ThemeService.isRetro();

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const delay = i * 0.1;

    osc.type = isRetro ? 'square' : 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

    osc2.type = isRetro ? 'square' : 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, ctx.currentTime + delay);

    gain.gain.setValueAtTime(0.05, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.4);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(masterGain);

    osc.start(ctx.currentTime + delay);
    osc2.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.4);
    osc2.stop(ctx.currentTime + delay + 0.4);
  });
}

/**
 * JACKPOT! (100 kills) - Ultimate casino explosion 🎰💰
 */
function playCombo5(): void {
  const context = synthEngine.init();
  if (!context) return;

  const { ctx, masterGain } = context;
  const isRetro = ThemeService.isRetro();

  // Ascending jackpot fanfare
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98]; // C5 to G6

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const delay = i * 0.08;

    osc.type = isRetro ? 'square' : 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

    // Shimmer LFO
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(20, ctx.currentTime);
    lfoGain.gain.setValueAtTime(freq * 0.02, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    osc2.type = isRetro ? 'square' : 'triangle';
    osc2.frequency.setValueAtTime(freq * 1.5, ctx.currentTime + delay);

    gain.gain.setValueAtTime(0.05, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.5);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(masterGain);

    lfo.start(ctx.currentTime + delay);
    osc.start(ctx.currentTime + delay);
    osc2.start(ctx.currentTime + delay);
    lfo.stop(ctx.currentTime + delay + 0.5);
    osc.stop(ctx.currentTime + delay + 0.5);
    osc2.stop(ctx.currentTime + delay + 0.5);
  });

  // Casino "ding-ding-ding" finish
  [0.5, 0.6, 0.7, 0.8, 0.9].forEach(delay => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isRetro ? 'square' : 'sine';
    osc.frequency.setValueAtTime(2500, ctx.currentTime + delay);

    gain.gain.setValueAtTime(0.04, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.1);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.1);
  });
}
