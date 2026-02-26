/**
 * PriceMomentumEngine - Real-time Price → Gameplay Feedback System
 *
 * Translates raw price ticks into IMMEDIATE gameplay effects.
 * No neural net intermediary — price moves are felt directly.
 *
 * The engine tracks:
 * - Price velocity (how fast price is moving)
 * - Price acceleration (is movement speeding up or slowing down)
 * - Momentum phase (STAGNANT → DRIFTING → TRENDING → SURGING → CRASHING)
 *
 * Each phase creates unique gameplay feel:
 * - STAGNANT: Calm, slow enemies, fewer spawns — breathing room
 * - TRENDING: Clear direction, moderate pace — flow state territory
 * - SURGING: Intense action, fast enemies — adrenaline
 * - CRASHING: Maximum chaos — screen effects, rapid spawns
 *
 * Position-aware: LONG players benefit from price up, suffer from price down.
 *                 SHORT players are the inverse.
 *
 * GC-Free: Uses pre-allocated Float64Arrays and reusable output object.
 *
 * @see docs/MARKET_DRIVEN_GAMELOOP_V3.md
 */

import { type MarketPosition } from '../../types';
import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';

// =============================================================================
// CONFIGURATION
// =============================================================================

export const PRICE_MOMENTUM_CONFIG = {
  /** Size of the circular price history buffer */
  HISTORY_SIZE: 120, // ~2 minutes of 1s ticks

  /** Number of samples for velocity smoothing (EMA window) */
  VELOCITY_SMOOTHING: 5,

  // --- Phase Thresholds (absolute velocity as % per second) ---
  PHASES: {
    STAGNANT: 0.0001, // < 0.01% per second
    DRIFTING: 0.001, // < 0.10% per second
    TRENDING: 0.005, // < 0.50% per second
    SURGING: 0.01, // < 1.00% per second
    // Above SURGING = CRASHING
  },

  // --- Phase → Gameplay Multipliers ---
  PHASE_MULTIPLIERS: {
    STAGNANT: { speed: 0.7, spawn: 0.5, intensity: 0.1 },
    DRIFTING: { speed: 0.9, spawn: 0.8, intensity: 0.3 },
    TRENDING: { speed: 1.2, spawn: 1.2, intensity: 0.6 },
    SURGING: { speed: 1.6, spawn: 2.0, intensity: 0.85 },
    CRASHING: { speed: 2.5, spawn: 3.5, intensity: 1.0 },
  },

  // --- Position-Aware Feedback ---
  /** Speed reduction when trade is going well (max 20%) */
  FAVORABLE_SPEED_REDUCTION: 0.2,
  /** Speed increase when trade is going badly (max 50%) */
  UNFAVORABLE_SPEED_INCREASE: 0.5,
  /** Extra gem value when trade is favorable (max 50%) */
  FAVORABLE_GEM_BONUS: 0.5,
  /** Gem penalty when trade is unfavorable (max 30%) */
  UNFAVORABLE_GEM_PENALTY: 0.3,

  // --- Leverage Sensitivity Amplification ---
  /** How much leverage amplifies velocity's effect on speed */
  LEVERAGE_SPEED_SENSITIVITY: 0.3,
  /** How much leverage amplifies velocity's effect on spawns */
  LEVERAGE_SPAWN_SENSITIVITY: 0.5,

  // --- Audio BPM Mapping ---
  /** Base BPM for music tempo (STAGNANT) */
  BASE_BPM: 80,
  /** Max BPM for music tempo (CRASHING) */
  MAX_BPM: 180,
} as const;

// =============================================================================
// TYPES
// =============================================================================

export type MomentumPhase =
  | 'STAGNANT'
  | 'DRIFTING'
  | 'TRENDING'
  | 'SURGING'
  | 'CRASHING';

export type PriceDirection = 'up' | 'down' | 'flat';

export interface PriceMomentum {
  /** Price change per second as percentage (can be negative) */
  velocity: number;
  /** Rate of velocity change (is movement accelerating?) */
  acceleration: number;
  /** Absolute value of velocity */
  magnitude: number;
  /** Current price movement direction */
  direction: PriceDirection;
  /** Current momentum classification */
  phase: MomentumPhase;
  /** Market intensity (0-1, smooth) — for visual/audio effects */
  intensity: number;

  // --- Direct Gameplay Multipliers ---
  /** Enemy speed modifier from price momentum */
  enemySpeedMod: number;
  /** Spawn rate modifier from price momentum */
  spawnRateMod: number;
  /** Gem value modifier based on position favorability */
  gemValueMod: number;
  /** Suggested music BPM */
  suggestedBPM: number;
  /** Whether the current price direction is favorable for the player's position */
  isFavorable: boolean;
}

export interface PriceMomentumDebugState {
  phase: MomentumPhase;
  velocity: number;
  acceleration: number;
  magnitude: number;
  direction: PriceDirection;
  intensity: number;
  priceHistoryCount: number;
  position: MarketPosition;
  leverage: number;
  enemySpeedMod: number;
  spawnRateMod: number;
  suggestedBPM: number;
}

