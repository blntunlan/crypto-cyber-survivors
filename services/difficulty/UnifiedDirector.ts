/**
 * UnifiedDirector.ts - AI Director V2
 *
 * Market-Driven Flow State System
 *
 * Replaces: AIDirector.ts + GameMasterBrain.ts (two separate neural networks)
 * with a single unified brain for all difficulty decisions.
 *
 * Core Principles:
 * 1. Flow State Target: HP 35%-65% sweet spot
 * 2. Market-Driven: RSI, ATR, Volume → Game tempo
 * 3. No Wave Phases: Dynamic difficulty, not time-based cycles
 * 4. Grace Period: First 30s gradual market influence
 * 5. Mercy System: Emergency help when struggling
 */

import * as SynapticLib from 'synaptic';
import { Logger } from '../system/Logger';
import { EventBus } from '../core/EventBus';

// ESM/CJS compatibility
const SynapticModule = SynapticLib as Record<string, unknown>;
const SynapticDefault = SynapticModule.default as Record<string, unknown> | undefined;
const Architect = SynapticModule.Architect ?? SynapticDefault?.Architect;
const NetworkLib = SynapticModule.Network ?? SynapticDefault?.Network;

// ============================================================================
// CONFIGURATION
// ============================================================================

export const UNIFIED_DIRECTOR_CONFIG = {
  // Grace Period (first 30 seconds)
  GRACE_PERIOD_SECONDS: 30,
  GRACE_PHASES: [
    { end: 10, marketInfluence: 0, difficulty: 0.3 }, // Tutorial feel
    { end: 20, marketInfluence: 0.25, difficulty: 0.5 }, // Warming up
    { end: 30, marketInfluence: 0.5, difficulty: 0.7 }, // Getting ready
  ],

  // Flow State HP Band
  FLOW_STATE: {
    HP_MIN: 35, // Below = struggling
    HP_IDEAL: 50, // Target HP
    HP_MAX: 65, // Above = too easy
    KILL_RATE_MIN: 8, // Kills per minute
    KILL_RATE_IDEAL: 15,
    KILL_RATE_MAX: 25,
  },

  // Panic Detection
  PANIC_DASH_THRESHOLD: 5, // Dashes in 10 seconds = panic
  PANIC_LOW_HP_DURATION: 10, // Seconds below 30% HP

  // PnL Thresholds
  PNL: {
    POSITIVE: 0.02, // %2+ = winning
    NEGATIVE_MILD: -0.05, // %-5 = slight loss
    NEGATIVE_SEVERE: -0.15, // %-15 = significant loss
    LIQUIDATION_ZONE: -0.25, // %-25 = danger zone
  },

  // Whale Volume Thresholds
  WHALE_VOLUME: {
    BABY: 0.6, // %60+ volume
    NORMAL: 0.75, // %75+ volume
    GIGA: 0.9, // %90+ volume
  },

  // Mercy System
  MERCY: {
    TRIGGER_HP: 20, // HP% to trigger mercy
    DIFFICULTY_REDUCTION: 0.3, // -30% difficulty
    DURATION_MS: 5000, // 5 seconds mercy window
    COOLDOWN_MS: 30000, // 30 seconds between mercy windows
  },

  // Update Interval
  BRAIN_UPDATE_MS: 500,
};

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Unified Director Inputs (18 sensors)
 * All values normalized to 0-1 range (except pnl which is -1 to 1)
 */
export interface UnifiedInputs {
  // Market Data (6)
  rsi: number; // RSI / 100
  rsiMomentum: number; // RSI change rate (-1 to 1, normalized)
  atrPercent: number; // ATR% (volatility)
  volumeNorm: number; // Normalized volume
  priceChange: number; // Recent price change (-1 to 1)
  trendStrength: number; // 0=bear, 0.5=sideways, 1=bull

  // Player State (6)
  hpPercent: number; // Current HP / Max HP
  pnlRatio: number; // PnL percentage (-1 to 1)
  killsPerMin: number; // Recent kills normalized
  dashFrequency: number; // Dash usage frequency (panic indicator)
  playerDPS: number; // Damage per second normalized
  damageTakenRate: number; // Recent damage taken normalized

