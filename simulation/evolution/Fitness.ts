/**
 * Fitness.ts - AI Evolution Scoring System
 */

export interface FitnessInput {
  survivalTime: number;
  kills: number;
  level: number;
  damageDealt: number;
  gemsCollected: number;
}

export class Fitness {
  public static calculate(input: FitnessInput): number {
    // Primary weight: Survival Time
    const survivalWeight = input.survivalTime * 10;

    // Secondary weight: Kills and XP
    const killWeight = input.kills * 5;
    const levelWeight = input.level * 50;

    // Performance weight
    const damageWeight = input.damageDealt * 0.1;
    const gemWeight = input.gemsCollected * 2;

    return survivalWeight + killWeight + levelWeight + damageWeight + gemWeight;
  }
}