// =============================================================================
// ENGINE
// =============================================================================

class PriceMomentumEngineClass {
  private static instance: PriceMomentumEngineClass | null = null;

  // Pre-allocated circular buffers (GC-free)
  private readonly priceBuffer: Float64Array;
  private readonly timeBuffer: Float64Array;
  private bufferIndex: number = 0;
  private bufferCount: number = 0;

  // Smoothed velocity (EMA)
  private smoothedVelocity: number = 0;
  private previousVelocity: number = 0;

  // Smooth intensity (for visual/audio — lerps to avoid jumps)
  private currentIntensity: number = 0;

  // Current player context
  private position: MarketPosition = 'LONG' as MarketPosition;
  private leverage: number = 1;

  // Pre-allocated output object (GC-free hot path)
  private readonly output: PriceMomentum = {
    velocity: 0,
    acceleration: 0,
    magnitude: 0,
    direction: 'flat',
    phase: 'STAGNANT',
    intensity: 0,
    enemySpeedMod: 1.0,
    spawnRateMod: 1.0,
    gemValueMod: 1.0,
    suggestedBPM: PRICE_MOMENTUM_CONFIG.BASE_BPM,
    isFavorable: false,
  };

  private constructor() {
    const size = PRICE_MOMENTUM_CONFIG.HISTORY_SIZE;
    this.priceBuffer = new Float64Array(size);
    this.timeBuffer = new Float64Array(size);

    EventBus.on('gameReset', () => this.reset());
  }

