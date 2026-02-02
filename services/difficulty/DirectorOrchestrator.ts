/**
 * DirectorOrchestrator - Hierarchical AI Director Coordinator
 *
 * AI Director V2 - Main Entry Point
 *
 * Orchestrates three layers:
 * 1. Strategic (PID) - Long-term flow state targeting
 * 2. Tactical (Rules) - Market-to-gameplay mapping
 * 3. Reactive (Thresholds) - Emergency interventions
 *
 * Usage:
 *   const output = DirectorOrchestrator.update({
 *     playerHP: 0.6,
 *     playerMaxHP: 100,
 *     marketRSI: 45,
 *     marketATR: 0.8,
 *     ...
 *   });
 *
 * @see docs/AI_DIRECTOR_V2_DESIGN.md
 */

import { Logger } from '../system/Logger';
import { EventBus } from '../core/EventBus';
import { StrategicLayer, type StrategicOutput } from './layers/StrategicLayer';
import {
  TacticalLayer,
  type TacticalOutput,
  type MarketIndicators,
} from './layers/TacticalLayer';
import {
  ReactiveLayer,
  type DirectorOutput,
  type PlayerState,
} from './layers/ReactiveLayer';

/**
 * Input for director update
 */
export interface DirectorInput {
  // Player state
  playerHP: number;
  playerMaxHP: number;
  playerIsDead: boolean;
  playerLastDeathTime: number;
  playerCombo: number;
  playerRecentDamage: number;

  // Market indicators
  marketRSI: number; // 0-100
  marketATRPercent: number; // ATR as percentage
  marketVolume: number; // Normalized 0-1
  marketPriceChange: number; // Recent price change %
  marketTrend: 'bullish' | 'bearish' | 'sideways';

  // Time
  deltaTime: number; // ms since last update
  gameTime: number; // Total game time in ms
}

/**
 * Orchestrator configuration
 */
export const ORCHESTRATOR_CONFIG = {
  // Minimum update interval
  MIN_UPDATE_INTERVAL_MS: 16, // ~60fps

  // Layer enable flags (for testing/debugging)
  STRATEGIC_ENABLED: true,
  TACTICAL_ENABLED: true,
  REACTIVE_ENABLED: true,

  // Debug mode
  DEBUG_LOGGING: false,
} as const;

/**
 * Director state for UI/debugging
 */
export interface DirectorState {
  strategic: StrategicOutput;
  tactical: TacticalOutput | null;
  output: DirectorOutput;
  lastUpdateTime: number;
  updateCount: number;
}

/**
 * DirectorOrchestrator - Singleton
 */
class DirectorOrchestratorClass {
  private static instance: DirectorOrchestratorClass | null = null;

  private lastUpdateTime: number = 0;
  private updateCount: number = 0;
  private lastStrategicOutput: StrategicOutput | null = null;
  private lastTacticalOutput: TacticalOutput | null = null;
  private lastOutput: DirectorOutput | null = null;

  private constructor() {
    this.setupEventListeners();
    Logger.info('[DirectorOrchestrator] Hierarchical AI Director V2 initialized');
  }

  static getInstance(): DirectorOrchestratorClass {
    return (DirectorOrchestratorClass.instance ??= new DirectorOrchestratorClass());
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    EventBus.on('gameReset', () => this.reset());
    EventBus.on('gameStart', () => this.onGameStart());
  }

  /**
   * Handle game start
   */
  private onGameStart(): void {
    this.updateCount = 0;
    Logger.info('[DirectorOrchestrator] Game started, director active');
  }

