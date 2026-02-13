/**
 * TimeService - Centralized Game Clock
 *
 * Provides a single source of truth for game time.
 * Decouples 'Real Time' (wall clock) from 'Game Time' (logic progression).
 * Handles pause/resume at the clock level to prevent timer drift.
 *
 * Edge Cases Handled:
 * - Tab switching (caps delta to prevent huge jumps)
 * - Invalid time values (NaN, Infinity, negative)
 * - Time scale bounds (0.1x to 3x)
 */

import { EventBus } from './EventBus';

export interface TimeStats {
  gameTimeMs: number;
  gameTimeSeconds: number;
  deltaTime: number;
  timeScale: number;
  isPaused: boolean;
  currentFps: number;
}

class TimeServiceClass {
  private static instance: TimeServiceClass | null = null;

  /** Time in milliseconds since game session started (only advances when playing) */
  private gameTime: number = 0;

  /** Time elapsed in the last frame (ms) */
  private deltaTime: number = 0;

  /** Scaling factor for time (1.0 = normal, 0.5 = slow mo, etc) */
  private timeScale: number = 1.0;

  /** Real-world timestamp of the last frame */
  private lastRealTime: number = 0;

  /** Track last emitted second for event-driven updates */
  private lastEmittedSecond: number = -1;

  /** Whether the game clock is currently active */
  private isPaused: boolean = true;

  /** Store unsubscribe functions for proper cleanup */
  private unsubscribeFns: (() => void)[] = [];

  /** History of delta times for FPS smoothing */
  private deltaHistory: number[] = [];

  // Configuration Constants
  private static readonly MIN_TIME_SCALE = 0.1;
  private static readonly MAX_TIME_SCALE = 3.0;
  private static readonly DEFAULT_MAX_DELTA = 50; // 50ms = 20 FPS minimum
  private static readonly FPS_WINDOW_SIZE = 20;
  private static readonly MS_PER_SECOND = 1000;
  private static readonly SECONDS_PER_MINUTE = 60;

  // Maximum delta time (can be overridden)
  private maxDeltaTime: number = TimeServiceClass.DEFAULT_MAX_DELTA;

  private constructor() {
    this.setupListeners();
  }

  /**
   * Returns the singleton instance of TimeService.
   */
  static getInstance(): TimeServiceClass {
    return (TimeServiceClass.instance ??= new TimeServiceClass());
  }

  /**
   * Setup global event listeners (game reset, etc).
   */
  private setupListeners(): void {
    this.unsubscribeFns.push(
      EventBus.on(
        'gameReset',
        () => {
          this.reset();
        },
        { scope: 'system' }
      ),
      EventBus.on(
        'beforeReset',
        () => {
          this.reset();
        },
        { scope: 'system' }
      )
    );
  }

  /**
   * Start/Resume the game clock.
   */
  start(): void {
    this.isPaused = false;
    this.lastRealTime = performance.now();
  }

  /**
   * Pause the game clock.
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * Reset the clocks for a new session.
   */
  reset(): void {
    this.gameTime = 0;
    this.deltaTime = 0;
    this.lastRealTime = 0;
    this.lastEmittedSecond = -1;
    this.isPaused = true;
    this.timeScale = 1.0;
    this.deltaHistory = [];
  }

  /**
   * Update the clock (called once per frame in the main loop).
   *
   * @param currentTime - Current performance.now() timestamp
   * @returns Scaled delta time in milliseconds
   */
  update(currentTime: number): number {
    // Validate input
    if (!Number.isFinite(currentTime) || currentTime < 0) {
      return 0;
    }

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

    // Validate delta (handles backward time jumps)
    if (realDelta < 0) {
      this.lastRealTime = currentTime;
      this.deltaTime = 0;
      return 0;
    }

    // Cap delta to prevent huge jumps (e.g. after tab return)
    const cappedDelta = Math.min(realDelta, this.maxDeltaTime);

    // Apply timescale to get game delta
    this.deltaTime = cappedDelta * this.timeScale;

    // Advance total game time
    this.gameTime += this.deltaTime;

    // Check for second boundary crossing for event-driven HUD
    const currentSecond = Math.floor(this.getGameTimeSeconds());
    if (currentSecond > this.lastEmittedSecond && currentSecond >= 0) {
      this.lastEmittedSecond = currentSecond;
      EventBus.emit('secondElapsed', { totalSeconds: currentSecond });
    }

    // Save for next frame
    this.lastRealTime = currentTime;

    // Update history for FPS smoothing
    if (this.deltaTime > 0) {
      this.deltaHistory.push(this.deltaTime);
      if (this.deltaHistory.length > TimeServiceClass.FPS_WINDOW_SIZE) {
        this.deltaHistory.shift();
      }
    }

    return this.deltaTime;
  }

