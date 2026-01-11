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

  // Store unsubscribe functions for proper cleanup
  private unsubscribeFns: (() => void)[] = [];
  private deltaHistory: number[] = [];

  // Configuration
  private static readonly MIN_TIME_SCALE = 0.1;
  private static readonly MAX_TIME_SCALE = 3.0;
  private static readonly DEFAULT_MAX_DELTA = 50; // 50ms = 20 FPS minimum

  // Maximum delta time (can be overridden)
  private maxDeltaTime: number = TimeServiceClass.DEFAULT_MAX_DELTA;

  private constructor() {
    this.setupListeners();
  }

  static getInstance(): TimeServiceClass {
    return (TimeServiceClass.instance ??= new TimeServiceClass());
  }

  private setupListeners(): void {
    this.unsubscribeFns.push(
      EventBus.on('gameReset', () => this.reset()),
      EventBus.on('beforeReset', () => this.reset())
    );
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
    this.timeScale = 1.0;
    this.deltaHistory = [];
  }

  /**
   * Update the clock (called once per frame in the main loop)
   * @param currentTime Current performance.now() timestamp
   * @returns Delta time in milliseconds (scaled by timeScale)
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

    // Validate delta (handles backward time jumps, e.g., system clock changes)
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

    // Save for next frame
    this.lastRealTime = currentTime;

    // Update history for FPS smoothing
    if (this.deltaTime > 0) {
      this.deltaHistory.push(this.deltaTime);
      if (this.deltaHistory.length > 20) {
        this.deltaHistory.shift();
      }
    }

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
   * Manually set the game time (USE WITH CAUTION - mainly for testing/debug)
   */
  setGameTime(ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) return;
    this.gameTime = ms;
  }

  /**
   * Get formatted time as MM:SS string
   */
  getFormattedTime(): string {
    const totalSeconds = Math.floor(this.gameTime / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Get last frame's delta time in milliseconds
   */
  getDeltaTime(): number {
    return this.deltaTime;
  }

  /**
   * Get current FPS based on last delta
   * Returns 0 if no valid delta
   */
  getFPS(): number {
    if (this.deltaHistory.length === 0) return 0;

    // Calculate simple moving average of deltas for stable FPS
    const avgDelta =
      this.deltaHistory.reduce((a, b) => a + b, 0) / this.deltaHistory.length;
    if (avgDelta <= 0) return 0;

    return Math.round(1000 / avgDelta);
  }

  /**
   * Get current time scale
   */
  getTimeScale(): number {
    return this.timeScale;
  }

  /**
   * Set time scale (e.g. for slow motion effects)
   * Clamped to safe range [0.1, 3.0]
   */
  setTimeScale(scale: number): void {
    if (!Number.isFinite(scale)) return;

    this.timeScale = Math.max(
      TimeServiceClass.MIN_TIME_SCALE,
      Math.min(TimeServiceClass.MAX_TIME_SCALE, scale)
    );
  }

  /**
   * Set maximum delta time cap (in milliseconds)
   * Used to control behavior when tab returns
   */
  setMaxDeltaTime(maxDelta: number): void {
    if (!Number.isFinite(maxDelta) || maxDelta <= 0) return;
    this.maxDeltaTime = Math.max(1, Math.min(1000, maxDelta));
  }

  /**
   * Get maximum delta time cap
   */
  getMaxDeltaTime(): number {
    return this.maxDeltaTime;
  }

  /**
   * Check if game clock is paused
   */
  isClockPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Get all time stats for debugging
   */
  getStats(): TimeStats {
    return {
      gameTimeMs: this.gameTime,
      gameTimeSeconds: this.gameTime / 1000,
      deltaTime: this.deltaTime,
      timeScale: this.timeScale,
      isPaused: this.isPaused,
      currentFps: this.getFPS(),
    };
  }

  /**
   * Reset for testing - cleanup EventBus listeners
   */
  static resetForTesting(): void {
    if (this.instance) {
      this.instance.unsubscribeFns.forEach(unsub => unsub());
      this.instance.unsubscribeFns = [];
      this.instance = null;
    }
  }
}

export const TimeService = TimeServiceClass.getInstance();
