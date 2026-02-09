/**
 * StrategicLayer - PID Controller for Flow State Management
 *
 * AI Director V2 - Hierarchical Architecture
 * Layer 1: Strategic (Slow) - Updates every 5-10 seconds
 *
 * Uses PID control theory to maintain player HP in flow state (35%-65%)
 *
 * PID Formula:
 *   Output = Kp * Error + Ki * ∫Error + Kd * (dError/dt)
 *
 * Where:
 *   - Error = TargetHP(50%) - CurrentHP
 *   - Kp = Proportional gain (immediate correction)
 *   - Ki = Integral gain (accumulated error correction)
 *   - Kd = Derivative gain (rate of change damping)
 *
 * @see docs/AI_DIRECTOR_V2_DESIGN.md
 */

import { Logger } from '../../system/Logger';
import { EventBus } from '../../core/EventBus';

/**
 * PID Controller configuration
 */
export const PID_CONFIG = {
  // Target HP percentage (center of flow state)
  TARGET_HP_PERCENT: 0.5,

  // Flow state bounds
  FLOW_HP_MIN: 0.35,
  FLOW_HP_MAX: 0.65,

  // PID gains (tuned for game feel)
  Kp: 2.0, // Proportional: immediate response to HP deviation
  Ki: 0.1, // Integral: correct persistent drift over time
  Kd: 0.5, // Derivative: dampen rapid HP changes

  // Anti-windup limits
  INTEGRAL_MIN: -5.0,
  INTEGRAL_MAX: 5.0,

  // Output limits (difficulty multiplier)
  OUTPUT_MIN: 0.3, // Minimum difficulty (mercy)
  OUTPUT_MAX: 2.5, // Maximum difficulty (challenge)

  // Update interval
  UPDATE_INTERVAL_MS: 5000, // 5 seconds

  // Smoothing (exponential moving average)
  SMOOTHING_ALPHA: 0.3,
} as const;

/**
 * PID state for tracking
 */
interface PIDState {
  error: number; // Current error
  integral: number; // Accumulated error
  derivative: number; // Rate of change
  lastError: number; // Previous error
  lastUpdateTime: number;
  output: number; // Current PID output
  smoothedOutput: number; // Smoothed output
}

/**
 * Strategic output for downstream layers
 */
export interface StrategicOutput {
  /** Difficulty multiplier (0.3 - 2.5) */
  difficultyMultiplier: number;

  /** Current flow state assessment */
  flowState: 'bored' | 'flow' | 'stressed';

  /** How far from target (0 = perfect, 1 = max deviation) */
  deviationMagnitude: number;

  /** Trend direction (-1 = getting easier, 0 = stable, 1 = getting harder) */
  trend: number;

  /** Confidence in current assessment (0-1) */
  confidence: number;

  /** Debug info */
  pid: Readonly<PIDState>;
}

/**
 * StrategicLayer - Singleton
 */
class StrategicLayerClass {
  private static instance: StrategicLayerClass | null = null;

  // PID state
  private pidState: PIDState = {
    error: 0,
    integral: 0,
    derivative: 0,
    lastError: 0,
    lastUpdateTime: 0,
    output: 1.0,
    smoothedOutput: 1.0,
  };

  // HP history for derivative calculation
  private hpHistory: { time: number; hp: number }[] = [];
  private readonly HP_HISTORY_SIZE = 10;

  // Confidence tracking
  private updateCount: number = 0;
  private readonly CONFIDENCE_WARMUP = 5; // Need 5 updates for full confidence

  private constructor() {
    this.setupEventListeners();
    Logger.debug('[StrategicLayer] PID Controller initialized');
  }

  static getInstance(): StrategicLayerClass {
    return (StrategicLayerClass.instance ??= new StrategicLayerClass());
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    EventBus.on('gameReset', () => this.reset());
  }

  /**
   * Update PID controller with current player HP
   *
   * @param currentHPPercent - Current HP as percentage (0-1)
   * @param deltaTime - Time since last update in ms
   * @returns Strategic output for downstream layers
   */
  update(currentHPPercent: number, _deltaTime: number): StrategicOutput {
    const now = Date.now();
    const config = PID_CONFIG;

    // Clamp HP to valid range
    const hp = Math.max(0, Math.min(1, currentHPPercent));

    // Record HP history
    this.recordHP(now, hp);

    // Check if enough time has passed for update
    const timeSinceLastUpdate = now - this.pidState.lastUpdateTime;
    if (
      timeSinceLastUpdate < config.UPDATE_INTERVAL_MS &&
      this.pidState.lastUpdateTime > 0
    ) {
      // Return cached output with updated flow state
      return this.buildOutput(hp);
    }

    // Calculate PID terms
    // NOTE: We use INVERTED error (HP - TARGET) so that:
    // - High HP (bored) → positive error → higher difficulty (more enemies)
    // - Low HP (stressed) → negative error → lower difficulty (fewer enemies)
    const error = hp - config.TARGET_HP_PERCENT;

    // Integral with anti-windup
    const dt = Math.max(0.001, timeSinceLastUpdate / 1000); // Convert to seconds
    let integral = this.pidState.integral + error * dt;
    integral = Math.max(config.INTEGRAL_MIN, Math.min(config.INTEGRAL_MAX, integral));

    // Derivative (rate of change)
    const derivative = (error - this.pidState.lastError) / dt;

    // Calculate PID output
    const rawOutput =
      1.0 + (config.Kp * error + config.Ki * integral + config.Kd * derivative);

    // Clamp output to limits
    const clampedOutput = Math.max(
      config.OUTPUT_MIN,
      Math.min(config.OUTPUT_MAX, rawOutput)
    );

    // Apply exponential smoothing
    const smoothedOutput =
      config.SMOOTHING_ALPHA * clampedOutput +
      (1 - config.SMOOTHING_ALPHA) * this.pidState.smoothedOutput;

    // Update state
    this.pidState = {
      error,
      integral,
      derivative,
      lastError: error,
      lastUpdateTime: now,
      output: clampedOutput,
      smoothedOutput,
    };

    this.updateCount++;

    // Emit event for monitoring
    EventBus.emit('strategicLayerUpdate', {
      difficultyMultiplier: smoothedOutput,
      error,
      integral,
      derivative,
    });

    Logger.debug(
      `[StrategicLayer] PID Update: HP=${(hp * 100).toFixed(1)}%, ` +
        `Error=${error.toFixed(3)}, Output=${smoothedOutput.toFixed(2)}`
    );

    return this.buildOutput(hp);
  }

