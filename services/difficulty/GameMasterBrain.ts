/**
 * GameMasterBrain.ts - Market-Driven Neural Network Game Director
 *
 * Temel Prensipler:
 * 1. PnL değeri ana zorluk belirleyici (kaldıraç PnL hızını etkiler)
 * 2. Flow State: %50 HP bandı hedef
 * 3. İlk 24 saniye grace period
 * 4. Sideways market = flow state koruma
 * 5. Volume spike = Whale spawn (3 tier)
 *
 * PnL Pozitif → Kaos az, akıcı oyun
 * PnL Negatif → Kaos artışı, gem drop azalır, zorluk artar
 */

import * as SynapticLib from 'synaptic';
import { Logger } from '../system/Logger';

// ESM/CJS compatibility
interface SynapticNet {
  activate: (inputs: number[]) => number[];
  fromJSON: (json: unknown) => SynapticNet;
}

interface SynapticArchitect {
  Perceptron: new (i: number, h: number, o: number) => SynapticNet;
}

const SynapticModule = SynapticLib as unknown as {
  Architect: SynapticArchitect;
  Network: { fromJSON: (json: unknown) => SynapticNet };
  default?: {
    Architect: SynapticArchitect;
    Network: { fromJSON: (json: unknown) => SynapticNet };
  };
};

const Architect = SynapticModule.Architect;
const NetworkLib = SynapticModule.Network;

// ============================================================================
// CONFIGURATION
// ============================================================================

export const GAME_MASTER_CONFIG = {
  // Grace Period
  GRACE_PERIOD_SECONDS: 24,
  GRACE_FADE_DURATION: 10, // Market etkisi 10 saniyede kademeli başlar

  // Flow State
  IDEAL_HP_PERCENT: 50,
  HP_TOLERANCE: 15, // %35-65 arası "ok" kabul edilir

  // PnL Thresholds
  PNL_POSITIVE_THRESHOLD: 0.02, // %2+ = pozitif
  PNL_NEGATIVE_MILD: -0.05, // %-5 = hafif negatif
  PNL_NEGATIVE_SEVERE: -0.15, // %-15 = ciddi negatif
  PNL_LIQUIDATION_ZONE: -0.25, // %-25 = likidasyona yakın

  // Whale Volume Thresholds (normalized volume 0-1)
  WHALE_VOLUME_BABY: 0.6, // %60+ volume = baby whale
  WHALE_VOLUME_NORMAL: 0.75, // %75+ volume = normal whale
  WHALE_VOLUME_GIGA: 0.9, // %90+ volume = giga whale

  // Update Interval
  BRAIN_UPDATE_MS: 500,
};

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Inputs to the Game Master Brain (14 sensors)
 */
export interface GameMasterInputs {
  // Market Data (7)
  rsi: number; // RSI / 100 (0-1)
  macd: number; // MACD factor normalized (0-1)
  volatility: number; // ATR% normalized (0-1)
  volume: number; // Volume normalized (0-1)
  volumeMomentum: number; // Rate of change in volume (-1 to 1)
  trend: number; // 0=strong bear, 0.5=sideways, 1=strong bull
  pnlMomentum: number; // Rate of change in PnL (-1 to 1)

  // Player Economy (4)
  pnl: number; // PnL ratio (-1 to 1, clamped from actual)
  stress: number; // 1 - HP% (0=full hp, 1=dying)
  playerDPS: number; // Normalized damage output (0-1)
  killEfficiency: number; // Kills per minute normalized (0-1)

  // Game Context (4)
  elapsedTime: number; // Game time / 900 (15 min = 1.0)
  level: number; // Player level / 30
  luckStat: number; // Luck stat normalized (0-1)
  zoningScore: number; // Gem pile-up indicator (0-1)

  // Meta (1)
  leverage: number; // Leverage / 100 (affects PnL sensitivity)
}

/**
 * Outputs from the Game Master Brain (13 decisions)
 */
export interface GameMasterOutputs {
  // Enemy Parameters (4)
  spawnRate: number; // Multiplier (0.3 - 2.5)
  enemySpeed: number; // Multiplier (0.6 - 1.8)
  enemyHP: number; // Multiplier (0.7 - 2.0)
  enemyDamage: number; // Multiplier (0.7 - 2.0)

