/**
 * LeverageEngine - Dynamic Leverage Scaling System
 *
 * Replaces the static LEVERAGE_TIERS lookup table with continuous,
 * volatility-aware scaling functions. Leverage is the CORE risk/reward
 * mechanic: higher leverage = faster leveling + more rewards BUT
 * significantly more danger.
 *
 * Key design principles:
 * - Continuous curves (no discrete tier jumps)
 * - Volatility amplification (high ATR × high leverage = exponential danger)
 * - PnL-aware rewards (winning trade = more gems, losing = more pressure)
 * - GC-free: Pre-allocated output object, no heap allocation in hot path
 *
 * @see docs/MARKET_DRIVEN_GAMELOOP_V3.md
 */

import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';

// =============================================================================
// CONFIGURATION
// =============================================================================

export const LEVERAGE_ENGINE_CONFIG = {
  // --- Scaling Exponents ---
  /** Logarithmic base for normalizing leverage to 0-1 range */
  NORM_BASE: 101, // log2(leverage+1) / log2(101)

  // --- Damage Taken (Fragility) Scaling ---
  // Design spec target: 1x→1.0, 5x→1.12, 20x→1.35, 50x→1.75, 100x→2.30
  /** Base damage amplification at max leverage (before volatility) */
  DAMAGE_BASE_AMP: 1.3,
  /** How much volatility amplifies damage on top of leverage */
  VOLATILITY_DAMAGE_AMP: 0.15,
  /** Max damage reduction when PnL is strongly positive (15%) */
  POSITIVE_PNL_DAMAGE_SHIELD: 0.15,

  // --- XP / Level Speed Scaling ---
  // Design spec target: 1x→1.0, 100x→2.20
  /** XP gain coefficient (sqrt-based for diminishing returns) */
  XP_COEFFICIENT: 0.13,

  // --- Spawn Rate Scaling ---
  /** Base spawn rate amplification at max leverage */
  SPAWN_BASE_AMP: 2.0,
  /** Extra spawn pressure when PnL is negative */
  NEGATIVE_PNL_SPAWN_AMP: 1.15,

  // --- Enemy Speed Scaling ---
  /** Base enemy speed amplification at max leverage */
  SPEED_BASE_AMP: 1.0,

  // --- Enemy HP Scaling ---
  /** Base enemy HP amplification at max leverage */
  HP_BASE_AMP: 0.8,

  // --- Enemy Damage Scaling ---
  /** Base enemy damage amplification at max leverage */
  ENEMY_DAMAGE_BASE_AMP: 1.2,

  // --- Gem/Reward Scaling ---
  // Design spec target: 1x→1.0, 100x→2.20
  /** Gem value per leverage point (linear) */
  GEM_PER_LEVERAGE: 0.012,

  // --- Difficulty Ramp Speed ---
  /** How much faster difficulty escalates over time at high leverage */
  RAMP_SPEED_COEFFICIENT: 0.3,

  // --- Hard Limits (Safety Rails, aligned with design spec) ---
  MAX_DAMAGE_TAKEN: 2.3,
  MAX_XP_GAIN: 2.5,
  MAX_SPAWN_RATE: 4.0,
  MAX_ENEMY_SPEED: 2.0,
  MAX_ENEMY_HP: 2.5,
  MAX_ENEMY_DAMAGE: 2.5,
  MAX_GEM_VALUE: 2.5,
  MAX_RAMP_SPEED: 3.0,
} as const;

// =============================================================================
// TYPES
// =============================================================================

export interface LeverageMultipliers {
  /** How much MORE damage the player receives (1.0 = normal) */
  damageTaken: number;
  /** How much FASTER the player gains XP/levels (1.0 = normal) */
  xpGain: number;
  /** Enemy spawn rate multiplier (1.0 = normal) */
  spawnRate: number;
  /** Enemy movement speed multiplier (1.0 = normal) */
  enemySpeed: number;
  /** Enemy health multiplier (1.0 = normal) */
  enemyHP: number;
  /** Enemy attack damage multiplier (1.0 = normal) */
  enemyDamage: number;
  /** Gem/reward value multiplier (1.0 = normal) */
  gemValue: number;
  /** How fast difficulty ramps over time (1.0 = normal) */
  difficultyRampSpeed: number;
  /** Raw normalized leverage (0 to 1) for external use */
  leverageNorm: number;
}

export interface LeverageEngineDebugState {
  leverage: number;
  volatility: number;
  pnlPercent: number;
  leverageNorm: number;
  multipliers: LeverageMultipliers;
}

// =============================================================================
// ENGINE
// =============================================================================

class LeverageEngineClass {
  private static instance: LeverageEngineClass | null = null;

  // Current state
  private leverage: number = 1;
  private volatility: number = 0; // ATR percent
  private pnlPercent: number = 0; // Current PnL as fraction (-1 to +1)

  // Pre-allocated output (GC-free hot path)
  private readonly output: LeverageMultipliers = {
    damageTaken: 1.0,
    xpGain: 1.0,
    spawnRate: 1.0,
    enemySpeed: 1.0,
    enemyHP: 1.0,
    enemyDamage: 1.0,
    gemValue: 1.0,
    difficultyRampSpeed: 1.0,
    leverageNorm: 0,
  };

  private constructor() {
    // Listen for leverage changes from game start
    EventBus.on('gameStart', data => {
      if (data.leverage !== undefined) {
        this.setLeverage(data.leverage);
      }
    });
    EventBus.on('gameReset', () => this.reset());
  }

