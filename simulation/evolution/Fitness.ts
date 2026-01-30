/**
 * Fitness.ts - AI Evolution Scoring System (Market-Aware)
 *
 * Calculates fitness score considering:
 * - Basic survival metrics (time, kills, level)
 * - Market adaptation (performance in different conditions)
 * - Risk management (survival in high volatility)
 */

export interface FitnessInput {
  // Basic stats
  survivalTime: number;
  kills: number;
  level: number;
  damageDealt: number;
  gemsCollected: number;

  // Market-aware stats (optional for backward compatibility)
  killsInBullMarket?: number;
  killsInBearMarket?: number;
  survivalInHighVolatility?: number;
  whaleEncounters?: number;
}

export interface MarketConditionWeights {
  bullMarket: number;
  bearMarket: number;
  highVolatility: number;
}

export class Fitness {
  // Default weights - can be evolved
  private static weights: MarketConditionWeights = {
    bullMarket: 1.2, // Slightly reward bull market performance
    bearMarket: 1.5, // Reward bear market survival more (harder)
    highVolatility: 2.0, // Strongly reward high volatility survival
  };

  /**
   * Calculate fitness score
   */
  public static calculate(input: FitnessInput): number {
    // === BASE SCORE ===
    // Primary weight: Survival Time (most important)
    const survivalScore = input.survivalTime * 10;

    // Secondary weight: Kills and XP progression
    const killScore = input.kills * 5;
    const levelScore = input.level * 50;

    // Performance weight: Damage and collection efficiency
    const damageScore = input.damageDealt * 0.1;
    const gemScore = input.gemsCollected * 2;

    const baseScore = survivalScore + killScore + levelScore + damageScore + gemScore;

    // === MARKET ADAPTATION BONUS ===
    let marketBonus = 0;

    // Bull market kills (easier, less bonus)
    if (input.killsInBullMarket !== undefined) {
      marketBonus += input.killsInBullMarket * 3 * this.weights.bullMarket;
    }

    // Bear market kills (harder, more bonus)
    if (input.killsInBearMarket !== undefined) {
      marketBonus += input.killsInBearMarket * 5 * this.weights.bearMarket;
    }

    // High volatility survival (very hard, big bonus)
    if (input.survivalInHighVolatility !== undefined) {
      marketBonus += input.survivalInHighVolatility * 15 * this.weights.highVolatility;
    }

    // Whale encounter survival (risk/reward)
    if (input.whaleEncounters !== undefined) {
      // Only count if survived the encounter
      marketBonus += input.whaleEncounters * 10;
    }

    // === EFFICIENCY MULTIPLIER ===
    // Reward agents that are efficient (high kills per time survived)
    const efficiency = input.survivalTime > 0 ? input.kills / input.survivalTime : 0;
    const efficiencyMultiplier = 1 + Math.min(0.5, efficiency * 0.1);

    // === FINAL SCORE ===
    return (baseScore + marketBonus) * efficiencyMultiplier;
  }

  /**
   * Calculate with custom weights (for evolution)
   */
  public static calculateWithWeights(
    input: FitnessInput,
    weights: MarketConditionWeights
  ): number {
    const originalWeights = { ...this.weights };
    this.weights = weights;
    const score = this.calculate(input);
    this.weights = originalWeights;
    return score;
  }

  /**
   * Get breakdown of score components (for debugging)
   */
  public static getBreakdown(input: FitnessInput): Record<string, number> {
    return {
      survivalScore: input.survivalTime * 10,
      killScore: input.kills * 5,
      levelScore: input.level * 50,
      damageScore: input.damageDealt * 0.1,
      gemScore: input.gemsCollected * 2,
      bullMarketBonus: (input.killsInBullMarket ?? 0) * 3 * this.weights.bullMarket,
      bearMarketBonus: (input.killsInBearMarket ?? 0) * 5 * this.weights.bearMarket,
      volatilityBonus:
        (input.survivalInHighVolatility ?? 0) * 15 * this.weights.highVolatility,
      whaleBonus: (input.whaleEncounters ?? 0) * 10,
      total: this.calculate(input),
    };
  }
}