  /**
   * Record HP for history
   */
  private recordHP(time: number, hp: number): void {
    this.hpHistory.push({ time, hp });
    while (this.hpHistory.length > this.HP_HISTORY_SIZE) {
      this.hpHistory.shift();
    }
  }

  /**
   * Build strategic output
   */
  private buildOutput(currentHP: number): StrategicOutput {
    const config = PID_CONFIG;

    // Determine flow state
    let flowState: 'bored' | 'flow' | 'stressed';
    if (currentHP > config.FLOW_HP_MAX) {
      flowState = 'bored';
    } else if (currentHP < config.FLOW_HP_MIN) {
      flowState = 'stressed';
    } else {
      flowState = 'flow';
    }

    // Calculate deviation magnitude (0 = at target, 1 = at extreme)
    const deviation = Math.abs(currentHP - config.TARGET_HP_PERCENT);
    const maxDeviation = Math.max(
      config.TARGET_HP_PERCENT,
      1 - config.TARGET_HP_PERCENT
    );
    const deviationMagnitude = deviation / maxDeviation;

    // Calculate trend from history
    const trend = this.calculateTrend();

    // Calculate confidence
    const confidence = Math.min(1, this.updateCount / this.CONFIDENCE_WARMUP);

    return {
      difficultyMultiplier: this.pidState.smoothedOutput,
      flowState,
      deviationMagnitude,
      trend,
      confidence,
      pid: { ...this.pidState },
    };
  }

  /**
   * Calculate HP trend from history
   * @returns -1 (decreasing), 0 (stable), 1 (increasing)
   */
  private calculateTrend(): number {
    if (this.hpHistory.length < 3) return 0;

    const recent = this.hpHistory.slice(-3);
    const oldHP = recent[0]?.hp ?? 0;
    const newHP = recent[recent.length - 1]?.hp ?? 0;

    const change = newHP - oldHP;
    if (Math.abs(change) < 0.05) return 0; // Stable
    return change > 0 ? 1 : -1;
  }

  /**
   * Get current output without updating
   */
  getCurrentOutput(): StrategicOutput {
    const lastHP = this.hpHistory[this.hpHistory.length - 1]?.hp ?? 0.5;
    return this.buildOutput(lastHP);
  }

  /**
   * Manually adjust PID gains (for tuning)
   */
  setGains(kp?: number, ki?: number, kd?: number): void {
    if (kp !== undefined) (PID_CONFIG as { Kp: number }).Kp = kp;
    if (ki !== undefined) (PID_CONFIG as { Ki: number }).Ki = ki;
    if (kd !== undefined) (PID_CONFIG as { Kd: number }).Kd = kd;

    Logger.info(
      `[StrategicLayer] PID gains updated: Kp=${PID_CONFIG.Kp}, Ki=${PID_CONFIG.Ki}, Kd=${PID_CONFIG.Kd}`
    );
  }

  /**
   * Get debug state
   */
  getDebugState(): Record<string, unknown> {
    return {
      pidState: { ...this.pidState },
      hpHistoryLength: this.hpHistory.length,
      updateCount: this.updateCount,
      config: { ...PID_CONFIG },
    };
  }

  /**
   * Reset state
   */
  reset(): void {
    this.pidState = {
      error: 0,
      integral: 0,
      derivative: 0,
      lastError: 0,
      lastUpdateTime: 0,
      output: 1.0,
      smoothedOutput: 1.0,
    };
    this.hpHistory = [];
    this.updateCount = 0;
    Logger.debug('[StrategicLayer] Reset');
  }
}

// Export singleton
export const StrategicLayer = StrategicLayerClass.getInstance();

// For testing
export function createStrategicLayer(): StrategicLayerClass {
  (StrategicLayerClass as unknown as { instance: null }).instance = null;
  return StrategicLayerClass.getInstance();
}