  static getInstance(): LeverageEngineClass {
    return (LeverageEngineClass.instance ??= new LeverageEngineClass());
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  /**
   * Set the active leverage for this session.
   * Called once at game start, or when leverage changes mid-game.
   */
  setLeverage(leverage: number): void {
    this.leverage = Math.max(1, Math.min(125, leverage));
    Logger.info(`[LeverageEngine] Leverage set to ${this.leverage}x`);
  }

  /**
   * Update market inputs. Called every market tick (~1s).
   * These feed into the dynamic multipliers.
   */
  updateMarketState(atrPercent: number, pnlPercent: number): void {
    this.volatility = Math.max(0, atrPercent);
    this.pnlPercent = pnlPercent;
  }

  /**
   * Get current multipliers. Returns a pre-allocated object reference.
   * Safe to call 60fps — zero allocation.
   */
  getMultipliers(): LeverageMultipliers {
    const C = LEVERAGE_ENGINE_CONFIG;
    const L = this.leverage;
    const V = this.volatility;
    const pnl = this.pnlPercent;

    // Normalize leverage to 0-1 range using log2 curve
    // 1x → 0, 10x → 0.48, 50x → 0.84, 100x → 1.0
    const norm = (Math.log2(L + 1) - 1) / (Math.log2(C.NORM_BASE) - 1);

    // --- DAMAGE TAKEN (Fragility) ---
    // Base: 1.0 at 1x, up to 2.3 at 100x (design spec)
    // Volatility amplifies moderately, positive PnL provides small shield
    const baseDamage = 1.0 + norm * C.DAMAGE_BASE_AMP;
    const volAmp = 1.0 + V * C.VOLATILITY_DAMAGE_AMP * 100; // V is typically 0.001-0.05
    const pnlShield =
      pnl > 0 ? 1.0 - Math.min(pnl, 1) * C.POSITIVE_PNL_DAMAGE_SHIELD : 1.0;
    const pnlPressure = pnl < 0 ? 1.0 + Math.abs(pnl) * 0.5 : 1.0;

    this.output.damageTaken = clamp(
      baseDamage * Math.min(volAmp, 2.0) * pnlShield * pnlPressure,
      1.0,
      C.MAX_DAMAGE_TAKEN
    );

    // --- XP GAIN ---
    // sqrt(L) based for diminishing returns (design spec: 1x→1.0, 100x→2.17)
    this.output.xpGain = clamp(
      1.0 + (Math.sqrt(L) - 1) * C.XP_COEFFICIENT,
      1.0,
      C.MAX_XP_GAIN
    );

    // --- SPAWN RATE ---
    // Linear with leverage norm, extra pressure when losing
    const spawnPnlBoost =
      pnl < 0 ? 1.0 + Math.abs(pnl) * (C.NEGATIVE_PNL_SPAWN_AMP - 1) : 1.0;
    this.output.spawnRate = clamp(
      (0.8 + norm * C.SPAWN_BASE_AMP) * spawnPnlBoost,
      0.5,
      C.MAX_SPAWN_RATE
    );

    // --- ENEMY SPEED ---
    // Moderate scaling — too fast enemies aren't fun
    this.output.enemySpeed = clamp(
      0.8 + norm * C.SPEED_BASE_AMP,
      0.5,
      C.MAX_ENEMY_SPEED
    );

    // --- ENEMY HP ---
    this.output.enemyHP = clamp(0.8 + norm * C.HP_BASE_AMP, 0.5, C.MAX_ENEMY_HP);

    // --- ENEMY DAMAGE ---
    this.output.enemyDamage = clamp(
      0.8 + norm * C.ENEMY_DAMAGE_BASE_AMP,
      0.5,
      C.MAX_ENEMY_DAMAGE
    );

    // --- GEM VALUE ---
    // Higher leverage = bigger rewards (risk/reward payoff)
    // Positive PnL boosts gems further (winning streak)
    const pnlGemBoost = 1.0 + Math.max(0, pnl) * 0.5;
    this.output.gemValue = clamp(
      (1.0 + (L - 1) * C.GEM_PER_LEVERAGE) * pnlGemBoost,
      1.0,
      C.MAX_GEM_VALUE
    );

    // --- DIFFICULTY RAMP SPEED ---
    // Higher leverage = difficulty escalates faster over time
    this.output.difficultyRampSpeed = clamp(
      1.0 + norm * C.RAMP_SPEED_COEFFICIENT * 3.0,
      1.0,
      C.MAX_RAMP_SPEED
    );

    this.output.leverageNorm = norm;

    return this.output;
  }

  /**
   * Get the current leverage value.
   */
  getLeverage(): number {
    return this.leverage;
  }

  /**
   * Get debug state for admin dashboard.
   */
  getDebugState(): LeverageEngineDebugState {
    return {
      leverage: this.leverage,
      volatility: this.volatility,
      pnlPercent: this.pnlPercent,
      leverageNorm: this.output.leverageNorm,
      multipliers: { ...this.output },
    };
  }

  reset(): void {
    this.leverage = 1;
    this.volatility = 0;
    this.pnlPercent = 0;

    this.output.damageTaken = 1.0;
    this.output.xpGain = 1.0;
    this.output.spawnRate = 1.0;
    this.output.enemySpeed = 1.0;
    this.output.enemyHP = 1.0;
    this.output.enemyDamage = 1.0;
    this.output.gemValue = 1.0;
    this.output.difficultyRampSpeed = 1.0;
    this.output.leverageNorm = 0;
  }

  static resetForTesting(): void {
    if (this.instance) {
      this.instance.reset();
      this.instance = null;
    }
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

export const LeverageEngine = LeverageEngineClass.getInstance();