  /**
   * Main update function - call every frame
   *
   * @param input - Current game state
   * @returns Director output for spawn system
   */
  update(input: DirectorInput): DirectorOutput {
    const now = Date.now();
    const config = ORCHESTRATOR_CONFIG;

    // Rate limit updates
    if (now - this.lastUpdateTime < config.MIN_UPDATE_INTERVAL_MS) {
      return this.lastOutput ?? this.getDefaultOutput();
    }

    this.lastUpdateTime = now;
    this.updateCount++;

    // === LAYER 1: STRATEGIC (PID Controller) ===
    let strategicOutput: StrategicOutput;
    if (config.STRATEGIC_ENABLED) {
      const hpPercent = input.playerHP / input.playerMaxHP;
      strategicOutput = StrategicLayer.update(hpPercent, input.deltaTime);
    } else {
      strategicOutput = this.getDefaultStrategicOutput();
    }
    this.lastStrategicOutput = strategicOutput;

    // === LAYER 2: TACTICAL (Market Mapping) ===
    let tacticalOutput: TacticalOutput;
    if (config.TACTICAL_ENABLED) {
      const marketIndicators: MarketIndicators = {
        rsi: input.marketRSI,
        atrPercent: input.marketATRPercent,
        normalizedVolume: input.marketVolume,
        priceChangePercent: input.marketPriceChange,
        trend: input.marketTrend,
      };
      tacticalOutput = TacticalLayer.update(marketIndicators, strategicOutput);
    } else {
      tacticalOutput = this.getDefaultTacticalOutput(strategicOutput);
    }
    this.lastTacticalOutput = tacticalOutput;

    // === LAYER 3: REACTIVE (Emergency Interventions) ===
    let finalOutput: DirectorOutput;
    if (config.REACTIVE_ENABLED) {
      const playerState: PlayerState = {
        hpPercent: input.playerHP / input.playerMaxHP,
        isDead: input.playerIsDead,
        lastDeathTime: input.playerLastDeathTime,
        currentCombo: input.playerCombo,
        recentDamageTaken: input.playerRecentDamage,
      };
      finalOutput = ReactiveLayer.process(playerState, tacticalOutput);
    } else {
      finalOutput = this.tacticalToFinalOutput(tacticalOutput, strategicOutput);
    }

    this.lastOutput = finalOutput;

    // Debug logging
    if (config.DEBUG_LOGGING && this.updateCount % 60 === 0) {
      Logger.debug(
        `[Director] Flow=${finalOutput.flowState}, ` +
          `Spawn=${finalOutput.spawnRate.toFixed(2)}, ` +
          `Elite=${(finalOutput.eliteChance * 100).toFixed(0)}%, ` +
          `${finalOutput.interventionActive ? 'INTERVENTION' : 'normal'}`
      );
    }

    return finalOutput;
  }

  /**
   * Convert tactical output to final output (when reactive disabled)
   */
  private tacticalToFinalOutput(
    tactical: TacticalOutput,
    strategic: StrategicOutput
  ): DirectorOutput {
    return {
      spawnRate: 1.0 + (tactical.strategicMultiplier - 1) * 0.5,
      eliteChance: tactical.eliteChanceBonus,
      bossChance: 0,

      enemyDamageMultiplier: 1.0,
      enemySpeedMultiplier: 1.0,
      enemyHealthMultiplier: 1.0,

      bearSpawnWeight: tactical.bearSpawnMultiplier,
      bullSpawnWeight: tactical.bullSpawnMultiplier,

      shouldSpawnWhale: tactical.shouldSpawnWhale,
      whaleType: tactical.whaleType,
      shouldSpawnPortal: tactical.shouldSpawnPortal,
      portalType: tactical.portalType,

      flowState: strategic.flowState,
      interventionActive: false,
      debugInfo: tactical.marketCondition,
    };
  }

  /**
   * Get default strategic output
   */
  private getDefaultStrategicOutput(): StrategicOutput {
    return {
      difficultyMultiplier: 1.0,
      flowState: 'flow',
      deviationMagnitude: 0,
      trend: 0,
      confidence: 0,
      pid: {
        error: 0,
        integral: 0,
        derivative: 0,
        lastError: 0,
        lastUpdateTime: 0,
        output: 1.0,
        smoothedOutput: 1.0,
      },
    };
  }

