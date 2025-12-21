/**
 * GameStateManager - Centralized Game State Reset Service
 *
 * Single source of truth for all game state reset operations.
 * Coordinates reset across all game systems to ensure consistency.
 */

import { type MarketPosition } from '../types';
import { type CryptoPair } from '../types/crypto';
import { EventBus } from './EventBus';
import { DifficultyManager } from './DifficultyManager';
import { ComboSystem } from './ComboSystem';
import { MetricsService } from './MetricsService';

// ============================================================================
// INITIAL STATE CONSTANTS
// ============================================================================

export const PLAYER_DEFAULTS = {
  radius: 12,
  hp: 100,
  maxHp: 100,
  level: 1,
  exp: 0,
  nextLevelExp: 100,
  speed: 4,
  fireRate: 400, // INITIAL_FIRE_RATE
  critChance: 0.05,
  baseDamage: 25,
  luck: 0,
  magnet: 0,
  armor: 0,
  area: 1,
  projectiles: 1,
} as const;

export const GAME_STATE_DEFAULTS = {
  spawnTimer: 0,
  lastFireTime: 0,
  shake: 0,
  critFlash: 0,
  lastTime: 0,
  levelUpFreeze: 0,
  isDashing: false,
  dashTimer: 0,
  dashCooldownTimer: 0,
  dashTrailAccumulator: 0,
  currentBg: { r: 2, g: 6, b: 23 },
} as const;

export const RUN_STATS_DEFAULTS = {
  totalKills: 0,
  maxStreak: 0,
  totalBonusXp: 0,
} as const;

// ============================================================================
// GAME STATE MANAGER CLASS
// ============================================================================

import { Logger } from './Logger';

class GameStateManagerClass {
  private static instance: GameStateManagerClass | null = null;
  private isResetting: boolean = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): GameStateManagerClass {
    return (GameStateManagerClass.instance ??= new GameStateManagerClass());
  }

  /**
   * Reset all game systems to their initial state.
   * Called when returning to menu or restarting the game.
   */
  resetAll(): void {
    if (this.isResetting) {
      Logger.warn('[GameStateManager] Reset already in progress, skipping duplicate call');
      return;
    }

    this.isResetting = true;

    try {
      // Emit before reset event for any cleanup operations
      EventBus.emit('beforeReset', {});

      // Reset all game systems
      DifficultyManager.startGame();
      ComboSystem.startGame();

      // Emit after reset event for UI updates
      EventBus.emit('afterReset', {});

      // Legacy event for backwards compatibility (can be removed after full migration)
      EventBus.emit('gameReset', {});
    } finally {
      this.isResetting = false;
    }
  }

  /**
   * Initialize a new game session.
   * Called when player selects Long/Short and starts playing.
   */
  initializeNewGame(
    position: MarketPosition,
    entryPrice: number,
    leverage: number,
    pair: CryptoPair
  ): void {
    // Ensure clean state before starting
    this.resetAll();

    // Start metrics tracking for this session
    MetricsService.startSession(position, entryPrice, leverage, pair);

    // Emit game initialized event
    EventBus.emit('gameInitialized', { position, entryPrice, leverage, pair });
  }

  /**
   * Get fresh player defaults with position
   */
  getPlayerDefaults(
    centerX: number,
    centerY: number,
    color: string
  ): typeof PLAYER_DEFAULTS & { x: number; y: number; color: string } {
    return {
      ...PLAYER_DEFAULTS,
      x: centerX,
      y: centerY,
      color,
    };
  }

  /**
   * Get fresh game state defaults
   */
  getGameStateDefaults(): typeof GAME_STATE_DEFAULTS {
    return { ...GAME_STATE_DEFAULTS };
  }

  /**
   * Get fresh run stats defaults
   */
  getRunStatsDefaults(): typeof RUN_STATS_DEFAULTS {
    return { ...RUN_STATS_DEFAULTS };
  }

  /**
   * Check if a reset is currently in progress
   */
  isResetInProgress(): boolean {
    return this.isResetting;
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const GameStateManager = GameStateManagerClass.getInstance();
