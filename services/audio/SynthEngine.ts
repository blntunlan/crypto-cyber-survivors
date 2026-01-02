/**
 * SynthEngine - Web Audio API Primitives
 *
 * Manages AudioContext lifecycle and provides helper methods
 * for creating oscillators and gain nodes with smooth transitions.
 */

import { type SoundType, type SynthContext } from './types';
import { COOLDOWN_MS } from './constants';
import { Logger } from '../Logger';

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

/**
 * Core synthesizer engine for Web Audio API operations.
 * Handles the low-level AudioContext and Node creation.
 */
export class SynthEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 1.0;
  private lastPlayTime: Map<SoundType, number> = new Map();
  private activeOscillators: Set<OscillatorNode> = new Set();

  /**
   * Initialize or resume the AudioContext.
   * Browsers require a user gesture to resume the context.
   * @returns The active SynthContext or null if initialization failed.
   */
  init(): SynthContext | null {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.updateGain(true); // Initial gain setup
      }

      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(e => {
          Logger.warn('[SynthEngine] Failed to resume context:', e);
        });
      }

      return this.masterGain ? { ctx: this.ctx, masterGain: this.masterGain } : null;
    } catch (error) {
      Logger.error('[SynthEngine] Initialization error:', error);
      return null;
    }
  }

  /**
   * Get current synth context (if initialized).
   */
  getContext(): SynthContext | null {
    if (this.ctx && this.masterGain) {
      return { ctx: this.ctx, masterGain: this.masterGain };
    }
    return null;
  }

  /**
   * Check if a sound type is currently on cooldown.
   * Note: This is a pure check and does not record the play.
   */
  isOnCooldown(type: SoundType): boolean {
    const cooldown = COOLDOWN_MS[type];
    if (!cooldown) return false;

    const lastTime = this.lastPlayTime.get(type) ?? 0;
    const now = performance.now();

    return now - lastTime < cooldown;
  }

  /**
   * Record that a sound has been played to update its cooldown.
   */
  recordPlay(type: SoundType): void {
    this.lastPlayTime.set(type, performance.now());
  }

  /**
   * Set mute state with smooth transition.
   */
  setMuted(muted: boolean): void {
    if (this.isMuted === muted) return;
    this.isMuted = muted;
    this.updateGain();
  }

  /**
   * Get mute state.
   */
  getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Toggle mute state and return new state.
   */
  toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /**
   * Set master volume (0-1) with smooth transition.
   */
  setVolume(value: number): void {
    const newVolume = Math.max(0, Math.min(1, value));
    if (this.volume === newVolume) return;
    this.volume = newVolume;
    this.updateGain();
  }

  /**
   * Get current volume.
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Update master gain based on mute/volume state using smooth ramping.
   * @param instant - If true, skips the ramp and sets value immediately.
   */
  private updateGain(instant: boolean = false): void {
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.volume;
      const time = this.ctx.currentTime;

      if (instant) {
        this.masterGain.gain.cancelScheduledValues(time);
        this.masterGain.gain.setValueAtTime(targetGain, time);
      } else {
        // Use setTargetAtTime for click-free exponential transition
        // 0.015 is the time constant (approx 15ms)
        this.masterGain.gain.setTargetAtTime(targetGain, time, 0.015);
      }
    }
  }

  /**
   * Create an oscillator with common setup and automatic tracking.
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

    // Track active oscillators for cleanup
    this.activeOscillators.add(osc);
    osc.onended = () => {
      this.activeOscillators.delete(osc);
    };

    return { osc, gain };
  }

  /**
   * Stop all active oscillators managed by this engine.
   */
  stopAll(): void {
    this.activeOscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Already stopped or disconnected
      }
    });
    this.activeOscillators.clear();
  }

  /**
   * Get current time from AudioContext.
   */
  getCurrentTime(): number {
    return this.ctx?.currentTime ?? 0;
  }

  /**
   * Fully dispose of the AudioContext.
   * Used for cleanup or when resetting the audio system.
   */
  async cleanup(): Promise<void> {
    this.stopAll();
    if (this.ctx) {
      await this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
    }
  }
}

// Singleton instance
export const synthEngine = new SynthEngine();