  // Game Context (4)
  elapsedMinutes: number; // Game time in minutes / 10
  playerLevel: number; // Level / 30
  leverage: number; // Leverage / 100
  gemPileup: number; // Active gems / 200 (overwhelm indicator)

  // Flow Metrics (2)
  engagementScore: number; // 0-1 (calculated from activity)
  frustrationScore: number; // 0-1 (calculated from panic metrics)
}

/**
 * Unified Director Outputs (14 decisions)
 */
export interface UnifiedOutputs {
  // Enemy Parameters (5)
  spawnRate: number; // Multiplier (0.3 - 2.5)
  enemySpeed: number; // Multiplier (0.6 - 1.8)
  enemyHP: number; // Multiplier (0.7 - 2.0)
  enemyDamage: number; // Multiplier (0.7 - 2.0)
  enemyVariety: number; // 0-1 (how diverse enemy types)

  // Loot & Economy (3)
  gemDropRate: number; // Multiplier (0.4 - 1.5)
  xpMultiplier: number; // Multiplier (0.6 - 1.4)
  buffSpawnRate: number; // Multiplier (0.5 - 1.5)

  // Special Events (3)
  whaleProbability: number; // 0-1
  marketEventChance: number; // 0-1
  eliteSpawnChance: number; // 0-1

  // Feel & Flow (3)
  chaosLevel: number; // 0-1 (randomness)
  mercyFactor: number; // 0-1 (help when struggling)
  pressureIntensity: number; // 0-1 (ramp speed)
}

/**
 * Output ranges for neural network mapping
 */
