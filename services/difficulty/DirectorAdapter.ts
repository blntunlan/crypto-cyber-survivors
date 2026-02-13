/**
 * DirectorAdapter - Bridge between DirectorOrchestrator and DifficultyManager
 *
 * Converts the hierarchical AI Director output to DifficultyOutput format
 * that the existing game systems expect.
 *
 * This allows gradual migration from the old system to the new one.
 *
 * @see docs/AI_DIRECTOR_V2_DESIGN.md
 */

import {
  DirectorOrchestrator,
  type DirectorInput,
  type DirectorOutput,
} from './DirectorOrchestrator';
import { type DifficultyOutput } from '../gameplay/DifficultyTypes';
import { Logger } from '../system/Logger';
import { EventBus } from '../core/EventBus';
import { TimeService } from '../core/TimeService';
import { DIFFICULTY_CONFIG } from '../../config';
import { clamp } from './utils';
import { difficultyContext } from './DifficultyContext';

/**
 * Adapter configuration
 */
const ADAPTER_CONFIG = {
  // Enable/disable the new Director (feature flag)
  ENABLED: true,

  // Blend factor: 0 = old system only, 1 = new Director only
  BLEND_FACTOR: 0.7,

  // Output scaling to match existing system expectations
  SPAWN_RATE_SCALE: 1.0,
  ENEMY_SPEED_SCALE: 1.0,
  ENEMY_DAMAGE_SCALE: 1.0,
  ENEMY_HP_SCALE: 1.0,
} as const;

/**
 * Player state cache for Director input
 */
interface CachedPlayerState {
  hp: number;
  maxHP: number;
  isDead: boolean;
  lastDeathTime: number;
  combo: number;
  recentDamage: number;
}

/**
 * DirectorAdapter - Singleton
 */
class DirectorAdapterClass {
  private static instance: DirectorAdapterClass | null = null;

  private playerState: CachedPlayerState = {
    hp: 100,
    maxHP: 100,
    isDead: false,
    lastDeathTime: 0,
    combo: 0,
    recentDamage: 0,
  };

  private lastDirectorOutput: DirectorOutput | null = null;
  private enabled: boolean = ADAPTER_CONFIG.ENABLED;
  private blendFactor: number = ADAPTER_CONFIG.BLEND_FACTOR;

  private constructor() {
    this.setupEventListeners();
    Logger.info('[DirectorAdapter] AI Director V2 bridge initialized');
  }

  static getInstance(): DirectorAdapterClass {
    return (DirectorAdapterClass.instance ??= new DirectorAdapterClass());
  }

  /**
   * Setup event listeners for player state tracking
   */
  private setupEventListeners(): void {
    EventBus.on('playerHit', data => {
      this.playerState.recentDamage += data.damage;
    });

    EventBus.on('playerDeath', () => {
      this.playerState.isDead = true;
      this.playerState.lastDeathTime = Date.now();
    });

    EventBus.on('playerRespawn', () => {
      this.playerState.isDead = false;
    });

    EventBus.on('comboUpdate', data => {
      this.playerState.combo = data.combo;
    });

    EventBus.on('gameReset', () => this.reset());

    // Decay recent damage over time (using standard setInterval, not TimeService)
    setInterval(() => {
      this.playerState.recentDamage *= 0.9;
    }, 100);
  }

  /**
   * Update player HP (called from GameEngine)
   */
  updatePlayerHP(current: number, max: number): void {
    this.playerState.hp = current;
    this.playerState.maxHP = max;
  }

  /**
   * Get Director recommendation and convert to DifficultyOutput
   *
   * @param oldOutput - Output from the existing DifficultyManager
   * @returns Blended output
   */
  process(oldOutput: DifficultyOutput): DifficultyOutput {
    if (!this.enabled) {
      return oldOutput;
    }

    // Build Director input from current game state
    const gameTime = TimeService.getGameTime();
    const context = difficultyContext.getContext();
    const marketRSI = Number.isFinite(context.inputs.rsi) ? context.inputs.rsi : 50;
    const marketATRPercent = Number.isFinite(context.inputs.atrPercent)
      ? context.inputs.atrPercent
      : 0;
    const marketVolume = Number.isFinite(context.inputs.normalizedVolume)
      ? context.inputs.normalizedVolume
      : 0.5;

    const input: DirectorInput = {
      // Player state
      playerHP: this.playerState.hp,
      playerMaxHP: this.playerState.maxHP,
      playerIsDead: this.playerState.isDead,
      playerLastDeathTime: this.playerState.lastDeathTime,
      playerCombo: this.playerState.combo,
      playerRecentDamage: this.playerState.recentDamage,

      // Market state
      marketRSI,
      marketATRPercent,
      marketVolume,
      marketPriceChange: 0,
      marketTrend: this.determineTrend(marketRSI),

      // Time (with safe fallback for tests)
      deltaTime:
        typeof TimeService.getDeltaTime === 'function'
          ? TimeService.getDeltaTime()
          : 16,
      gameTime,
    };

    // Get Director output
    const directorOutput = DirectorOrchestrator.update(input);
    this.lastDirectorOutput = directorOutput;

    // Blend old and new outputs
    return this.blendOutputs(oldOutput, directorOutput);
  }

