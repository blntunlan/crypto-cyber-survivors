/**
 * SynthEngine - Web Audio API Primitives
 *
 * Manages AudioContext lifecycle and provides helper methods
 * for creating oscillators and gain nodes.
 */

import { type SoundType, type SynthContext } from './types';
import { COOLDOWN_MS } from './constants';

/**
 * Core synthesizer engine for Web Audio API operations
 */
export class SynthEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 1.0;
  private lastPlayTime: Map<SoundType, number> = new Map();

  /**
   * Initialize or resume the AudioContext
   */
  init(): SynthContext | null {
    if (!this.ctx) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-explicit-any
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    // After initialization, both ctx and masterGain are guaranteed to exist
    return this.masterGain ? { ctx: this.ctx, masterGain: this.masterGain } : null;
  }

  /**
   * Get current synth context (if initialized)
   */
  getContext(): SynthContext | null {
    if (this.ctx && this.masterGain) {
      return { ctx: this.ctx, masterGain: this.masterGain };
    }
    return null;
  }

  /**
   * Check if a sound type is currently on cooldown
   */
  isOnCooldown(type: SoundType): boolean {
    const cooldown = COOLDOWN_MS[type];
    if (!cooldown) return false;

    const lastTime = this.lastPlayTime.get(type) ?? 0;
    const now = performance.now();

    if (now - lastTime < cooldown) {
      return true;
    }

    this.lastPlayTime.set(type, now);
    return false;
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.updateGain();
  }

  /**
   * Get mute state
   */
  getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Toggle mute state and return new state
   */
  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.updateGain();
    return this.isMuted;
  }

  /**
   * Set master volume (0-1)
   */
  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    this.updateGain();
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Update master gain based on mute/volume state
   */
  private updateGain(): void {
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.volume;
      this.masterGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);
    }
  }

  /**
   * Create an oscillator with common setup
   */
  createOscillator(
    type: OscillatorType,
    frequency: number
  ): { osc: OscillatorNode; gain: GainNode } | null {
    const context = this.init();
    if (!context) return null;

    const osc = context.ctx.createOscillator();
    const gain = context.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, context.ctx.currentTime);

    osc.connect(gain);
    gain.connect(context.masterGain);

    return { osc, gain };
  }

  /**
   * Get current time from AudioContext
   */
  getCurrentTime(): number {
    return this.ctx?.currentTime ?? 0;
  }
}

// Singleton instance
export const synthEngine = new SynthEngine();