const OUTPUT_RANGES: Record<keyof UnifiedOutputs, { min: number; max: number }> = {
  spawnRate: { min: 0.3, max: 2.5 },
  enemySpeed: { min: 0.6, max: 1.8 },
  enemyHP: { min: 0.7, max: 2.0 },
  enemyDamage: { min: 0.7, max: 2.0 },
  enemyVariety: { min: 0, max: 1 },
  gemDropRate: { min: 0.4, max: 1.5 },
  xpMultiplier: { min: 0.6, max: 1.4 },
  buffSpawnRate: { min: 0.5, max: 1.5 },
  whaleProbability: { min: 0, max: 1 },
  marketEventChance: { min: 0, max: 1 },
  eliteSpawnChance: { min: 0, max: 1 },
  chaosLevel: { min: 0, max: 1 },
  mercyFactor: { min: 0, max: 1 },
  pressureIntensity: { min: 0, max: 1 },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mapOutput(value: number, key: keyof typeof OUTPUT_RANGES): number {
  const range = OUTPUT_RANGES[key];
  return range.min + clamp(value, 0, 1) * (range.max - range.min);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Calculate grace period influence (0 = full grace, 1 = full market)
 */
function getGraceInfluence(elapsedSeconds: number): {
  marketInfluence: number;
  baseDifficulty: number;
} {
  const cfg = UNIFIED_DIRECTOR_CONFIG;

  if (elapsedSeconds >= cfg.GRACE_PERIOD_SECONDS) {
    return { marketInfluence: 1, baseDifficulty: 1 };
  }

  // Find current phase
  for (const phase of cfg.GRACE_PHASES) {
    if (elapsedSeconds <= phase.end) {
      return {
        marketInfluence: phase.marketInfluence,
        baseDifficulty: phase.difficulty,
      };
    }
  }

  return { marketInfluence: 1, baseDifficulty: 1 };
}

/**
 * Calculate frustration score from player metrics
 */
function calculateFrustrationScore(
  dashFrequency: number,
  damageTakenRate: number,
  hpPercent: number,
  timeBelowHP30: number
): number {
  const dashPanic = clamp(dashFrequency / 0.5, 0, 1); // 0.5 = 5 dashes in 10s
  const damageRate = clamp(damageTakenRate, 0, 1);
  const lowHPFactor = hpPercent < 30 ? clamp(timeBelowHP30 / 10, 0, 1) : 0;

  return clamp(dashPanic * 0.3 + damageRate * 0.5 + lowHPFactor * 0.2, 0, 1);
}

/**
 * Calculate engagement score
 */
function calculateEngagementScore(
  killsPerMin: number,
  playerDPS: number,
  dashFrequency: number,
  hpPercent: number
): number {
  const cfg = UNIFIED_DIRECTOR_CONFIG.FLOW_STATE;

  // Kill rate factor
  const killFactor =
    killsPerMin >= cfg.KILL_RATE_MIN && killsPerMin <= cfg.KILL_RATE_MAX ? 1 : 0.5;

  // HP in sweet spot
  const hpFactor = hpPercent >= cfg.HP_MIN && hpPercent <= cfg.HP_MAX ? 1 : 0.6;

  // Activity level
  const activityFactor = clamp((playerDPS + dashFrequency * 0.5) / 1.5, 0, 1);

  return clamp(killFactor * 0.4 + hpFactor * 0.4 + activityFactor * 0.2, 0, 1);
}

// ============================================================================
// UNIFIED DIRECTOR CLASS
// ============================================================================

class UnifiedDirectorClass {
  private static instance: UnifiedDirectorClass | null = null;

  // Neural Network: 18 inputs -> 32 hidden -> 32 hidden -> 14 outputs
  private net!: { activate: (inputs: number[]) => number[] };
  private brainLoaded: boolean = false;
  private enabled: boolean = true;

  // Update throttling
  private lastUpdate: number = 0;

  // Current outputs
  private currentOutputs: UnifiedOutputs = this.getDefaultOutputs();
  private previousOutputs: UnifiedOutputs = this.getDefaultOutputs();

  // State tracking
  private mercyActiveUntil: number = 0;
  private lastMercyTime: number = 0;
  private timeBelowHP30: number = 0;
  private lastHPCheck: number = 0;

  // Smoothing
  private smoothingFactor: number = 0.3;

  private constructor() {
    this.initNetwork();
  }

  static getInstance(): UnifiedDirectorClass {
    return (UnifiedDirectorClass.instance ??= new UnifiedDirectorClass());
  }

  // --------------------------------------------------------------------------
  // NETWORK MANAGEMENT
  // --------------------------------------------------------------------------

  private initNetwork(): void {
    try {
      // 18 inputs -> 32 hidden -> 32 hidden -> 14 outputs (deeper network)
      this.net = new Architect.Perceptron(18, 32, 32, 14);
      this.brainLoaded = false;
      Logger.info('[UnifiedDirector] Neural Network initialized (18-32-32-14)');
    } catch (error) {
      Logger.error('[UnifiedDirector] Failed to initialize:', error);
      this.enabled = false;
    }
  }

  public loadBrain(brainJson: unknown): boolean {
    try {
      this.net = NetworkLib.fromJSON(brainJson);
      this.brainLoaded = true;
      Logger.info('[UnifiedDirector] Pre-trained brain loaded');
      return true;
    } catch (error) {
      Logger.warn('[UnifiedDirector] Load failed, using random:', error);
      this.initNetwork();
      return false;
    }
  }

  public isUsingTrainedBrain(): boolean {
    return this.brainLoaded;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public reset(): void {
    this.currentOutputs = this.getDefaultOutputs();
    this.previousOutputs = this.getDefaultOutputs();
    this.mercyActiveUntil = 0;
    this.lastMercyTime = 0;
    this.timeBelowHP30 = 0;
    this.lastHPCheck = 0;
    this.lastUpdate = 0;
    Logger.info('[UnifiedDirector] State reset');
  }

  // --------------------------------------------------------------------------
  // MAIN UPDATE
  // --------------------------------------------------------------------------

  public update(inputs: UnifiedInputs, gameTimeMs: number): void {
    if (!this.enabled) return;

    const cfg = UNIFIED_DIRECTOR_CONFIG;

    // Throttle updates
    if (gameTimeMs - this.lastUpdate < cfg.BRAIN_UPDATE_MS) return;
    this.lastUpdate = gameTimeMs;

    const elapsedSeconds = gameTimeMs / 1000;

    // Track time below 30% HP
    if (inputs.hpPercent < 0.3) {
      this.timeBelowHP30 += (gameTimeMs - this.lastHPCheck) / 1000;
    } else {
      this.timeBelowHP30 = 0;
    }
    this.lastHPCheck = gameTimeMs;

    // Calculate derived metrics
    const frustrationScore = calculateFrustrationScore(
      inputs.dashFrequency,
      inputs.damageTakenRate,
      inputs.hpPercent * 100,
      this.timeBelowHP30
    );

    const engagementScore = calculateEngagementScore(
      inputs.killsPerMin * 30, // Denormalize to actual kills/min
      inputs.playerDPS,
      inputs.dashFrequency,
      inputs.hpPercent * 100
    );

    // Update inputs with calculated scores
    const finalInputs = {
      ...inputs,
      engagementScore,
      frustrationScore,
    };

    // Get grace period influence
    const { marketInfluence, baseDifficulty } = getGraceInfluence(elapsedSeconds);

    // Prepare 18 input values for neural network
    const inputArray = [
      finalInputs.rsi,
      (finalInputs.rsiMomentum + 1) / 2, // Normalize -1..1 to 0..1
      finalInputs.atrPercent,
      finalInputs.volumeNorm,
      (finalInputs.priceChange + 1) / 2, // Normalize -1..1 to 0..1
      finalInputs.trendStrength,
      finalInputs.hpPercent,
      (finalInputs.pnlRatio + 1) / 2, // Normalize -1..1 to 0..1
      finalInputs.killsPerMin,
      finalInputs.dashFrequency,
      finalInputs.playerDPS,
      finalInputs.damageTakenRate,
      finalInputs.elapsedMinutes,
      finalInputs.playerLevel,
      finalInputs.leverage,
      finalInputs.gemPileup,
      engagementScore,
      frustrationScore,
    ];

    // Neural network forward pass
    const raw = this.net.activate(inputArray);

    // Map raw outputs to game values
    let newOutputs: UnifiedOutputs = {
      spawnRate: mapOutput(raw[0] ?? 0.5, 'spawnRate'),
      enemySpeed: mapOutput(raw[1] ?? 0.5, 'enemySpeed'),
      enemyHP: mapOutput(raw[2] ?? 0.5, 'enemyHP'),
      enemyDamage: mapOutput(raw[3] ?? 0.5, 'enemyDamage'),
      enemyVariety: mapOutput(raw[4] ?? 0.5, 'enemyVariety'),
      gemDropRate: mapOutput(raw[5] ?? 0.5, 'gemDropRate'),
      xpMultiplier: mapOutput(raw[6] ?? 0.5, 'xpMultiplier'),
      buffSpawnRate: mapOutput(raw[7] ?? 0.5, 'buffSpawnRate'),
      whaleProbability: mapOutput(raw[8] ?? 0.5, 'whaleProbability'),
      marketEventChance: mapOutput(raw[9] ?? 0.5, 'marketEventChance'),
      eliteSpawnChance: mapOutput(raw[10] ?? 0.5, 'eliteSpawnChance'),
      chaosLevel: mapOutput(raw[11] ?? 0.5, 'chaosLevel'),
      mercyFactor: mapOutput(raw[12] ?? 0.5, 'mercyFactor'),
      pressureIntensity: mapOutput(raw[13] ?? 0.5, 'pressureIntensity'),
    };

    // Apply modifiers in order
    newOutputs = this.applyGracePeriod(newOutputs, marketInfluence, baseDifficulty);
    newOutputs = this.applyFlowStateCorrections(newOutputs, finalInputs);
    newOutputs = this.applyPnLModifiers(newOutputs, finalInputs.pnlRatio);
    newOutputs = this.applyMercySystem(newOutputs, finalInputs, gameTimeMs);

    // Smooth transition
    this.previousOutputs = { ...this.currentOutputs };
    this.currentOutputs = this.smoothOutputs(this.previousOutputs, newOutputs);

    // Emit update event
    EventBus.emit('difficultyUpdated', {
      outputs: this.currentOutputs,
      engagement: engagementScore,
      frustration: frustrationScore,
    });
  }

  // --------------------------------------------------------------------------
  // MODIFIERS
  // --------------------------------------------------------------------------

  /**
   * Apply grace period blending
   */
  private applyGracePeriod(
    outputs: UnifiedOutputs,
    marketInfluence: number,
    baseDifficulty: number
  ): UnifiedOutputs {
    if (marketInfluence >= 1) return outputs;

    const neutral = this.getDefaultOutputs();

    // Blend outputs toward neutral based on grace period
    const blend = (val: number, neutralVal: number) =>
      lerp(neutralVal, val, marketInfluence);

    return {
      ...outputs,
      spawnRate: blend(outputs.spawnRate, neutral.spawnRate * baseDifficulty),
      enemySpeed: blend(outputs.enemySpeed, neutral.enemySpeed * baseDifficulty),
      enemyHP: blend(outputs.enemyHP, neutral.enemyHP * baseDifficulty),
      enemyDamage: blend(outputs.enemyDamage, neutral.enemyDamage * baseDifficulty),
      chaosLevel: blend(outputs.chaosLevel, neutral.chaosLevel * 0.5),
      pressureIntensity: blend(outputs.pressureIntensity, 0.3),
      // No whales/elites during grace
      whaleProbability: outputs.whaleProbability * marketInfluence,
      eliteSpawnChance: outputs.eliteSpawnChance * marketInfluence,
    };
  }

  /**
   * Flow state corrections - maintain HP sweet spot
   */
  private applyFlowStateCorrections(
    outputs: UnifiedOutputs,
    inputs: UnifiedInputs
  ): UnifiedOutputs {
    const cfg = UNIFIED_DIRECTOR_CONFIG.FLOW_STATE;
    const hp = inputs.hpPercent * 100;
    const result = { ...outputs };

    if (hp > cfg.HP_MAX) {
      // Too comfortable - increase pressure
      const excess = (hp - cfg.HP_MAX) / (100 - cfg.HP_MAX);
      result.spawnRate *= 1 + excess * 0.5;
      result.enemySpeed *= 1 + excess * 0.2;
      result.gemDropRate *= 1 - excess * 0.3;
      result.chaosLevel = clamp(result.chaosLevel + excess * 0.3, 0, 1);
    } else if (hp < cfg.HP_MIN) {
      // Struggling - reduce pressure
      const deficit = (cfg.HP_MIN - hp) / cfg.HP_MIN;
      result.spawnRate *= 1 - deficit * 0.4;
      result.enemyDamage *= 1 - deficit * 0.3;
      result.gemDropRate *= 1 + deficit * 0.4;
      result.mercyFactor = clamp(result.mercyFactor + deficit * 0.5, 0, 1);
    }

    // Check engagement - if too low, add variety
    if (inputs.engagementScore < 0.4) {
      result.enemyVariety = clamp(result.enemyVariety + 0.2, 0, 1);
      result.marketEventChance = clamp(result.marketEventChance + 0.1, 0, 1);
    }

    return result;
  }

  /**
   * PnL-based modifiers
   */
  private applyPnLModifiers(outputs: UnifiedOutputs, pnl: number): UnifiedOutputs {
    const cfg = UNIFIED_DIRECTOR_CONFIG.PNL;
    const result = { ...outputs };

    if (pnl >= cfg.POSITIVE) {
      // Winning - maintain flow, reduce chaos
      result.chaosLevel *= 0.7;
      result.pressureIntensity *= 0.85;
    } else if (pnl >= cfg.NEGATIVE_MILD) {
      // Slight loss - small ramp
      const severity = Math.abs(pnl) / Math.abs(cfg.NEGATIVE_MILD);
      result.chaosLevel *= 1 + severity * 0.2;
      result.spawnRate *= 1 + severity * 0.1;
    } else if (pnl >= cfg.NEGATIVE_SEVERE) {
      // Significant loss - notable ramp
      const severity =
        (Math.abs(pnl) - Math.abs(cfg.NEGATIVE_MILD)) /
        (Math.abs(cfg.NEGATIVE_SEVERE) - Math.abs(cfg.NEGATIVE_MILD));
      result.chaosLevel *= 1.2 + severity * 0.3;
      result.spawnRate *= 1.1 + severity * 0.2;
      result.enemySpeed *= 1 + severity * 0.15;
      result.gemDropRate *= 0.9 - severity * 0.2;
    } else {
      // Near liquidation - high pressure but some mercy
      result.chaosLevel = clamp(result.chaosLevel * 1.5, 0, 1);
      result.pressureIntensity = clamp(result.pressureIntensity * 1.3, 0, 1);
      result.mercyFactor = clamp(result.mercyFactor + 0.2, 0, 1);
    }

    return result;
  }

  /**
   * Emergency mercy system
   */
  private applyMercySystem(
    outputs: UnifiedOutputs,
    inputs: UnifiedInputs,
    gameTimeMs: number
  ): UnifiedOutputs {
    const cfg = UNIFIED_DIRECTOR_CONFIG.MERCY;
    const hp = inputs.hpPercent * 100;

    // Check if mercy is active
    if (gameTimeMs < this.mercyActiveUntil) {
      return {
        ...outputs,
        spawnRate: outputs.spawnRate * (1 - cfg.DIFFICULTY_REDUCTION),
        enemyDamage: outputs.enemyDamage * (1 - cfg.DIFFICULTY_REDUCTION),
        enemySpeed: outputs.enemySpeed * 0.9,
        mercyFactor: 1,
      };
    }

    // Check if mercy should trigger
    const canTriggerMercy =
      hp <= cfg.TRIGGER_HP && gameTimeMs - this.lastMercyTime > cfg.COOLDOWN_MS;

    if (canTriggerMercy && inputs.frustrationScore > 0.6) {
      this.mercyActiveUntil = gameTimeMs + cfg.DURATION_MS;
      this.lastMercyTime = gameTimeMs;

      Logger.info('[UnifiedDirector] Mercy window activated');
      EventBus.emit('gameNotification', {
        type: 'info',
        message: 'Mercy activated!',
        duration: 2000,
      });
    }

    return outputs;
  }

  /**
   * Smooth output transitions
   */
  private smoothOutputs(prev: UnifiedOutputs, next: UnifiedOutputs): UnifiedOutputs {
    const t = this.smoothingFactor;
    return {
      spawnRate: lerp(prev.spawnRate, next.spawnRate, t),
      enemySpeed: lerp(prev.enemySpeed, next.enemySpeed, t),
      enemyHP: lerp(prev.enemyHP, next.enemyHP, t),
      enemyDamage: lerp(prev.enemyDamage, next.enemyDamage, t),
      enemyVariety: lerp(prev.enemyVariety, next.enemyVariety, t),
      gemDropRate: lerp(prev.gemDropRate, next.gemDropRate, t),
      xpMultiplier: lerp(prev.xpMultiplier, next.xpMultiplier, t),
      buffSpawnRate: lerp(prev.buffSpawnRate, next.buffSpawnRate, t),
      whaleProbability: lerp(prev.whaleProbability, next.whaleProbability, t),
      marketEventChance: lerp(prev.marketEventChance, next.marketEventChance, t),
      eliteSpawnChance: lerp(prev.eliteSpawnChance, next.eliteSpawnChance, t),
      chaosLevel: lerp(prev.chaosLevel, next.chaosLevel, t),
      mercyFactor: lerp(prev.mercyFactor, next.mercyFactor, t),
      pressureIntensity: lerp(prev.pressureIntensity, next.pressureIntensity, t),
    };
  }

  // --------------------------------------------------------------------------
  // GETTERS
  // --------------------------------------------------------------------------

  public getOutputs(): UnifiedOutputs {
    return this.currentOutputs;
  }

  public getDefaultOutputs(): UnifiedOutputs {
    return {
      spawnRate: 1.0,
      enemySpeed: 1.0,
      enemyHP: 1.0,
      enemyDamage: 1.0,
      enemyVariety: 0.5,
      gemDropRate: 1.0,
      xpMultiplier: 1.0,
      buffSpawnRate: 1.0,
      whaleProbability: 0,
      marketEventChance: 0.1,
      eliteSpawnChance: 0.1,
      chaosLevel: 0.3,
      mercyFactor: 0,
      pressureIntensity: 0.5,
    };
  }

  public isMercyActive(gameTimeMs: number): boolean {
    return gameTimeMs < this.mercyActiveUntil;
  }

  public getFlowStateStatus(hpPercent: number): 'bored' | 'flow' | 'stressed' {
    const hp = hpPercent * 100;
    const cfg = UNIFIED_DIRECTOR_CONFIG.FLOW_STATE;

    if (hp > cfg.HP_MAX) return 'bored';
    if (hp < cfg.HP_MIN) return 'stressed';
    return 'flow';
  }

  // --------------------------------------------------------------------------
  // DEBUG
  // --------------------------------------------------------------------------

  public getDebugState(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      brainLoaded: this.brainLoaded,
      mercyActiveUntil: this.mercyActiveUntil,
      timeBelowHP30: this.timeBelowHP30,
      outputs: this.currentOutputs,
    };
  }
}

// Export singleton
export const UnifiedDirector = UnifiedDirectorClass.getInstance();