  static getInstance(): PriceMomentumEngineClass {
    return (PriceMomentumEngineClass.instance ??= new PriceMomentumEngineClass());
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  /**
   * Set the player's current position & leverage.
   * Called at game start and on position change.
   */
  setContext(position: MarketPosition, leverage: number): void {
    this.position = position;
    this.leverage = Math.max(1, leverage);
  }

  /**
   * Feed a new price tick. Called every ~1 second from market WebSocket.
   * This is the ONLY allocation-free entry point for the hot path.
   *
   * @param price Current price in USD
   * @param timestampMs Timestamp in milliseconds
   */
  update(price: number, timestampMs: number): PriceMomentum {
    const C = PRICE_MOMENTUM_CONFIG;

    // Write to circular buffer
    this.priceBuffer[this.bufferIndex] = price;
    this.timeBuffer[this.bufferIndex] = timestampMs;
    this.bufferIndex = (this.bufferIndex + 1) % C.HISTORY_SIZE;
    if (this.bufferCount < C.HISTORY_SIZE) this.bufferCount++;

    // Need at least 2 data points for velocity
    if (this.bufferCount < 2) {
      return this.output;
    }

    // Calculate raw velocity (% change per second)
    const rawVelocity = this.computeVelocity(price, timestampMs);

    // EMA smoothing
    const alpha = 2.0 / (C.VELOCITY_SMOOTHING + 1);
    this.smoothedVelocity = this.smoothedVelocity * (1 - alpha) + rawVelocity * alpha;

    // Acceleration
    const acceleration = this.smoothedVelocity - this.previousVelocity;
    this.previousVelocity = this.smoothedVelocity;

    const velocity = this.smoothedVelocity;
    const magnitude = Math.abs(velocity);
    const phase = this.classifyPhase(magnitude);

    // Smooth intensity for visual/audio (avoid jumps)
    const phaseMultipliers = C.PHASE_MULTIPLIERS[phase];
    const targetIntensity = phaseMultipliers.intensity;
    this.currentIntensity = this.currentIntensity * 0.9 + targetIntensity * 0.1;

    // Direction
    const direction: PriceDirection =
      velocity > 0.00001 ? 'up' : velocity < -0.00001 ? 'down' : 'flat';

    // Position favorability
    const isFavorable =
      (this.position === 'LONG' && direction === 'up') ||
      (this.position === 'SHORT' && direction === 'down');
    const isUnfavorable =
      (this.position === 'LONG' && direction === 'down') ||
      (this.position === 'SHORT' && direction === 'up');

    // --- Compute direct gameplay multipliers ---

    // Base multipliers from phase
    let speedMod = phaseMultipliers.speed;
    let spawnMod = phaseMultipliers.spawn;

    // Leverage amplification
    const leverageNorm = Math.log2(this.leverage + 1) / Math.log2(101);
    speedMod *= 1.0 + leverageNorm * C.LEVERAGE_SPEED_SENSITIVITY;
    spawnMod *= 1.0 + leverageNorm * C.LEVERAGE_SPAWN_SENSITIVITY;

    // Position-aware adjustments
    if (isFavorable) {
      speedMod *= 1.0 - C.FAVORABLE_SPEED_REDUCTION * this.currentIntensity;
    } else if (isUnfavorable) {
      speedMod *= 1.0 + C.UNFAVORABLE_SPEED_INCREASE * this.currentIntensity;
    }

    // Gem value based on position
    let gemMod = 1.0;
    if (isFavorable) {
      gemMod = 1.0 + C.FAVORABLE_GEM_BONUS * this.currentIntensity;
    } else if (isUnfavorable) {
      gemMod = 1.0 - C.UNFAVORABLE_GEM_PENALTY * this.currentIntensity;
    }

    // BPM suggestion
    const bpmRange = C.MAX_BPM - C.BASE_BPM;
    const suggestedBPM = C.BASE_BPM + this.currentIntensity * bpmRange;

    // Write to pre-allocated output (zero allocation)
    this.output.velocity = velocity;
    this.output.acceleration = acceleration;
    this.output.magnitude = magnitude;
    this.output.direction = direction;
    this.output.phase = phase;
    this.output.intensity = this.currentIntensity;
    this.output.enemySpeedMod = clamp(speedMod, 0.4, 4.0);
    this.output.spawnRateMod = clamp(spawnMod, 0.3, 5.0);
    this.output.gemValueMod = clamp(gemMod, 0.5, 2.0);
    this.output.suggestedBPM = Math.round(suggestedBPM);
    this.output.isFavorable = isFavorable;

    // Emit for other systems (EventBus — throttled naturally by ~1s market tick)
    EventBus.emit('priceMomentumUpdate', {
      phase,
      intensity: this.currentIntensity,
      direction,
      suggestedBPM: this.output.suggestedBPM,
      isFavorable,
    });

    return this.output;
  }

  /**
   * Get the latest momentum state. Zero allocation — returns cached reference.
   */
  getLatest(): PriceMomentum {
    return this.output;
  }

  /**
   * Get current intensity (0-1) for visual/audio systems.
   */
  getIntensity(): number {
    return this.currentIntensity;
  }

  /**
   * Get current phase.
   */
  getPhase(): MomentumPhase {
    return this.output.phase;
  }

  /**
   * Get debug state for admin dashboard.
   */
  getDebugState(): PriceMomentumDebugState {
    return {
      phase: this.output.phase,
      velocity: this.output.velocity,
      acceleration: this.output.acceleration,
      magnitude: this.output.magnitude,
      direction: this.output.direction,
      intensity: this.currentIntensity,
      priceHistoryCount: this.bufferCount,
      position: this.position,
      leverage: this.leverage,
      enemySpeedMod: this.output.enemySpeedMod,
      spawnRateMod: this.output.spawnRateMod,
      suggestedBPM: this.output.suggestedBPM,
    };
  }

  reset(): void {
    this.bufferIndex = 0;
    this.bufferCount = 0;
    this.smoothedVelocity = 0;
    this.previousVelocity = 0;
    this.currentIntensity = 0;
    this.position = 'LONG' as MarketPosition;
    this.leverage = 1;

    // Reset output
    this.output.velocity = 0;
    this.output.acceleration = 0;
    this.output.magnitude = 0;
    this.output.direction = 'flat';
    this.output.phase = 'STAGNANT';
    this.output.intensity = 0;
    this.output.enemySpeedMod = 1.0;
    this.output.spawnRateMod = 1.0;
    this.output.gemValueMod = 1.0;
    this.output.suggestedBPM = PRICE_MOMENTUM_CONFIG.BASE_BPM;
    this.output.isFavorable = false;

    Logger.info('[PriceMomentumEngine] Reset');
  }

  static resetForTesting(): void {
    if (this.instance) {
      this.instance.reset();
      this.instance = null;
    }
  }

  // ---------------------------------------------------------------------------
  // PRIVATE METHODS
  // ---------------------------------------------------------------------------

  /**
   * Compute velocity as % change per second from the most recent ticks.
   * Uses the last N samples for a short-term rolling average.
   */
  private computeVelocity(currentPrice: number, currentTime: number): number {
    // Look back a few ticks for stability
    const lookback = Math.min(5, this.bufferCount - 1);
    if (lookback < 1) return 0;

    // Get the price from `lookback` ticks ago
    const prevIdx =
      (this.bufferIndex - 1 - lookback + PRICE_MOMENTUM_CONFIG.HISTORY_SIZE) %
      PRICE_MOMENTUM_CONFIG.HISTORY_SIZE;
    const prevPrice = this.priceBuffer[prevIdx]!;
    const prevTime = this.timeBuffer[prevIdx]!;

    if (prevPrice <= 0 || prevTime <= 0) return 0;

    const timeDeltaS = (currentTime - prevTime) / 1000;
    if (timeDeltaS <= 0) return 0;

    // Price change as fraction, then per second
    const priceChange = (currentPrice - prevPrice) / prevPrice;
    return priceChange / timeDeltaS;
  }

  /**
   * Classify the current magnitude into a momentum phase.
   */
  private classifyPhase(magnitude: number): MomentumPhase {
    const P = PRICE_MOMENTUM_CONFIG.PHASES;
    if (magnitude < P.STAGNANT) return 'STAGNANT';
    if (magnitude < P.DRIFTING) return 'DRIFTING';
    if (magnitude < P.TRENDING) return 'TRENDING';
    if (magnitude < P.SURGING) return 'SURGING';
    return 'CRASHING';
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// =============================================================================
// EXPORTS
// =============================================================================

export const PriceMomentumEngine = PriceMomentumEngineClass.getInstance();
