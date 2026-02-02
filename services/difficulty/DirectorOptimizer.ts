/**
 * DirectorOptimizer - Backtest-driven Parameter Optimization
 *
 * Uses BacktestEngine to find optimal PID gains and tactical thresholds
 * by simulating different parameter combinations against historical data.
 *
 * Optimization targets:
 * - Maximize time in flow state (HP 35%-65%)
 * - Minimize deaths
 * - Maximize engagement (damage taken + dealt balance)
 *
 * @see docs/AI_DIRECTOR_V2_DESIGN.md
 */

import { Logger } from '../system/Logger';
import { EventBus } from '../core/EventBus';
import {
  BacktestEngine,
  type BacktestConfig,
  type BacktestResult,
  type DirectorParameters,
} from '../training/BacktestEngine';
import { PID_CONFIG } from './layers/StrategicLayer';
import { TACTICAL_CONFIG } from './layers/TacticalLayer';
import { REACTIVE_CONFIG } from './layers/ReactiveLayer';

// Re-export DirectorParameters for convenience
export type { DirectorParameters } from '../training/BacktestEngine';

/**
 * Optimization result
 */
export interface OptimizationResult {
  bestParams: DirectorParameters;
  bestScore: number;
  iterations: number;
  convergenceHistory: number[];
  backtestResults: BacktestResult;
}

/**
 * Fitness metrics from backtest
 */
interface FitnessMetrics {
  flowTimePercent: number; // % of time in flow state
  deathCount: number;
  avgHP: number;
  hpVariance: number; // Lower = more stable
  engagementScore: number; // Damage balance
}

/**
 * Optimizer configuration
 */
const OPTIMIZER_CONFIG = {
  // Population size for genetic search
  POPULATION_SIZE: 20,

  // Maximum generations
  MAX_GENERATIONS: 50,

  // Convergence threshold (stop if improvement < this)
  CONVERGENCE_THRESHOLD: 0.001,

  // Mutation rate
  MUTATION_RATE: 0.2,

  // Crossover rate
  CROSSOVER_RATE: 0.7,

  // Elite count (best individuals to keep)
  ELITE_COUNT: 2,

  // Fitness weights
  WEIGHTS: {
    flowTime: 0.4, // Most important
    survival: 0.25,
    stability: 0.2,
    engagement: 0.15,
  },

  // Parameter bounds
  BOUNDS: {
    pid: {
      Kp: { min: 0.5, max: 5.0 },
      Ki: { min: 0.01, max: 0.5 },
      Kd: { min: 0.1, max: 2.0 },
    },
    tactical: {
      rsiOversold: { min: 20, max: 40 },
      rsiOverbought: { min: 60, max: 80 },
      atrLow: { min: 0.1, max: 0.5 },
      atrHigh: { min: 1.0, max: 3.0 },
      volumeThreshold: { min: 0.6, max: 0.9 },
    },
    reactive: {
      mercyThreshold: { min: 0.1, max: 0.3 },
      swarmThreshold: { min: 0.7, max: 0.9 },
      deathCooldownMs: { min: 3000, max: 10000 },
    },
  },
} as const;

/**
 * DirectorOptimizer - Singleton
 */
class DirectorOptimizerClass {
  private static instance: DirectorOptimizerClass | null = null;

  private isOptimizing: boolean = false;
  private currentGeneration: number = 0;
  private bestResult: OptimizationResult | null = null;
  private population: DirectorParameters[] = [];

  private constructor() {
    Logger.info('[DirectorOptimizer] Optimization system initialized');
  }

  static getInstance(): DirectorOptimizerClass {
    return (DirectorOptimizerClass.instance ??= new DirectorOptimizerClass());
  }