  /**
   * Get total elapsed game time in milliseconds.
   */
  getGameTime(): number {
    return this.gameTime;
  }

  /**
   * Get total elapsed game time in seconds.
   */
  getGameTimeSeconds(): number {
    return this.gameTime / TimeServiceClass.MS_PER_SECOND;
  }

  /**
   * Manually set the game time (USE WITH CAUTION - mainly for testing/debug).
   */
  setGameTime(ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) {
      return;
    }
    this.gameTime = ms;
  }

  /**
   * Get formatted time as MM:SS string.
   */
  getFormattedTime(): string {
    const totalSeconds = Math.floor(this.gameTime / TimeServiceClass.MS_PER_SECOND);
    const minutes = Math.floor(totalSeconds / TimeServiceClass.SECONDS_PER_MINUTE);
    const seconds = totalSeconds % TimeServiceClass.SECONDS_PER_MINUTE;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Get last frame's delta time in milliseconds.
   */
  getDeltaTime(): number {
    return this.deltaTime;
  }

  /**
   * Get current FPS based on last delta window.
   */
  getFPS(): number {
    if (this.deltaHistory.length === 0) {
      return 0;
    }

    // Calculate simple moving average of deltas for stable FPS
    const avgDelta =
      this.deltaHistory.reduce((a, b) => a + b, 0) / this.deltaHistory.length;
    if (avgDelta <= 0) {
      return 0;
    }

    return Math.round(TimeServiceClass.MS_PER_SECOND / avgDelta);
  }

  /**
   * Get current time scale.
   */
  getTimeScale(): number {
    return this.timeScale;
  }

  /**
   * Set time scale (e.g. for slow motion effects).
   * Clamped to safe range [0.1, 3.0].
   */
  setTimeScale(scale: number): void {
    if (!Number.isFinite(scale)) {
      return;
    }

    this.timeScale = Math.max(
      TimeServiceClass.MIN_TIME_SCALE,
      Math.min(TimeServiceClass.MAX_TIME_SCALE, scale)
    );
  }

  /**
   * Set maximum delta time cap (in milliseconds).
   * Used to control behavior when tab returns.
   */
  setMaxDeltaTime(maxDelta: number): void {
    if (!Number.isFinite(maxDelta) || maxDelta <= 0) {
      return;
    }
    this.maxDeltaTime = Math.max(1, Math.min(1000, maxDelta));
  }

  /**
   * Get maximum delta time cap.
   */
  getMaxDeltaTime(): number {
    return this.maxDeltaTime;
  }

  /**
   * Check if game clock is paused.
   */
  isClockPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Get all time stats for debugging/UI.
   */
  getStats(): TimeStats {
    return {
      gameTimeMs: this.gameTime,
      gameTimeSeconds: this.gameTime / TimeServiceClass.MS_PER_SECOND,
      deltaTime: this.deltaTime,
      timeScale: this.timeScale,
      isPaused: this.isPaused,
      currentFps: this.getFPS(),
    };
  }

  /**
   * Reset the singleton system for testing cleanup.
   */
  static resetForTesting(): void {
    if (this.instance) {
      this.instance.unsubscribeFns.forEach(unsub => {
        unsub();
      });
      this.instance.unsubscribeFns = [];
      this.instance = null;
    }
  }
}

export const TimeService = TimeServiceClass.getInstance();
