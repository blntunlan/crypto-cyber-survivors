/**
 * SynthEngine - Web Audio API Primitives
 *
 * Manages AudioContext lifecycle and provides helper methods
 * for creating oscillators and gain nodes with smooth transitions.
 */

import {
  type SoundType,
  type SynthContext,
  type AudioPreset,
  type SoundCategory,
  type CategoryVolumes,
} from './types';
import { COOLDOWN_MS, DEFAULT_CATEGORY_VOLUMES } from './constants';
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
  private categoryVolumes: CategoryVolumes = { ...DEFAULT_CATEGORY_VOLUMES };

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

  // ========================================
  // Category Volume Controls
  // ========================================

  /**
   * Set volume for a specific category (0-1).
   */
  setCategoryVolume(category: SoundCategory, value: number): void {
    this.categoryVolumes[category] = Math.max(0, Math.min(1, value));
  }

  /**
   * Get volume for a specific category.
   */
  getCategoryVolume(category: SoundCategory): number {
    return this.categoryVolumes[category];
  }

  /**
   * Get all category volumes.
   */
  getCategoryVolumes(): CategoryVolumes {
    return { ...this.categoryVolumes };
  }

  /**
   * Get effective volume for a category (master * category).
   * Returns 0 if muted.
   */
  getEffectiveVolume(category: SoundCategory): number {
    if (this.isMuted) return 0;
    return this.volume * this.categoryVolumes[category];
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

  /**
   * Play a declarative audio preset.
   * Constructed nodes are automatically tracked for cleanup.
   *
   * @param preset The AudioPreset definition to play
   * @param overrides Optional dynamic overrides for frequency and duration
   */
  playPreset(
    preset: AudioPreset,
    overrides?: {
      frequencyMultiplier?: number;
      durationMultiplier?: number;
      volumeMultiplier?: number;
      delay?: number;
    }
  ): void {
    if (this.isMuted) return;
    const context = this.init();
    if (!context) return;

    const { ctx, masterGain } = context;
    const now = ctx.currentTime + (overrides?.delay ?? 0);
    const freqMult = overrides?.frequencyMultiplier ?? 1;
    const durMult = overrides?.durationMultiplier ?? 1;
    const volMult = overrides?.volumeMultiplier ?? 1;

    preset.components.forEach(comp => {
      // Noise component (simulated or ignored for now)
      if (comp.type === 'noise') {
        // Skipping noise implementation for now to keep it lean
        return;
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const env = comp.envelope;
      const duration = env.duration * durMult;

      osc.type = comp.type as OscillatorType;

      // Frequency setup (with sweeps)
      const startFreq = comp.frequency * freqMult;
      osc.frequency.setValueAtTime(startFreq, now);
      if (comp.frequencyEnd !== undefined) {
        const endFreq = comp.frequencyEnd * freqMult;
        if (env.ramp === 'exponential') {
          osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
        } else {
          osc.frequency.linearRampToValueAtTime(endFreq, now + duration);
        }
      }

      // Filter setup
      let lastNode: AudioNode = osc;
      if (comp.filter) {
        const filter = ctx.createBiquadFilter();
        filter.type = comp.filter.type;
        filter.frequency.setValueAtTime(comp.filter.frequency, now);
        if (comp.filter.frequencyEnd !== undefined) {
          filter.frequency.exponentialRampToValueAtTime(
            comp.filter.frequencyEnd,
            now + duration
          );
        }
        lastNode.connect(filter);
        lastNode = filter;
      }

      // Gain setup (Envelope)
      const peakVol = env.peak * volMult;
      gain.gain.setValueAtTime(env.initial * volMult, now);
      if (env.ramp === 'exponential') {
        // Gain cannot exponential ramp to 0, use tiny value
        gain.gain.exponentialRampToValueAtTime(peakVol, now + duration * 0.2); // Attack
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration); // Decay
      } else {
        gain.gain.linearRampToValueAtTime(peakVol, now + duration * 0.1); // Quick attack
        gain.gain.linearRampToValueAtTime(0, now + duration); // Decay
      }

      lastNode.connect(gain);
      gain.connect(masterGain);

      // Lifecycle management
      osc.start(now);
      osc.stop(now + duration + 0.1);

      this.activeOscillators.add(osc);
      osc.onended = () => {
        this.activeOscillators.delete(osc);
        osc.disconnect();
        gain.disconnect();
      };
    });
  }
}

// Singleton instance
export const synthEngine = new SynthEngine();
