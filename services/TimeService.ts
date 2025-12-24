/**
 * TimeService - Centralized Game Clock
 *
 * Provides a single source of truth for game time.
 * Decouples 'Real Time' (wall clock) from 'Game Time' (logic progression).
 * Handles pause/resume at the clock level to prevent timer drift.
 */

import { EventBus } from './EventBus';

class TimeServiceClass {
  private static instance: TimeServiceClass | null = null;

  // Time in milliseconds since game session started (only advances when playing)
  private gameTime: number = 0;

  // Time elapsed in the last frame (ms)
  private deltaTime: number = 0;

  // Scaling factor for time (1.0 = normal, 0.5 = slow mo, etc)
  private timeScale: number = 1.0;

  // Real-world timestamp of the last frame
  private lastRealTime: number = 0;

  // Whether the game clock is currently active
  private isPaused: boolean = true;

  private constructor() {
    this.setupListeners();
  }

  static getInstance(): TimeServiceClass {
    return (TimeServiceClass.instance ??= new TimeServiceClass());
  }

  private setupListeners(): void {
    // Listen for game reset to reset clocks
    EventBus.on('gameReset', () => this.reset());
    EventBus.on('beforeReset', () => this.reset());
  }

  /**
   * Start/Resume the game clock
   */
  start(): void {
    this.isPaused = false;
    this.lastRealTime = performance.now();
  }

  /**
   * Pause the game clock
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * Reset the clocks for a new session
   */
  reset(): void {
    this.gameTime = 0;
    this.deltaTime = 0;
    this.lastRealTime = 0;
    this.isPaused = true;
  }

  /**
   * Update the clock (called once per frame in the main loop)
   * @param currentTime Current performance.now() timestamp
   */
  update(currentTime: number): number {
    if (this.isPaused) {
      this.deltaTime = 0;
      this.lastRealTime = currentTime;
      return 0;
    }

    if (this.lastRealTime === 0) {
      this.lastRealTime = currentTime;
    }

    // Calculate real elapsed time
    const realDelta = currentTime - this.lastRealTime;

    // Cap delta to prevent huge jumps (e.g. after tab return)
    // 50ms = 20 FPS minimum, prevents physics glitches at extreme low framerates
    const cappedDelta = Math.min(realDelta, 50);

    // Apply timescale to get game delta
    this.deltaTime = cappedDelta * this.timeScale;

    // Advance total game time
    this.gameTime += this.deltaTime;

    // Save for next frame
    this.lastRealTime = currentTime;

    return this.deltaTime;
  }

  /**
   * Get total elapsed game time in milliseconds
   */
  getGameTime(): number {
    return this.gameTime;
  }

  /**
   * Get total elapsed game time in seconds
   */
  getGameTimeSeconds(): number {
    return this.gameTime / 1000;
  }

  /**
   * Get last frame's delta time in milliseconds
   */
  getDeltaTime(): number {
    return this.deltaTime;
  }

  /**
   * Get current time scale
   */
  getTimeScale(): number {
    return this.timeScale;
  }

  /**
   * Set time scale (e.g. for slow motion effects)
   */
  setTimeScale(scale: number): void {
    this.timeScale = scale;
  }

  /**
   * Check if game clock is paused
   */
  isClockPaused(): boolean {
    return this.isPaused;
  }
}

export const TimeService = TimeServiceClass.getInstance();