  /**
   * Determine market trend from RSI
   */
  private determineTrend(rsi: number): 'bullish' | 'bearish' | 'sideways' {
    if (rsi > 60) return 'bullish';
    if (rsi < 40) return 'bearish';
    return 'sideways';
  }

  /**
   * Blend old DifficultyManager output with new Director output
   */
  private blendOutputs(
    old: DifficultyOutput,
    director: DirectorOutput
  ): DifficultyOutput {
    const blend = this.blendFactor;
    const oldWeight = 1 - blend;

    // Map Director outputs to DifficultyOutput format
    const directorSpawn = director.spawnRate * ADAPTER_CONFIG.SPAWN_RATE_SCALE;
    const directorSpeed =
      director.enemySpeedMultiplier * ADAPTER_CONFIG.ENEMY_SPEED_SCALE;
    const directorDamage =
      director.enemyDamageMultiplier * ADAPTER_CONFIG.ENEMY_DAMAGE_SCALE;
    const directorHP = director.enemyHealthMultiplier * ADAPTER_CONFIG.ENEMY_HP_SCALE;

    // Blend values
    const output: DifficultyOutput = {
      spawnRate: clamp(
        old.spawnRate * oldWeight + directorSpawn * blend,
        DIFFICULTY_CONFIG.LIMITS.spawnRate.min,
        DIFFICULTY_CONFIG.LIMITS.spawnRate.max
      ),
      enemySpeed: clamp(
        old.enemySpeed * oldWeight + directorSpeed * blend,
        DIFFICULTY_CONFIG.LIMITS.enemySpeed.min,
        DIFFICULTY_CONFIG.LIMITS.enemySpeed.max
      ),
      enemyDamage: clamp(
        old.enemyDamage * oldWeight + directorDamage * blend,
        DIFFICULTY_CONFIG.LIMITS.enemyDamage.min,
        DIFFICULTY_CONFIG.LIMITS.enemyDamage.max
      ),
      enemyHealth: clamp(
        old.enemyHealth * oldWeight + directorHP * blend,
        DIFFICULTY_CONFIG.LIMITS.enemyHP.min,
        DIFFICULTY_CONFIG.LIMITS.enemyHP.max
      ),
      gemValueMultiplier: old.gemValueMultiplier,
      total: old.total, // Keep old total for compatibility
      factors: old.factors, // Keep old factors for debugging
    };

    // Emit blended output for monitoring
    EventBus.emit('directorBlendedOutput', {
      flowState: director.flowState,
      interventionActive: director.interventionActive,
      blendFactor: this.blendFactor,
      spawnRate: output.spawnRate,
    });

    return output;
  }

  /**
   * Get the last Director output for debugging
   */
  getLastDirectorOutput(): DirectorOutput | null {
    return this.lastDirectorOutput;
  }

  /**
   * Get debug state
   */
  getDebugState(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      blendFactor: this.blendFactor,
      playerState: { ...this.playerState },
      lastOutput: this.lastDirectorOutput,
      orchestratorState: DirectorOrchestrator.getDebugState(),
    };
  }

  /**
   * Enable/disable the Director
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    Logger.info(`[DirectorAdapter] Director ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set blend factor (0 = old only, 1 = new only)
   */
  setBlendFactor(factor: number): void {
    this.blendFactor = Math.max(0, Math.min(1, factor));
    Logger.info(`[DirectorAdapter] Blend factor set to ${this.blendFactor}`);
  }

  /**
   * Reset state
   */
  reset(): void {
    this.playerState = {
      hp: 100,
      maxHP: 100,
      isDead: false,
      lastDeathTime: 0,
      combo: 0,
      recentDamage: 0,
    };
    this.lastDirectorOutput = null;
    DirectorOrchestrator.reset();
    Logger.debug('[DirectorAdapter] State reset');
  }
}

// Export singleton
export const DirectorAdapter = DirectorAdapterClass.getInstance();

// For testing
export function createDirectorAdapter(): DirectorAdapterClass {
  (DirectorAdapterClass as unknown as { instance: null }).instance = null;
  return DirectorAdapterClass.getInstance();
}
