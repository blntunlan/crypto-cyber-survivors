import { clamp } from './utils';

export interface UnifiedInputs {
  // Market Data
  rsi: number; // 0.0 to 1.0 (e.g. 50 RSI = 0.5)
  rsiMomentum: number;
  atrPercent: number;
  volumeNorm: number; // 0.0 to 1.0
  priceChange: number;
  trendStrength: number;
  macdHistogram: number;
  side: 'long' | 'short';

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
  trendAlignment: 'with_player' | 'against_player' | 'neutral';
  lootboxDropChance: number;
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
      // mercy scales from 0 (at 30% HP) to 0.7 (at 0% HP)
      mercy = clamp(1.0 - inputs.hpPercent * 3.33, 0, 1) * 0.7;
    }

    // 2. Base Multipliers Driven by Market Action
    // Volume drives swarm size
    const volumeBoost = inputs.volumeNorm * 1.5;

    // ATR-based speed: normalize atrPercent to 0..1 then lerp to 0.90..1.35
    const atrNorm = clamp((inputs.atrPercent - 0.002) / (0.03 - 0.002), 0, 1);
    const atrSpeedMult = 0.9 + atrNorm * (1.35 - 0.9);

    // PnL-driven speed (design spec formulas)
    const pnlSpeedMult =
      inputs.pnlRatio < 0
        ? 1 + clamp(-inputs.pnlRatio, 0, 0.6) * 0.55
        : 1 - clamp(inputs.pnlRatio, 0, 0.4) * 0.15;

    // Time scaling
    const timePressure = inputs.elapsedMinutes * 0.3;

    // Leverage contribution (moderate — LeverageEngine handles primary scaling)
    const leverageBoost = inputs.leverage * 0.5;

    // 3. Execution (The Rules)
    const spawnRate = clamp(
      1.0 + timePressure + volumeBoost + leverageBoost - mercy,
      0.5,
      5.0
    );
    // Speed: multiplicative leverage, not additive
    const enemySpeed = clamp(
      atrSpeedMult * pnlSpeedMult * (1.0 + leverageBoost * 0.3) - mercy * 0.4,
      0.5,
      2.5
    );

    // Enemies scale with player power, not too aggressively
    const enemyHP = clamp(
      1.0 + inputs.playerLevel * 1.2 + inputs.playerDPS * 0.3,
      0.5,
      4.0
    );

    // Enemy damage: moderate leverage impact, capped to prevent one-shots
    const underwaterPenalty = inputs.pnlRatio < 0 ? Math.abs(inputs.pnlRatio) * 2.5 : 0;
    const enemyDamage = clamp(
      1.0 + timePressure + leverageBoost * 2.0 + underwaterPenalty,
      0.5,
      5.0
    );

    // Whale Spawns (Linked to volume spikes and trend strength)
    const whaleProbability = clamp(
      inputs.volumeNorm * 0.05 + inputs.trendStrength * 0.02,
      0,
      0.1
    ); // Max 10%

    // Rewards (Gem drops and XP)
    const gemDropRate = clamp(1.0 + inputs.killsPerMin * 0.5 + mercy * 2.0, 1.0, 5.0);
    const xpMultiplier = clamp(
      1.0 + inputs.leverage * 1.0 + inputs.killsPerMin * 0.5,
      1.0,
      5.0
    );

    // Variety and Chaos
    const chaosLevel = clamp(atrNorm + Math.abs(inputs.priceChange), 0, 1);
    const enemyVariety = clamp(1.0 + timePressure, 1.0, 2.0);

    const pressureIntensity = clamp(timePressure + volumeBoost, 0, 1);

    // MACD trend alignment
    const trendAlignment = this.computeTrendAlignment(
      inputs.macdHistogram,
      inputs.side
    );

    // Lootbox drop chance (base 0.03, boosted by trend alignment)
    const baseLootboxChance = 0.03;
    const lootboxDropChance =
      trendAlignment === 'with_player'
        ? clamp(baseLootboxChance * 1.5, 0, 0.1)
        : trendAlignment === 'against_player'
          ? clamp(baseLootboxChance * 0.8, 0, 0.1)
          : baseLootboxChance;

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
      trendAlignment,
      lootboxDropChance,
    };

    this.applySmoothing();
  }

  private computeTrendAlignment(
    macdHistogram: number,
    side: 'long' | 'short'
  ): 'with_player' | 'against_player' | 'neutral' {
    if (macdHistogram === 0 || !Number.isFinite(macdHistogram)) {
      return 'neutral';
    }
    if (side === 'long') {
      return macdHistogram > 0 ? 'with_player' : 'against_player';
    }
    return macdHistogram < 0 ? 'with_player' : 'against_player';
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
      const val = this.outputs[key];
      if (typeof val === 'number') {
        (this.smoothedOutputs as Record<string, unknown>)[key] =
          (this.smoothedOutputs[key] as number) +
          (val - (this.smoothedOutputs[key] as number)) * LERP_SPEED;
      } else {
        // Non-numeric fields (trendAlignment) - copy directly
        (this.smoothedOutputs as Record<string, unknown>)[key] = val;
      }
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
      trendAlignment: 'neutral',
      lootboxDropChance: 0.03,
    };
  }
}

export const UnifiedDirector = new RuleBasedDirector();
