/**
 * HowlerManager - File-based Audio Management
 *
 * Uses Howler.js for loading and playing audio files.
 * Currently used for future music/voice support.
 */

import { Howl, Howler } from 'howler';

/**
 * Manages file-based audio using Howler.js
 */
export class HowlerManager {
  private cache: Map<string, Howl> = new Map();
  private volume: number = 1.0;

  constructor() {
    // Sync Howler global volume
    void Howler.volume(this.volume);
  }

  /**
   * Set global volume for all Howler sounds
   */
  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    void Howler.volume(this.volume);
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Set mute state for all Howler sounds
   */
  setMuted(muted: boolean): void {
    Howler.mute(muted);
  }

  /**
   * Load a sound file (for future music/voice)
   */
  loadSound(
    id: string,
    src: string | string[],
    options?: { loop?: boolean; volume?: number }
  ): Howl {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    const howl = new Howl({
      src: Array.isArray(src) ? src : [src],
      volume: options?.volume ?? this.volume,
      loop: options?.loop ?? false,
    });

    this.cache.set(id, howl);
    return howl;
  }

  /**
   * Play a loaded sound
   */
  playSound(id: string): number | undefined {
    const howl = this.cache.get(id);
    if (howl) {
      return howl.play();
    }
    return undefined;
  }

  /**
   * Stop a sound
   */
  stopSound(id: string): void {
    const howl = this.cache.get(id);
    if (howl) {
      howl.stop();
    }
  }

  /**
   * Unload all sounds (cleanup)
   */
  unloadAll(): void {
    this.cache.forEach(howl => howl.unload());
    this.cache.clear();
  }
}

// Singleton instance
export const howlerManager = new HowlerManager();
