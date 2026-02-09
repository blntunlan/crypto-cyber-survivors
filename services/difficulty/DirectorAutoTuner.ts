/**
 * DirectorAutoTuner - Automated Parameter Learning System
 *
 * Runs optimization in background and applies best parameters dynamically.
 * Uses BacktestEngine + DirectorOptimizer to find optimal settings.
 *
 * Workflow:
 * 1. On game start: Load cached parameters (if any)
 * 2. In background: Run optimization with historical data
 * 3. When better params found: Apply them smoothly (blend factor)
 * 4. Save best params to localStorage
 *
 * @see docs/AI_DIRECTOR_V2_DESIGN.md
 */

import { Logger } from '../system/Logger';
import { EventBus } from '../core/EventBus';
import { DirectorOptimizer, type OptimizationResult } from './DirectorOptimizer';
import type { DirectorParameters } from '../training/BacktestEngine';

/**
 * AutoTuner configuration
 */
const AUTO_TUNER_CONFIG = {
  // Storage key for cached params
  STORAGE_KEY: 'director_optimized_params',

  // Run optimization after this many deaths
  OPTIMIZE_AFTER_DEATHS: 5,

  // Minimum time between optimizations (ms)
  MIN_OPTIMIZATION_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes

  // Blend new params gradually
  PARAM_BLEND_RATE: 0.1, // 10% per application

  // Auto-enable optimization in background
  BACKGROUND_OPTIMIZATION: true,

  // Quality threshold to apply new params
  MIN_IMPROVEMENT_PERCENT: 5, // 5% better than current
} as const;

/**
 * Cached optimization state
 */
interface CachedState {
  params: DirectorParameters;
  score: number;
  timestamp: number;
  version: number;
}

/**
 * DirectorAutoTuner - Singleton
 */
class DirectorAutoTunerClass {
  private static instance: DirectorAutoTunerClass | null = null;

  private isEnabled: boolean = true;
  private lastOptimizationTime: number = 0;
  private deathCount: number = 0;
  private currentScore: number = 0;
  private optimizationPromise: Promise<OptimizationResult> | null = null;

  // Current applied params
  private appliedParams: DirectorParameters | null = null;

  private constructor() {
    this.loadCachedParams();
    this.subscribeToEvents();
    Logger.info('[DirectorAutoTuner] Auto-tuning system initialized');
  }

  static getInstance(): DirectorAutoTunerClass {
    return (DirectorAutoTunerClass.instance ??= new DirectorAutoTunerClass());
  }

  /**
   * Subscribe to game events
   */
  private subscribeToEvents(): void {
    // Track deaths for optimization trigger
    EventBus.on('playerDied', () => {
      this.deathCount++;
      this.checkOptimizationTrigger();
    });

    // Track game end for learning
    EventBus.on('gameOver', data => {
      this.onGameEnd(data as unknown as { survivalTime: number; score: number });
    });

    // Apply params when optimization completes
    EventBus.on('optimizationComplete', result => {
      this.onOptimizationComplete(result as OptimizationResult);
    });
  }

  /**
   * Load cached parameters from localStorage
   */
  private loadCachedParams(): void {
    try {
      const cached = localStorage.getItem(AUTO_TUNER_CONFIG.STORAGE_KEY);
      if (cached) {
        const state: CachedState = JSON.parse(cached);

        // Validate version
        if (state.version === 1) {
          this.appliedParams = state.params;
          this.currentScore = state.score;

          // Apply cached params
          DirectorOptimizer.applyOptimizedParams(state.params);
          Logger.info(
            `[DirectorAutoTuner] Loaded cached params (score: ${state.score.toFixed(2)})`
          );
        }
      }
    } catch (error) {
      Logger.warn('[DirectorAutoTuner] Failed to load cached params:', error);
    }
  }

  /**
   * Save optimized params to localStorage
   */
  private saveCachedParams(params: DirectorParameters, score: number): void {
    try {
      const state: CachedState = {
        params,
        score,
        timestamp: Date.now(),
        version: 1,
      };
      localStorage.setItem(AUTO_TUNER_CONFIG.STORAGE_KEY, JSON.stringify(state));
      Logger.debug('[DirectorAutoTuner] Saved optimized params to cache');
    } catch (error) {
      Logger.warn('[DirectorAutoTuner] Failed to save cached params:', error);
    }
  }

  /**
   * Check if optimization should be triggered
   */
  private checkOptimizationTrigger(): void {
    if (!this.isEnabled) {
      return;
    }

    // Check death threshold
    if (this.deathCount < AUTO_TUNER_CONFIG.OPTIMIZE_AFTER_DEATHS) {
      return;
    }

    // Check time since last optimization
    const now = Date.now();
    if (
      now - this.lastOptimizationTime <
      AUTO_TUNER_CONFIG.MIN_OPTIMIZATION_INTERVAL_MS
    ) {
      return;
    }

    // Don't run if already optimizing
    if (this.optimizationPromise) {
      return;
    }

    // Trigger optimization
    this.startBackgroundOptimization();
  }

  /**
   * Start background optimization
   */
  private startBackgroundOptimization(): void {
    Logger.info('[DirectorAutoTuner] Starting background optimization...');

    this.lastOptimizationTime = Date.now();
    this.deathCount = 0;

    // Run async
    this.optimizationPromise = DirectorOptimizer.optimize()
      .then(result => {
        this.optimizationPromise = null;
        return result;
      })
      .catch(error => {
        Logger.error('[DirectorAutoTuner] Optimization failed:', error);
        this.optimizationPromise = null;
        throw error;
      });
  }

