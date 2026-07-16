/**
 * GameStateManager - Centralized Game State Reset Service
 *
 * Single source of truth for all game state reset operations.
 * Coordinates reset across all game systems to ensure consistency.
 */

import { MarketPosition, type LeverageOption, type PlayerStats } from '../../types';
import { type CryptoPair } from '../../types/crypto';
import { EventBus } from './EventBus';
import { ResetOrchestrator } from './ResetOrchestrator';
import { ComboSystem } from '../combat/ComboSystem';
import { MetricsService } from './MetricsService';
import { GameSessionService } from '../auth/GameSessionService';
import { EventRecorderService } from './EventRecorderService';
import { UserSessionService } from '../auth/UserSessionService';
import { difficultyContext } from '../difficulty/DifficultyContext';
import { LeverageEngine } from '../gameplay/LeverageEngine';
import { MarketCalculator } from '../market/MarketCalculator';
import { deriveDirectorSeed } from '../director/DirectorSpawnOrchestrator';

// ============================================================================
// INITIAL STATE CONSTANTS
// ============================================================================

import { STAT_DEFINITIONS } from '../../config/StatRegistry';
import { PLAYER_STATS } from '../../config/PlayerConfig';

export const PLAYER_DEFAULTS = {
  radius: PLAYER_STATS.RADIUS,
  level: PLAYER_STATS.INITIAL_LEVEL,
  exp: PLAYER_STATS.INITIAL_EXP,
  nextLevelExp: PLAYER_STATS.INITIAL_NEXT_LEVEL_EXP,

  // I-Frame timer (must start at 0 for damage to work)
  invulnerabilityTimer: 0,
  dashCooldownMultiplier: 1,
  expMultiplier: 1,

  // Directly from Registry
  ...(Object.values(STAT_DEFINITIONS).reduce((acc, stat) => {
    acc[stat.id as keyof PlayerStats] = stat.defaultValue;
    return acc;
  }, {} as Partial<PlayerStats>) as PlayerStats),
};

export const GAME_STATE_DEFAULTS = {
  spawnTimer: 0,
  fireTimer: 0,
  lastFireTime: 0,
  shake: 0,
  critFlash: 0,
  critFlashColor: '#ffffff',
  lastTime: 0,
  levelUpFreeze: 0,
  isDashing: false,
  dashTimer: 0,
  dashCooldownTimer: 0,
  dashTrail: [],
  dashTrailAccumulator: 0,
  currentBg: { r: 2, g: 6, b: 23 },
  isGameOverTriggered: false,
  // Double Dash
  doubleDashQueued: false,
  doubleDashUsed: false,
  dashHaloOpacity: 0,
  // Hit Stop
  hitStopTimer: 0,
  // Squash & Stretch
  playerScaleX: 1,
  playerScaleY: 1,
  playerRotation: 0,
  // Near Miss Tension
  nearMissTimer: 0,
  nearMissCooldown: 0,
  // Visual tracking
  damageIndicators: [],
  bgUpdateFrameCounter: 0,
  lastHeartbeatTime: 0,
  rsiVisualState: 'NEUTRAL',
  whaleEventTimer: 0,
  // Market Indicators (set to initial safe values)
  atrPercent: 0,
  spawnRateMultiplier: 1,
  marketPosition: MarketPosition.LONG,
} as const;

export const RUN_STATS_DEFAULTS = {
  totalKills: 0,
  maxStreak: 0,
  totalBonusXp: 0,
} as const;

// ============================================================================
// GAME STATE MANAGER CLASS
// ============================================================================

import { Logger } from '../system/Logger';

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
  resetAll(leverage: number = 1): void {
    if (this.isResetting) {
      Logger.warn(
        '[GameStateManager] Reset already in progress, skipping duplicate call'
      );
      return;
    }

    this.isResetting = true;

    try {
      // Emit before reset event for any cleanup operations
      EventBus.emit('beforeReset', {});

      // Run orchestrated reset handlers in priority order, then emit
      // legacy `gameReset` for any listeners not yet migrated.
      ResetOrchestrator.orchestrateReset();

      // Apply the chosen leverage on top of the clean slate.
      LeverageEngine.setLeverage(leverage);
      difficultyContext.updateInputs({
        leverage,
        level: PLAYER_DEFAULTS.level,
        elapsedSeconds: 0,
        pnlHistory: [],
      });
      ComboSystem.startGame();

      // Emit after reset event for UI updates
      EventBus.emit('afterReset', {});
    } finally {
      this.isResetting = false;
    }
  }

  /**
   * Initialize a new game session.
   * Called when player selects Long/Short and starts playing.
   */
  async initializeNewGame(
    position: MarketPosition,
    entryPrice: number,
    leverage: LeverageOption,
    pair: CryptoPair
  ): Promise<boolean> {
    // Ensure clean state before starting
    this.resetAll(leverage);

    // 1. Start server session to get secret and ID
    try {
      const serverSession = await GameSessionService.startSession(
        pair,
        leverage,
        position
      );

      if (!serverSession) {
        Logger.error('[GameStateManager] Failed to initialize server session');
        return false;
      }

      const liquidationPrice = MarketCalculator.calculateLiquidationPrice({
        entryPrice,
        leverage,
        position,
      });
      const runSeed = deriveDirectorSeed(serverSession.sessionId);

      // 2. Start metrics tracking for this session
      MetricsService.startSession(
        position,
        entryPrice,
        leverage,
        pair,
        serverSession.sessionId,
        serverSession.sessionSecret
      );

      // 3. Start Event Recording (Signed Replay)
      EventRecorderService.startSession(
        {
          sessionId: serverSession.sessionId,
          pair,
          position: position === MarketPosition.LONG ? 'LONG' : 'SHORT',
          leverage,
          entryPrice,
          playerNickname: UserSessionService.getNickname() ?? 'Anonymous',
        },
        serverSession.sessionSecret
      );

      // Emit game initialized event
      EventBus.emit('gameInitialized', {
        position,
        entryPrice,
        leverage,
        pair,
        sessionId: serverSession.sessionId,
      });

      // Emit gameStart event for DifficultyContext V2
      EventBus.emit('gameStart', {
        leverage,
        position: position === MarketPosition.LONG ? 'LONG' : 'SHORT',
        entryPrice,
      });

      EventBus.emit('difficultyRunInitialized', {
        runId: serverSession.sessionId,
        seed: runSeed,
        side: position === MarketPosition.LONG ? 'LONG' : 'SHORT',
        leverage,
        entryPrice,
        liquidationPrice,
      });

      return true;
    } catch (error) {
      // Re-throw identity/session bootstrap errors so App.tsx can handle UI routing.
      if (
        error instanceof Error &&
        (error.message === 'PROFILE_NOT_FOUND' || error.message === 'NICKNAME_REQUIRED')
      ) {
        throw error;
      }
      Logger.error('[GameStateManager] Error initializing game', error);
      return false;
    }
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