  /**
   * Run optimization using backtest data
   */
  async optimize(
    backtestConfig?: Partial<BacktestConfig>
  ): Promise<OptimizationResult> {
    if (this.isOptimizing) {
      throw new Error('Optimization already in progress');
    }

    this.isOptimizing = true;
    this.currentGeneration = 0;
    const convergenceHistory: number[] = [];

    try {
      Logger.info('[DirectorOptimizer] Starting optimization...');

      // Initialize population with random parameters
      this.population = this.initializePopulation();

      let bestScore = -Infinity;
      let bestParams = this.population[0]!;
      let bestBacktest: BacktestResult | null = null;
      let stagnantGenerations = 0;

      // Evolution loop
      for (let gen = 0; gen < OPTIMIZER_CONFIG.MAX_GENERATIONS; gen++) {
        this.currentGeneration = gen;

        // Evaluate fitness for each individual
        const fitnessScores: {
          params: DirectorParameters;
          score: number;
          result: BacktestResult;
        }[] = [];

        for (const params of this.population) {
          const result = await this.evaluateFitness(params, backtestConfig);
          fitnessScores.push({
            params,
            score: result.score,
            result: result.backtest,
          });
        }

        // Sort by fitness (descending)
        fitnessScores.sort((a, b) => b.score - a.score);

        // Track best
        const generationBest = fitnessScores[0]!;
        convergenceHistory.push(generationBest.score);

        if (generationBest.score > bestScore) {
          bestScore = generationBest.score;
          bestParams = generationBest.params;
          bestBacktest = generationBest.result;
          stagnantGenerations = 0;

          Logger.info(
            `[DirectorOptimizer] Gen ${gen}: New best score = ${bestScore.toFixed(4)}`
          );
        } else {
          stagnantGenerations++;
        }

        // Check convergence
        if (stagnantGenerations >= 10) {
          Logger.info(`[DirectorOptimizer] Converged after ${gen} generations`);
          break;
        }

        // Emit progress event
        EventBus.emit('optimizationProgress', {
          generation: gen,
          bestScore,
          progress: gen / OPTIMIZER_CONFIG.MAX_GENERATIONS,
        });

        // Create next generation
        this.population = this.evolvePopulation(
          fitnessScores.map(f => ({
            params: f.params,
            fitness: f.score,
          }))
        );
      }

      // Build result
      this.bestResult = {
        bestParams,
        bestScore,
        iterations: this.currentGeneration + 1,
        convergenceHistory,
        backtestResults: bestBacktest!,
      };

      Logger.info(
        `[DirectorOptimizer] Optimization complete. Best score: ${bestScore.toFixed(4)}`
      );

      // Emit completion event
      EventBus.emit('optimizationComplete', this.bestResult);

      return this.bestResult;
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Initialize random population
   */
  private initializePopulation(): DirectorParameters[] {
    const population: DirectorParameters[] = [];

    // First individual = current config (ensure we don't regress)
    population.push(this.getCurrentParameters());

    // Rest are random
    for (let i = 1; i < OPTIMIZER_CONFIG.POPULATION_SIZE; i++) {
      population.push(this.randomParameters());
    }

    return population;
  }

  /**
   * Get current system parameters
   */
  private getCurrentParameters(): DirectorParameters {
    return {
      pid: {
        Kp: PID_CONFIG.Kp,
        Ki: PID_CONFIG.Ki,
        Kd: PID_CONFIG.Kd,
      },
      tactical: {
        rsiOversold: TACTICAL_CONFIG.RSI_OVERSOLD,
        rsiOverbought: TACTICAL_CONFIG.RSI_OVERBOUGHT,
        atrLow: TACTICAL_CONFIG.ATR_LOW,
        atrHigh: TACTICAL_CONFIG.ATR_HIGH,
        volumeThreshold: TACTICAL_CONFIG.WHALE_VOLUME_THRESHOLD,
      },
      reactive: {
        mercyThreshold: REACTIVE_CONFIG.MERCY_HP_THRESHOLD,
        swarmThreshold: REACTIVE_CONFIG.SWARM_HP_THRESHOLD,
        deathCooldownMs: REACTIVE_CONFIG.DEATH_COOLDOWN_MS,
      },
    };
  }

  /**
   * Generate random parameters within bounds
   */
  private randomParameters(): DirectorParameters {
    const bounds = OPTIMIZER_CONFIG.BOUNDS;

    return {
      pid: {
        Kp: this.randomInRange(bounds.pid.Kp.min, bounds.pid.Kp.max),
        Ki: this.randomInRange(bounds.pid.Ki.min, bounds.pid.Ki.max),
        Kd: this.randomInRange(bounds.pid.Kd.min, bounds.pid.Kd.max),
      },
      tactical: {
        rsiOversold: this.randomInRange(
          bounds.tactical.rsiOversold.min,
          bounds.tactical.rsiOversold.max
        ),
        rsiOverbought: this.randomInRange(
          bounds.tactical.rsiOverbought.min,
          bounds.tactical.rsiOverbought.max
        ),
        atrLow: this.randomInRange(
          bounds.tactical.atrLow.min,
          bounds.tactical.atrLow.max
        ),
        atrHigh: this.randomInRange(
          bounds.tactical.atrHigh.min,
          bounds.tactical.atrHigh.max
        ),
        volumeThreshold: this.randomInRange(
          bounds.tactical.volumeThreshold.min,
          bounds.tactical.volumeThreshold.max
        ),
      },
      reactive: {
        mercyThreshold: this.randomInRange(
          bounds.reactive.mercyThreshold.min,
          bounds.reactive.mercyThreshold.max
        ),
        swarmThreshold: this.randomInRange(
          bounds.reactive.swarmThreshold.min,
          bounds.reactive.swarmThreshold.max
        ),
        deathCooldownMs: this.randomInRange(
          bounds.reactive.deathCooldownMs.min,
          bounds.reactive.deathCooldownMs.max
        ),
      },
    };
  }

  /**
   * Evaluate fitness of parameters using backtest
   */
  private async evaluateFitness(
    params: DirectorParameters,
    config?: Partial<BacktestConfig>
  ): Promise<{ score: number; backtest: BacktestResult }> {
    // Run backtest with these parameters
    const backtest = await BacktestEngine.runWithParams(params, config);

    // Calculate fitness metrics
    const metrics = this.calculateMetrics(backtest);

    // Weighted score
    const weights = OPTIMIZER_CONFIG.WEIGHTS;
    const score =
      weights.flowTime * metrics.flowTimePercent +
      weights.survival * (1 - Math.min(1, metrics.deathCount / 10)) +
      weights.stability * (1 - Math.min(1, metrics.hpVariance)) +
      weights.engagement * metrics.engagementScore;

    return { score, backtest };
  }

  /**
   * Calculate fitness metrics from backtest result
   */
  private calculateMetrics(result: BacktestResult): FitnessMetrics {
    const { timeline } = result;

    if (timeline.length === 0) {
      return {
        flowTimePercent: 0,
        deathCount: 0,
        avgHP: 0.5,
        hpVariance: 1,
        engagementScore: 0,
      };
    }

    // Flow time calculation
    let flowFrames = 0;
    let totalHP = 0;
    const hpValues: number[] = [];

    for (const frame of timeline) {
      const hp = frame.playerHP / 100;
      if (hp >= 0.35 && hp <= 0.65) {
        flowFrames++;
      }
      totalHP += hp;
      hpValues.push(hp);
    }

    const flowTimePercent = flowFrames / timeline.length;
    const avgHP = totalHP / timeline.length;

    // HP variance
    const hpMean = avgHP;
    const hpVariance =
      hpValues.reduce((sum, hp) => sum + Math.pow(hp - hpMean, 2), 0) / hpValues.length;

    // Engagement: ideal is balanced damage (not too safe, not too dangerous)
    // Score highest when avgHP is around 0.5
    const engagementScore = 1 - Math.abs(avgHP - 0.5) * 2;

    return {
      flowTimePercent,
      deathCount: result.summary.deaths,
      avgHP,
      hpVariance,
      engagementScore: Math.max(0, engagementScore),
    };
  }

  /**
   * Evolve population using genetic operators
   */
  private evolvePopulation(
    evaluated: { params: DirectorParameters; fitness: number }[]
  ): DirectorParameters[] {
    const newPopulation: DirectorParameters[] = [];

    // Keep elite
    for (let i = 0; i < OPTIMIZER_CONFIG.ELITE_COUNT; i++) {
      newPopulation.push(evaluated[i]!.params);
    }

    // Fill rest with crossover and mutation
    while (newPopulation.length < OPTIMIZER_CONFIG.POPULATION_SIZE) {
      // Tournament selection
      const parent1 = this.tournamentSelect(evaluated);
      const parent2 = this.tournamentSelect(evaluated);

      // Crossover
      let child: DirectorParameters;
      if (Math.random() < OPTIMIZER_CONFIG.CROSSOVER_RATE) {
        child = this.crossover(parent1, parent2);
      } else {
        child = { ...parent1 };
      }

      // Mutation
      if (Math.random() < OPTIMIZER_CONFIG.MUTATION_RATE) {
        child = this.mutate(child);
      }

      newPopulation.push(child);
    }

    return newPopulation;
  }

  /**
   * Tournament selection
   */
  private tournamentSelect(
    evaluated: { params: DirectorParameters; fitness: number }[]
  ): DirectorParameters {
    const tournamentSize = 3;
    let best = evaluated[Math.floor(Math.random() * evaluated.length)]!;

    for (let i = 1; i < tournamentSize; i++) {
      const candidate = evaluated[Math.floor(Math.random() * evaluated.length)]!;
      if (candidate.fitness > best.fitness) {
        best = candidate;
      }
    }

    return best.params;
  }

  /**
   * Crossover two parents
   */
  private crossover(
    p1: DirectorParameters,
    p2: DirectorParameters
  ): DirectorParameters {
    return {
      pid: {
        Kp: Math.random() < 0.5 ? p1.pid.Kp : p2.pid.Kp,
        Ki: Math.random() < 0.5 ? p1.pid.Ki : p2.pid.Ki,
        Kd: Math.random() < 0.5 ? p1.pid.Kd : p2.pid.Kd,
      },
      tactical: {
        rsiOversold:
          Math.random() < 0.5 ? p1.tactical.rsiOversold : p2.tactical.rsiOversold,
        rsiOverbought:
          Math.random() < 0.5 ? p1.tactical.rsiOverbought : p2.tactical.rsiOverbought,
        atrLow: Math.random() < 0.5 ? p1.tactical.atrLow : p2.tactical.atrLow,
        atrHigh: Math.random() < 0.5 ? p1.tactical.atrHigh : p2.tactical.atrHigh,
        volumeThreshold:
          Math.random() < 0.5
            ? p1.tactical.volumeThreshold
            : p2.tactical.volumeThreshold,
      },
      reactive: {
        mercyThreshold:
          Math.random() < 0.5 ? p1.reactive.mercyThreshold : p2.reactive.mercyThreshold,
        swarmThreshold:
          Math.random() < 0.5 ? p1.reactive.swarmThreshold : p2.reactive.swarmThreshold,
        deathCooldownMs:
          Math.random() < 0.5
            ? p1.reactive.deathCooldownMs
            : p2.reactive.deathCooldownMs,
      },
    };
  }

  /**
   * Mutate parameters
   */
  private mutate(params: DirectorParameters): DirectorParameters {
    const bounds = OPTIMIZER_CONFIG.BOUNDS;
    const mutationStrength = 0.2; // 20% of range

    const mutateValue = (value: number, min: number, max: number): number => {
      const range = max - min;
      const delta = (Math.random() - 0.5) * 2 * range * mutationStrength;
      return Math.max(min, Math.min(max, value + delta));
    };

    return {
      pid: {
        Kp: mutateValue(params.pid.Kp, bounds.pid.Kp.min, bounds.pid.Kp.max),
        Ki: mutateValue(params.pid.Ki, bounds.pid.Ki.min, bounds.pid.Ki.max),
        Kd: mutateValue(params.pid.Kd, bounds.pid.Kd.min, bounds.pid.Kd.max),
      },
      tactical: {
        rsiOversold: mutateValue(
          params.tactical.rsiOversold,
          bounds.tactical.rsiOversold.min,
          bounds.tactical.rsiOversold.max
        ),
        rsiOverbought: mutateValue(
          params.tactical.rsiOverbought,
          bounds.tactical.rsiOverbought.min,
          bounds.tactical.rsiOverbought.max
        ),
        atrLow: mutateValue(
          params.tactical.atrLow,
          bounds.tactical.atrLow.min,
          bounds.tactical.atrLow.max
        ),
        atrHigh: mutateValue(
          params.tactical.atrHigh,
          bounds.tactical.atrHigh.min,
          bounds.tactical.atrHigh.max
        ),
        volumeThreshold: mutateValue(
          params.tactical.volumeThreshold,
          bounds.tactical.volumeThreshold.min,
          bounds.tactical.volumeThreshold.max
        ),
      },
      reactive: {
        mercyThreshold: mutateValue(
          params.reactive.mercyThreshold,
          bounds.reactive.mercyThreshold.min,
          bounds.reactive.mercyThreshold.max
        ),
        swarmThreshold: mutateValue(
          params.reactive.swarmThreshold,
          bounds.reactive.swarmThreshold.min,
          bounds.reactive.swarmThreshold.max
        ),
        deathCooldownMs: mutateValue(
          params.reactive.deathCooldownMs,
          bounds.reactive.deathCooldownMs.min,
          bounds.reactive.deathCooldownMs.max
        ),
      },
    };
  }

  /**
   * Random value in range
   */
  private randomInRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  /**
   * Apply optimized parameters to the system
   */
  applyOptimizedParams(params: DirectorParameters): void {
    // Update PID config (runtime mutation)
    (PID_CONFIG as { Kp: number }).Kp = params.pid.Kp;
    (PID_CONFIG as { Ki: number }).Ki = params.pid.Ki;
    (PID_CONFIG as { Kd: number }).Kd = params.pid.Kd;

    // Update Tactical config
    (TACTICAL_CONFIG as { RSI_OVERSOLD: number }).RSI_OVERSOLD =
      params.tactical.rsiOversold;
    (TACTICAL_CONFIG as { RSI_OVERBOUGHT: number }).RSI_OVERBOUGHT =
      params.tactical.rsiOverbought;
    (TACTICAL_CONFIG as { ATR_LOW: number }).ATR_LOW = params.tactical.atrLow;
    (TACTICAL_CONFIG as { ATR_HIGH: number }).ATR_HIGH = params.tactical.atrHigh;
    (TACTICAL_CONFIG as { WHALE_VOLUME_THRESHOLD: number }).WHALE_VOLUME_THRESHOLD =
      params.tactical.volumeThreshold;

    // Update Reactive config
    (REACTIVE_CONFIG as { MERCY_HP_THRESHOLD: number }).MERCY_HP_THRESHOLD =
      params.reactive.mercyThreshold;
    (REACTIVE_CONFIG as { SWARM_HP_THRESHOLD: number }).SWARM_HP_THRESHOLD =
      params.reactive.swarmThreshold;
    (REACTIVE_CONFIG as { DEATH_COOLDOWN_MS: number }).DEATH_COOLDOWN_MS =
      params.reactive.deathCooldownMs;

    Logger.info('[DirectorOptimizer] Applied optimized parameters');
    EventBus.emit('directorParamsUpdated', params);
  }

  /**
   * Get optimization status
   */
  getStatus(): {
    isOptimizing: boolean;
    currentGeneration: number;
    bestResult: OptimizationResult | null;
  } {
    return {
      isOptimizing: this.isOptimizing,
      currentGeneration: this.currentGeneration,
      bestResult: this.bestResult,
    };
  }

  /**
   * Get best result
   */
  getBestResult(): OptimizationResult | null {
    return this.bestResult;
  }

  /**
   * Reset for testing
   */
  reset(): void {
    this.isOptimizing = false;
    this.currentGeneration = 0;
    this.bestResult = null;
    this.population = [];
  }
}

// Export singleton
export const DirectorOptimizer = DirectorOptimizerClass.getInstance();