  /**
   * Handle optimization complete
   */
  private onOptimizationComplete(result: OptimizationResult): void {
    const { bestParams, bestScore } = result;

    // Check if improvement is significant
    const improvement =
      ((bestScore - this.currentScore) / Math.abs(this.currentScore || 1)) * 100;

    if (improvement >= AUTO_TUNER_CONFIG.MIN_IMPROVEMENT_PERCENT) {
      Logger.info(
        `[DirectorAutoTuner] Found better params! Improvement: ${improvement.toFixed(1)}%`
      );

      // Blend new params gradually
      if (this.appliedParams) {
        const blendedParams = this.blendParams(
          this.appliedParams,
          bestParams,
          AUTO_TUNER_CONFIG.PARAM_BLEND_RATE
        );
        DirectorOptimizer.applyOptimizedParams(blendedParams);
        this.appliedParams = blendedParams;
      } else {
        DirectorOptimizer.applyOptimizedParams(bestParams);
        this.appliedParams = bestParams;
      }

      this.currentScore = bestScore;

      // Save to cache
      this.saveCachedParams(this.appliedParams, bestScore);

      EventBus.emit('directorAutoTuned', {
        improvement,
        newScore: bestScore,
      });
    } else {
      Logger.debug(
        `[DirectorAutoTuner] No significant improvement (${improvement.toFixed(1)}%)`
      );
    }
  }

  /**
   * Blend two parameter sets
   */
  private blendParams(
    current: DirectorParameters,
    target: DirectorParameters,
    rate: number
  ): DirectorParameters {
    const blend = (a: number, b: number): number => a + (b - a) * rate;

    return {
      pid: {
        Kp: blend(current.pid.Kp, target.pid.Kp),
        Ki: blend(current.pid.Ki, target.pid.Ki),
        Kd: blend(current.pid.Kd, target.pid.Kd),
      },
      tactical: {
        rsiOversold: blend(current.tactical.rsiOversold, target.tactical.rsiOversold),
        rsiOverbought: blend(
          current.tactical.rsiOverbought,
          target.tactical.rsiOverbought
        ),
        atrLow: blend(current.tactical.atrLow, target.tactical.atrLow),
        atrHigh: blend(current.tactical.atrHigh, target.tactical.atrHigh),
        volumeThreshold: blend(
          current.tactical.volumeThreshold,
          target.tactical.volumeThreshold
        ),
      },
      reactive: {
        mercyThreshold: blend(
          current.reactive.mercyThreshold,
          target.reactive.mercyThreshold
        ),
        swarmThreshold: blend(
          current.reactive.swarmThreshold,
          target.reactive.swarmThreshold
        ),
        deathCooldownMs: blend(
          current.reactive.deathCooldownMs,
          target.reactive.deathCooldownMs
        ),
      },
    };
  }

  /**
   * Handle game end - collect learning data
   */
  private onGameEnd(data: { survivalTime: number; score: number }): void {
    Logger.debug(
      `[DirectorAutoTuner] Game ended - survival: ${data.survivalTime}ms, score: ${data.score}`
    );

    // Could store game data for future batch training
    // For now, just reset death counter
    this.deathCount = 0;
  }

  /**
   * Force run optimization
   */
  async forceOptimize(): Promise<OptimizationResult> {
    if (this.optimizationPromise) {
      return this.optimizationPromise;
    }

    this.lastOptimizationTime = Date.now();
    this.optimizationPromise = DirectorOptimizer.optimize();

    try {
      const result = await this.optimizationPromise;
      this.optimizationPromise = null;
      return result;
    } finally {
      this.optimizationPromise = null;
    }
  }

  /**
   * Enable/disable auto-tuning
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    Logger.info(`[DirectorAutoTuner] Auto-tuning ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get current status
   */
  getStatus(): {
    isEnabled: boolean;
    isOptimizing: boolean;
    currentScore: number;
    deathCount: number;
    hasAppliedParams: boolean;
  } {
    return {
      isEnabled: this.isEnabled,
      isOptimizing: this.optimizationPromise !== null,
      currentScore: this.currentScore,
      deathCount: this.deathCount,
      hasAppliedParams: this.appliedParams !== null,
    };
  }

  /**
   * Get applied parameters
   */
  getAppliedParams(): DirectorParameters | null {
    return this.appliedParams;
  }

  /**
   * Clear cached params
   */
  clearCache(): void {
    try {
      localStorage.removeItem(AUTO_TUNER_CONFIG.STORAGE_KEY);
      this.appliedParams = null;
      this.currentScore = 0;
      Logger.info('[DirectorAutoTuner] Cleared cached params');
    } catch (error) {
      Logger.warn('[DirectorAutoTuner] Failed to clear cache:', error);
    }
  }

  /**
   * Reset for testing
   */
  reset(): void {
    this.isEnabled = true;
    this.lastOptimizationTime = 0;
    this.deathCount = 0;
    this.currentScore = 0;
    this.optimizationPromise = null;
    this.appliedParams = null;
  }
}

// Export singleton
export const DirectorAutoTuner = DirectorAutoTunerClass.getInstance();
