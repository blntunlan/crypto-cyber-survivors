import { clamp } from './utils';

export interface UnifiedInputs {
  // Market Data
  rsi: number; // 0.0 to 1.0 (e.g. 50 RSI = 0.5)
  rsiMomentum: number;
  atrPercent: number;
  volumeNorm: number; // 0.0 to 1.0
  priceChange: number;
  trendStrength: number;

  // Player State
  hpPercent: number; // 0.0 to 1.0
  pnlRatio: number; // -1.0 to 1.0
  killsPerMin: number;
  dashFrequency: number;
  playerDPS: number;
  damageTakenRate: number;

  // Game Context
  elapsedMinutes: number;
  playerLevel: number; // e.g. level / 50
  leverage: number; // e.g. 100x = 1.0
  gemPileup: number;
  engagementScore: number;
  frustrationScore: number;
}

export interface UnifiedOutputs {
  spawnRate: number;
  enemySpeed: number;
  enemyHP: number;
  enemyDamage: number;
  gemDropRate: number;
  enemyVariety: number;
  chaosLevel: number;
  mercyFactor: number;
  pressureIntensity: number;
  whaleProbability: number;
  xpMultiplier: number;
}

/**
 * Deterministic Rule-Based Director
 * Replaces the old synaptic Neural Network with transparent, tweakable rules.
 */
class RuleBasedDirector {
  private outputs: UnifiedOutputs = this.getDefaultOutputs();
  private smoothedOutputs: UnifiedOutputs = this.getDefaultOutputs();

  public update(inputs: UnifiedInputs, _nowMs: number): void {
    // 1. Calculate Mercy Rule
    // Player is struggling: Low HP (< 30%)
    let mercy = 0;
    if (inputs.hpPercent < 0.3) {
      // mercy scales from 0 (at 30% HP) to 0.8 (at 0% HP)
      mercy = clamp(1.0 - inputs.hpPercent * 3.33, 0, 1) * 0.8;
    }

    // 2. Base Multipliers Driven by Market Action
    // Volume drives swarm size
    const volumeBoost = inputs.volumeNorm * 1.5;

    // Volatility (ATR) drives chaos and speed
    const volatilityBoost = inputs.atrPercent * 10; // assuming atr is ~0.01-0.10

    // Profit bonus (Profiting player = easier game)
    // Only applies if they are in profit. Reduces intensity up to 50%
    const profitBonus = inputs.pnlRatio > 0 ? clamp(inputs.pnlRatio * 0.5, 0, 0.5) : 0;

    // Time scaling
    const timePressure = inputs.elapsedMinutes * 0.3;

    // Leverage penalty (Higher leverage = faster and harder enemies)
    const leverageBoost = inputs.leverage * 2.0;

    // 3. Execution (The Rules)
    const spawnRate = clamp(
      1.0 + timePressure + volumeBoost + leverageBoost - mercy - profitBonus,
      0.5,
      5.0
    );
    const enemySpeed = clamp(
      1.0 + volatilityBoost + leverageBoost - mercy * 0.4 - profitBonus * 0.4,
      0.5,
      3.0
    );

    // If they have high DPS, enemies get tankier
    const enemyHP = clamp(
      1.0 + inputs.playerLevel * 2.0 + inputs.playerDPS * 0.5,
      0.5,
      5.0
    );

    // Leverage hugely impacts enemy damage. If you are 100x and underwater, damage spikes.
    const underwaterPenalty = inputs.pnlRatio < 0 ? Math.abs(inputs.pnlRatio) * 5.0 : 0;
    const enemyDamage = clamp(
      1.0 + timePressure + leverageBoost * 4.0 + underwaterPenalty,
      0.5,
      10.0
    );

    // Whale Spawns (Linked to volume spikes and trend strength)
    const whaleProbability = clamp(
      inputs.volumeNorm * 0.05 + inputs.trendStrength * 0.02,
      0,
      0.1
    ); // Max 10%

    // Rewards (Gem drops and XP)
    // We reward them more if they are flowing fast (killsPerMin) OR if mercy is triggered to help them recover
    const gemDropRate = clamp(1.0 + inputs.killsPerMin * 0.5 + mercy * 2.0, 1.0, 5.0);
    const xpMultiplier = clamp(
      1.0 + inputs.leverage * 2.0 + inputs.killsPerMin,
      1.0,
      10.0
    );

    // Variety and Chaos
    const chaosLevel = clamp(volatilityBoost + Math.abs(inputs.priceChange), 0, 1);
    const enemyVariety = clamp(1.0 + timePressure, 1.0, 2.0);

    const pressureIntensity = clamp(timePressure + volumeBoost, 0, 1);

    this.outputs = {
      spawnRate,
      enemySpeed,
      enemyHP,
      enemyDamage,
      gemDropRate,
      enemyVariety,
      chaosLevel,
      mercyFactor: mercy,
      pressureIntensity,
      whaleProbability,
      xpMultiplier,
    };

    this.applySmoothing();
  }

  /**
   * Immediately snap smoothed outputs to target values (bypasses LERP).
   * Useful for unit tests or game starts.
   */
  public snapToTargets(): void {
    this.smoothedOutputs = { ...this.outputs };
  }

  private applySmoothing(): void {
    const LERP_SPEED = 0.05; // 5% approach per frame to prevent jerky game feel

    const keys = Object.keys(this.outputs) as Array<keyof UnifiedOutputs>;
    for (const key of keys) {
      this.smoothedOutputs[key] =
        this.smoothedOutputs[key] +
        (this.outputs[key] - this.smoothedOutputs[key]) * LERP_SPEED;
    }
  }

  public getOutputs(): UnifiedOutputs {
    return { ...this.smoothedOutputs };
  }

  public reset(): void {
    this.outputs = this.getDefaultOutputs();
    this.smoothedOutputs = this.getDefaultOutputs();
  }

  private getDefaultOutputs(): UnifiedOutputs {
    return {
      spawnRate: 1.0,
      enemySpeed: 1.0,
      enemyHP: 1.0,
      enemyDamage: 1.0,
      gemDropRate: 1.0,
      enemyVariety: 1.0,
      chaosLevel: 0,
      mercyFactor: 0,
      pressureIntensity: 0,
      whaleProbability: 0,
      xpMultiplier: 1.0,
    };
  }
}

export const UnifiedDirector = new RuleBasedDirector();