  // Loot Parameters (3)
  gemDropRate: number; // Multiplier (0.4 - 1.5)
  gemValueMultiplier: number; // Multiplier (0.5 - 2.5) for gem XP/value
  xpMultiplier: number; // Multiplier (0.6 - 1.4)

  // Special Spawns (2)
  whaleType: number; // 0=none, 1=baby, 2=normal, 3=giga
  eventIntensity: number; // 0-1 for market events

  // Difficulty Feel (4)
  aggression: number; // Enemy AI aggression (0-1)
  chaos: number; // Randomness factor (0-1)
  mercyWindow: number; // Mercy duration when low HP (0-1)
  pressureRamp: number; // How fast difficulty increases (0-1)
}

/**
 * Output ranges for neural network mapping
 */
const OUTPUT_RANGES: Record<keyof GameMasterOutputs, { min: number; max: number }> = {
  spawnRate: { min: 0.3, max: 2.5 },
  enemySpeed: { min: 0.6, max: 1.8 },
  enemyHP: { min: 0.7, max: 2.0 },
  enemyDamage: { min: 0.7, max: 2.0 },
  gemDropRate: { min: 0.4, max: 1.5 },
  gemValueMultiplier: { min: 0.5, max: 2.5 },
  xpMultiplier: { min: 0.6, max: 1.4 },
  whaleType: { min: 0, max: 3 },
  eventIntensity: { min: 0, max: 1 },
  aggression: { min: 0, max: 1 },
  chaos: { min: 0, max: 1 },
  mercyWindow: { min: 0, max: 1 },
  pressureRamp: { min: 0, max: 1 },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapOutput(value: number, key: keyof typeof OUTPUT_RANGES): number {
  const range = OUTPUT_RANGES[key];
  return range.min + Math.max(0, Math.min(1, value)) * (range.max - range.min);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate grace period factor (0 = full grace, 1 = no grace)
 */
function getGraceFactor(elapsedSeconds: number): number {
  const cfg = GAME_MASTER_CONFIG;
  if (elapsedSeconds < cfg.GRACE_PERIOD_SECONDS) {
    return 0;
  }
  const fadeProgress =
    (elapsedSeconds - cfg.GRACE_PERIOD_SECONDS) / cfg.GRACE_FADE_DURATION;
  return clamp(fadeProgress, 0, 1);
}

/**
 * Determine whale type based on volume
 */
function determineWhaleType(volume: number, graceFactor: number): number {
  if (graceFactor < 0.5) return 0; // No whales during grace

  const cfg = GAME_MASTER_CONFIG;
  if (volume >= cfg.WHALE_VOLUME_GIGA) return 3;
  if (volume >= cfg.WHALE_VOLUME_NORMAL) return 2;
  if (volume >= cfg.WHALE_VOLUME_BABY) return 1;
  return 0;
}

// ============================================================================
// GAME MASTER BRAIN CLASS
// ============================================================================

class GameMasterBrainClass {
  private static instance: GameMasterBrainClass | null = null;

  // Neural Network: 14 inputs -> 20 hidden -> 12 outputs
  private net!: SynapticNet;
  private brainLoaded: boolean = false;
  private enabled: boolean = true;

  // Update throttling
  private lastUpdate: number = 0;

  // Current outputs (cached)
  private currentOutputs: GameMasterOutputs = this.getDefaultOutputs();
  private previousOutputs: GameMasterOutputs = this.getDefaultOutputs();

  // Smoothing
  private smoothingFactor: number = 0.25;

  private constructor() {
    this.initNetwork();
  }

  static getInstance(): GameMasterBrainClass {
    return (GameMasterBrainClass.instance ??= new GameMasterBrainClass());
  }

  // --------------------------------------------------------------------------
  // NETWORK MANAGEMENT
  // --------------------------------------------------------------------------

  private initNetwork(): void {
    try {
      // 16 inputs -> 22 hidden -> 13 outputs
      this.net = new Architect.Perceptron(16, 22, 13);
      this.brainLoaded = false;
      Logger.info('[GameMasterBrain] Neural Network initialized (16-22-13)');
    } catch (error) {
      Logger.error('[GameMasterBrain] Failed to initialize:', error);
      this.enabled = false;
    }
  }

  public loadBrain(brainJson: unknown): boolean {
    try {
      this.net = NetworkLib.fromJSON(brainJson);
      this.brainLoaded = true;
      Logger.info('[GameMasterBrain] Pre-trained brain loaded');
      return true;
    } catch (error) {
      Logger.warn('[GameMasterBrain] Load failed, using random:', error);
      this.initNetwork();
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // MAIN UPDATE
  // --------------------------------------------------------------------------

  public update(inputs: GameMasterInputs, gameTimeMs: number): void {
    if (!this.enabled) return;

    // Throttle
    if (gameTimeMs - this.lastUpdate < GAME_MASTER_CONFIG.BRAIN_UPDATE_MS) return;
    this.lastUpdate = gameTimeMs;

    const elapsedSeconds = gameTimeMs / 1000;
    const graceFactor = getGraceFactor(elapsedSeconds);

    // Prepare 16 input values
    const inputArray = [
      inputs.rsi,
      inputs.macd,
      inputs.volatility,
      inputs.volume,
      clamp((inputs.volumeMomentum + 1) / 2, 0, 1),
      inputs.trend,
      clamp((inputs.pnlMomentum + 1) / 2, 0, 1),
      clamp((inputs.pnl + 1) / 2, 0, 1), // Map -1..1 to 0..1
      inputs.stress,
      inputs.playerDPS,
      inputs.killEfficiency,
      inputs.elapsedTime,
      inputs.level,
      inputs.luckStat,
      inputs.zoningScore,
      inputs.leverage,
    ];

    // Neural network forward pass
    const raw = this.net.activate(inputArray);

    // Map outputs
    let newOutputs: GameMasterOutputs = {
      spawnRate: mapOutput(raw[0] ?? 0.5, 'spawnRate'),
      enemySpeed: mapOutput(raw[1] ?? 0.5, 'enemySpeed'),
      enemyHP: mapOutput(raw[2] ?? 0.5, 'enemyHP'),
      enemyDamage: mapOutput(raw[3] ?? 0.5, 'enemyDamage'),
      gemDropRate: mapOutput(raw[4] ?? 0.5, 'gemDropRate'),
      gemValueMultiplier: mapOutput(raw[5] ?? 0.5, 'gemValueMultiplier'),
      xpMultiplier: mapOutput(raw[6] ?? 0.5, 'xpMultiplier'),
      whaleType: determineWhaleType(inputs.volume, graceFactor),
      eventIntensity: mapOutput(raw[8] ?? 0.5, 'eventIntensity'),
      aggression: mapOutput(raw[9] ?? 0.5, 'aggression'),
      chaos: mapOutput(raw[10] ?? 0.5, 'chaos'),
      mercyWindow: mapOutput(raw[11] ?? 0.5, 'mercyWindow'),
      pressureRamp: mapOutput(raw[12] ?? 0.5, 'pressureRamp'),
    };

    // Apply grace period (blend toward neutral)
    newOutputs = this.applyGracePeriod(newOutputs, graceFactor);

    // Apply PnL-based modifiers
    newOutputs = this.applyPnLModifiers(
      newOutputs,
      inputs.pnl,
      inputs.luckStat,
      inputs.pnlMomentum
    );

    // Apply flow state corrections
    newOutputs = this.applyFlowStateCorrections(
      newOutputs,
      inputs.stress,
      inputs.leverage
    );

    // Smooth transition
    this.previousOutputs = { ...this.currentOutputs };
    this.currentOutputs = this.smoothOutputs(this.previousOutputs, newOutputs);
  }

  // --------------------------------------------------------------------------
  // MODIFIERS
  // --------------------------------------------------------------------------

  /**
   * Grace period: Blend outputs toward neutral
   */
  private applyGracePeriod(
    outputs: GameMasterOutputs,
    graceFactor: number
  ): GameMasterOutputs {
    if (graceFactor >= 1) return outputs;

    const neutral = this.getDefaultOutputs();
    const blend = (val: number, neutralVal: number) =>
      neutralVal + (val - neutralVal) * graceFactor;

    return {
      ...outputs,
      spawnRate: blend(outputs.spawnRate, neutral.spawnRate),
      enemySpeed: blend(outputs.enemySpeed, neutral.enemySpeed),
      enemyHP: blend(outputs.enemyHP, neutral.enemyHP),
      enemyDamage: blend(outputs.enemyDamage, neutral.enemyDamage),
      chaos: blend(outputs.chaos, neutral.chaos),
      aggression: blend(outputs.aggression, neutral.aggression),
    };
  }

  /**
   * PnL-based modifiers:
   * - Negative PnL → increase difficulty, decrease gem drops
   * - Positive PnL → maintain flow, normal gems
   * - Luck stat helps gem drops even in negative PnL
   * - MOMENTUM: Fast PnL moves (leveraged shocks) increase Chaos and Gem Value
   */
  private applyPnLModifiers(
    outputs: GameMasterOutputs,
    pnl: number,
    luckStat: number,
    pnlMomentum: number
  ): GameMasterOutputs {
    const cfg = GAME_MASTER_CONFIG;
    const result = { ...outputs };

    // Basic PnL Logic
    if (pnl >= cfg.PNL_POSITIVE_THRESHOLD) {
      // Positive PnL: Flow state, slightly higher challenge to prevent boredom
      result.chaos *= 0.8;
      result.aggression *= 0.9;
      result.spawnRate *= 1.1; // More enemies to fight since player is "rich"
    } else if (pnl >= cfg.PNL_NEGATIVE_MILD) {
      // Slightly negative: Start ramping
      const severity = Math.abs(pnl) / Math.abs(cfg.PNL_NEGATIVE_MILD);
      result.chaos *= 1 + severity * 0.3;
      result.spawnRate *= 1 + severity * 0.15;
      result.gemDropRate *= 1 - severity * 0.15;
    } else if (pnl >= cfg.PNL_NEGATIVE_SEVERE) {
      // Moderate negative: Significant ramp
      const severity =
        (Math.abs(pnl) - Math.abs(cfg.PNL_NEGATIVE_MILD)) /
        (Math.abs(cfg.PNL_NEGATIVE_SEVERE) - Math.abs(cfg.PNL_NEGATIVE_MILD));
      result.chaos *= 1.3 + severity * 0.4;
      result.spawnRate *= 1.15 + severity * 0.25;
      result.enemySpeed *= 1 + severity * 0.2;
      result.gemDropRate *= 0.8 - severity * 0.2;
    } else {
      // Liquidation zone: Maximum pressure
      result.chaos = clamp(result.chaos * 1.8, 0, 1);
      result.spawnRate *= 1.5;
      result.enemySpeed *= 1.3;
      result.enemyDamage *= 1.2;
      result.gemDropRate *= 0.6;
      result.aggression = clamp(result.aggression * 1.5, 0, 1);
    }

    // --- MARKET FLOW ENHANCEMENT (Risk/Reward) ---
    // If PnL is dropping fast (negative momentum), it's a high-stress moment.
    // We increase Chaos but ALSO increase Gem Value to reward survival in the "Eye of the Storm".
    if (pnlMomentum < -0.2) {
      const momentumImpact = Math.abs(pnlMomentum) * 1.5;
      result.chaos = clamp(result.chaos * (1 + momentumImpact), 0, 1);
      result.gemValueMultiplier = clamp(
        result.gemValueMultiplier * (1 + momentumImpact),
        1.0,
        2.5
      );
    }

    if (pnl < cfg.PNL_NEGATIVE_MILD) {
      // Increase rewards during market distress to keep it "fun" (Risk/Reward)
      const riskFactor = Math.abs(pnl) * 2;
      result.gemValueMultiplier = clamp(
        result.gemValueMultiplier * (1 + riskFactor),
        1.0,
        2.5
      );
    }

    // Luck stat partially counters gem drop reduction
    if (pnl < 0 && luckStat > 0) {
      const luckBonus = luckStat * 0.5; // Up to 50% recovery
      result.gemDropRate = clamp(
        result.gemDropRate * (1 + luckBonus),
        OUTPUT_RANGES.gemDropRate.min,
        OUTPUT_RANGES.gemDropRate.max
      );
    }

    return result;
  }

  /**
   * Flow state corrections:
   * - HP > 65%: Increase enemy speed (challenge)
   * - HP < 35%: Mercy window (reduce spawn, brief respite)
   * - LEVERAGE IMPACT: High leverage makes the flow window tighter
   */
  private applyFlowStateCorrections(
    outputs: GameMasterOutputs,
    stress: number,
    leverage: number
  ): GameMasterOutputs {
    const result = { ...outputs };
    const hpPercent = (1 - stress) * 100;
    const cfg = GAME_MASTER_CONFIG;

    const idealHP = cfg.IDEAL_HP_PERCENT;
    // Leverage-based flow tightening: 1x = 15% tolerance, 100x = 5% tolerance
    const tolerance = clamp(cfg.HP_TOLERANCE * (1 - leverage * 0.6), 5, 20);

    if (hpPercent > idealHP + tolerance) {
      // Player too comfortable → increase challenge via speed and density
      const comfortLevel =
        (hpPercent - (idealHP + tolerance)) / (100 - idealHP - tolerance);
      result.enemySpeed *= 1 + comfortLevel * 0.4;
      result.spawnRate *= 1 + comfortLevel * 0.25;
      result.aggression = clamp(result.aggression + comfortLevel * 0.3, 0, 1);
    } else if (hpPercent < idealHP - tolerance) {
      // Player struggling → brief mercy
      const struggleLevel = (idealHP - tolerance - hpPercent) / (idealHP - tolerance);
      result.mercyWindow = clamp(result.mercyWindow + struggleLevel * 0.5, 0, 1);
      result.spawnRate *= 1 - struggleLevel * 0.3;
      result.gemDropRate *= 1 + struggleLevel * 0.2; // Drop more gems when struggling to help recovery
    }

    return result;
  }

  // --------------------------------------------------------------------------
  // UTILITIES
  // --------------------------------------------------------------------------

  private smoothOutputs(
    old: GameMasterOutputs,
    next: GameMasterOutputs
  ): GameMasterOutputs {
    const s = this.smoothingFactor;
    const lerp = (a: number, b: number) => a * (1 - s) + b * s;

    return {
      spawnRate: lerp(old.spawnRate, next.spawnRate),
      enemySpeed: lerp(old.enemySpeed, next.enemySpeed),
      enemyHP: lerp(old.enemyHP, next.enemyHP),
      enemyDamage: lerp(old.enemyDamage, next.enemyDamage),
      gemDropRate: lerp(old.gemDropRate, next.gemDropRate),
      gemValueMultiplier: lerp(old.gemValueMultiplier, next.gemValueMultiplier),
      xpMultiplier: lerp(old.xpMultiplier, next.xpMultiplier),
      whaleType: next.whaleType, // No smoothing for discrete values
      eventIntensity: lerp(old.eventIntensity, next.eventIntensity),
      aggression: lerp(old.aggression, next.aggression),
      chaos: lerp(old.chaos, next.chaos),
      mercyWindow: lerp(old.mercyWindow, next.mercyWindow),
      pressureRamp: lerp(old.pressureRamp, next.pressureRamp),
    };
  }

  public getOutputs(): GameMasterOutputs {
    return { ...this.currentOutputs };
  }

  private getDefaultOutputs(): GameMasterOutputs {
    return {
      spawnRate: 1.0,
      enemySpeed: 1.0,
      enemyHP: 1.0,
      enemyDamage: 1.0,
      gemDropRate: 1.0,
      gemValueMultiplier: 1.0,
      xpMultiplier: 1.0,
      whaleType: 0,
      eventIntensity: 0.3,
      aggression: 0.4,
      chaos: 0.3,
      mercyWindow: 0.2,
      pressureRamp: 0.5,
    };
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.currentOutputs = this.getDefaultOutputs();
    }
  }

  public isUsingTrainedBrain(): boolean {
    return this.brainLoaded;
  }

  public reset(): void {
    this.currentOutputs = this.getDefaultOutputs();
    this.previousOutputs = this.getDefaultOutputs();
    this.lastUpdate = 0;
  }

  public getDebugState() {
    return {
      enabled: this.enabled,
      brainLoaded: this.brainLoaded,
      outputs: { ...this.currentOutputs },
    };
  }
}

export const GameMasterBrain = GameMasterBrainClass.getInstance();