  /**
   * Get default tactical output
   */
  private getDefaultTacticalOutput(strategic: StrategicOutput): TacticalOutput {
    return {
      bearSpawnMultiplier: 1.0,
      bullSpawnMultiplier: 1.0,
      eliteChanceBonus: 0.1,
      speedVariance: 0.2,

      shouldSpawnWhale: false,
      whaleType: null,
      shouldSpawnPortal: false,
      portalType: null,

      chaosLevel: 'normal',
      marketMood: 'neutral',
      strategicMultiplier: strategic.difficultyMultiplier,

      marketCondition: 'Default',
    };
  }

  /**
   * Get default output
   */
  private getDefaultOutput(): DirectorOutput {
    return {
      spawnRate: 1.0,
      eliteChance: 0.1,
      bossChance: 0,

      enemyDamageMultiplier: 1.0,
      enemySpeedMultiplier: 1.0,
      enemyHealthMultiplier: 1.0,

      bearSpawnWeight: 1.0,
      bullSpawnWeight: 1.0,

      shouldSpawnWhale: false,
      whaleType: null,
      shouldSpawnPortal: false,
      portalType: null,

      flowState: 'flow',
      interventionActive: false,
      debugInfo: 'Default',
    };
  }

  /**
   * Get current state (for UI/debugging)
   */
  getState(): DirectorState | null {
    if (!this.lastStrategicOutput || !this.lastOutput) {
      return null;
    }

    return {
      strategic: this.lastStrategicOutput,
      tactical: this.lastTacticalOutput,
      output: this.lastOutput,
      lastUpdateTime: this.lastUpdateTime,
      updateCount: this.updateCount,
    };
  }

  /**
   * Enable/disable debug logging
   */
  setDebugLogging(enabled: boolean): void {
    (ORCHESTRATOR_CONFIG as { DEBUG_LOGGING: boolean }).DEBUG_LOGGING = enabled;
  }

  /**
   * Enable/disable specific layers
   */
  setLayerEnabled(
    layer: 'strategic' | 'tactical' | 'reactive',
    enabled: boolean
  ): void {
    switch (layer) {
      case 'strategic':
        (ORCHESTRATOR_CONFIG as { STRATEGIC_ENABLED: boolean }).STRATEGIC_ENABLED =
          enabled;
        break;
      case 'tactical':
        (ORCHESTRATOR_CONFIG as { TACTICAL_ENABLED: boolean }).TACTICAL_ENABLED =
          enabled;
        break;
      case 'reactive':
        (ORCHESTRATOR_CONFIG as { REACTIVE_ENABLED: boolean }).REACTIVE_ENABLED =
          enabled;
        break;
    }
    Logger.info(
      `[DirectorOrchestrator] ${layer} layer ${enabled ? 'enabled' : 'disabled'}`
    );
  }

  /**
   * Get debug state from all layers
   */
  getDebugState(): Record<string, unknown> {
    return {
      orchestrator: {
        updateCount: this.updateCount,
        lastUpdateTime: this.lastUpdateTime,
      },
      strategic: StrategicLayer.getDebugState(),
      tactical: TacticalLayer.getDebugState(),
      reactive: ReactiveLayer.getDebugState(),
      config: { ...ORCHESTRATOR_CONFIG },
    };
  }

  /**
   * Reset all layers
   */
  reset(): void {
    this.lastUpdateTime = 0;
    this.updateCount = 0;
    this.lastStrategicOutput = null;
    this.lastTacticalOutput = null;
    this.lastOutput = null;

    StrategicLayer.reset();
    TacticalLayer.reset();
    ReactiveLayer.reset();

    Logger.debug('[DirectorOrchestrator] All layers reset');
  }
}

// Export singleton
export const DirectorOrchestrator = DirectorOrchestratorClass.getInstance();

// For testing
export function createDirectorOrchestrator(): DirectorOrchestratorClass {
  (DirectorOrchestratorClass as unknown as { instance: null }).instance = null;
  return DirectorOrchestratorClass.getInstance();
}

// Re-export layer types for convenience
export type {
  StrategicOutput,
  TacticalOutput,
  DirectorOutput,
  MarketIndicators,
  PlayerState,
};
