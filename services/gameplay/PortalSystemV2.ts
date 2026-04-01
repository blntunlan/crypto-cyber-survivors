/**
 * PortalSystemV2 - Dynamic Exit Point System (Thin Coordinator)
 *
 * Delegates to:
 *   - PortalTrigger: trigger condition evaluation
 *   - PortalPenaltyManager: rejection tracking & difficulty penalties
 *   - PortalRewardCalculator: coin reward calculation
 *
 * Public API is fully backward-compatible.
 *
 * @see docs/AI_DIRECTOR_V2_DESIGN.md
 */

import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';
import { TimeService } from '../core/TimeService';
import { type FlowState } from '../difficulty/FlowStateManager';
import { PortalTrigger } from './portal/PortalTrigger';
import { PortalPenaltyManager } from './portal/PortalPenaltyManager';
import { PortalRewardCalculator } from './portal/PortalRewardCalculator';

// =============================================================================
// CONFIG & TYPES (re-exported for backward compat)
// =============================================================================

export const PORTAL_V2_CONFIG = {
  FIRST_PORTAL_MIN_TIME: 300,
  MAX_GAME_TIME: 600,
  PORTAL_COOLDOWN: 180,
  PORTAL_DURATION: 25,
  TAKE_PROFIT_THRESHOLD: 0.1,
  STOP_LOSS_THRESHOLD: -0.15,
  OUT_OF_FLOW_DURATION: 60,
  MAX_PORTALS: 3,
  MAX_REJECTIONS: 3,
  REJECTION_PENALTIES: [
    { spawnRateIncrease: 0.2, speedIncrease: 0, cooldownExtension: 60 },
    { spawnRateIncrease: 0.3, speedIncrease: 0.1, cooldownExtension: 90 },
    { spawnRateIncrease: 0.4, speedIncrease: 0.2, cooldownExtension: 0 },
  ],
  COIN_MULTIPLIERS: {
    TAKE_PROFIT_BONUS: 1.2,
    STOP_LOSS_PENALTY: 0,
    FLOW_EXIT_MULT: 0.5,
    DEATH_PENALTY: 0.5,
    AFK_DEATH_PENALTY: 0,
  },
} as const;

export type PortalType = 'TAKE_PROFIT' | 'STOP_LOSS' | 'FLOW_EXIT' | 'FORCED';

export interface PortalV2State {
  isActive: boolean;
  type: PortalType;
  x: number;
  y: number;
  radius: number;
  timeLeft: number;
  portalNumber: number;
}

export interface PortalSessionState {
  portalsOpened: number;
  portalsRejected: number;
  lastPortalTime: number;
  outOfFlowStartTime: number | null;
  isFlashCrashActive: boolean;
  lastWhaleKillTime: number;
  difficultyPenalty: {
    spawnRateMultiplier: number;
    speedMultiplier: number;
  };
}

export type PortalTriggerReason =
  | 'TAKE_PROFIT'
  | 'STOP_LOSS'
  | 'OUT_OF_FLOW'
  | 'MAX_TIME'
  | 'POST_FLASH_CRASH'
  | 'POST_WHALE_KILL'
  | 'FORCED_FINAL';

export interface CoinRewardResult {
  total: number;
  breakdown: {
    raw: number;
    enemyDrops: number;
    survivalBonus: number;
    portalBonus: number;
    comboBonus: number;
  };
  exitType: 'portal' | 'death' | 'afk_death';
  portalType: PortalType | null;
}

// =============================================================================
// COORDINATOR
// =============================================================================

class PortalSystemV2Class {
  private static instance: PortalSystemV2Class | null = null;

  // Sub-services
  private readonly trigger = new PortalTrigger();
  private readonly penaltyManager = new PortalPenaltyManager();
  private readonly rewardCalculator = new PortalRewardCalculator();

  // Portal state
  private portalState: PortalV2State = {
    isActive: false,
    type: 'TAKE_PROFIT',
    x: 0,
    y: 0,
    radius: 50,
    timeLeft: 0,
    portalNumber: 0,
  };

  // Session state
  private portalsOpened = 0;
  private lastPortalTime = 0;
  private outOfFlowStartTime: number | null = null;
  private isFlashCrashActive = false;
  private lastWhaleKillTime = 0;

  // Coin tracking
  private rawCoins = 0;
  private enemyDropCoins = 0;
  private maxStreak = 0;
  private currentPnL = 0;
  private currentFlowState: FlowState = 'flow';

  // Kill & level tracking
  private killCount = 0;
  private currentLevel = 1;

  private constructor() {
    EventBus.on('gameReset', () => this.reset());
    EventBus.on('enemyKilled', data => this.onEnemyKilled(data));
    EventBus.on('flowStateChanged', data => this.onFlowStateChanged(data.newState));
    EventBus.on('playerLevelUp', data => {
      this.currentLevel = data.level;
    });

    // Flash crash detection from legacy event
    EventBus.on('clientIndicatorsUpdated', data => {
      if (data.priceChangePercent <= -0.01) this.onFlashCrash();
    });

    // Canonical consolidated event (Step 3)
    EventBus.on('canonicalMarketUpdate', data => {
      if (data.priceChangePercent <= -0.01) this.onFlashCrash();
    });

    Logger.debug('[PortalSystemV2] Initialized');
  }

  static getInstance(): PortalSystemV2Class {
    return (PortalSystemV2Class.instance ??= new PortalSystemV2Class());
  }

  // =========================================================================
  // MAIN UPDATE
  // =========================================================================

  update(dt: number, pnlPercent: number, width: number, height: number): void {
    this.currentPnL = pnlPercent;

    if (this.portalState.isActive) {
      this.portalState.timeLeft -= dt / 1000;
      if (this.portalState.timeLeft <= 0) {
        this.onPortalExpired();
      }
      return;
    }

    const elapsed = TimeService.getGameTimeSeconds();
    if (elapsed < PORTAL_V2_CONFIG.FIRST_PORTAL_MIN_TIME) return;

    const timeSinceLastPortal = elapsed - this.lastPortalTime;
    const effectiveCooldown =
      PORTAL_V2_CONFIG.PORTAL_COOLDOWN + this.penaltyManager.getCooldownExtension();
    if (timeSinceLastPortal < effectiveCooldown && this.portalsOpened > 0) return;

    const result = this.trigger.checkTriggerConditions(
      elapsed,
      this.currentPnL,
      this.portalsOpened,
      this.penaltyManager.getPortalsRejected(),
      this.outOfFlowStartTime,
      this.isFlashCrashActive,
      this.lastWhaleKillTime
    );

    // Reset flash crash flag after check
    if (this.isFlashCrashActive && result.reason === 'POST_FLASH_CRASH') {
      this.isFlashCrashActive = false;
    }
    // Reset whale kill after check
    if (result.reason === 'POST_WHALE_KILL') {
      this.lastWhaleKillTime = 0;
    }

    if (result.shouldSpawn) {
      this.spawnPortal(result.type, result.reason, width, height);
    }
  }

  // =========================================================================
  // PORTAL LIFECYCLE
  // =========================================================================

  private spawnPortal(
    type: PortalType,
    reason: PortalTriggerReason,
    width: number,
    height: number
  ): void {
    const portalNumber = this.portalsOpened + 1;
    const margin = 0.2;
    const x = (margin + Math.random() * (1 - 2 * margin)) * width;
    const y = (margin + Math.random() * (1 - 2 * margin)) * height;

    this.portalState = {
      isActive: true,
      type,
      x,
      y,
      radius: type === 'FORCED' ? 60 : 50,
      timeLeft: PORTAL_V2_CONFIG.PORTAL_DURATION,
      portalNumber,
    };

    this.portalsOpened = portalNumber;
    this.lastPortalTime = TimeService.getGameTimeSeconds();

    Logger.info(
      `[PortalSystemV2] ${type} Portal #${portalNumber} opened (reason: ${reason})`
    );
    EventBus.emit('portalOpened', {
      x,
      y,
      type,
      portalNumber,
      reason,
      isForced: type === 'FORCED',
    });
  }

  private onPortalExpired(): void {
    if (this.portalState.type === 'FORCED') {
      Logger.warn('[PortalSystemV2] Forced portal expired - game over');
      EventBus.emit('portalMissed', {
        type: this.portalState.type,
        portalNumber: this.portalState.portalNumber,
        consequence: 'game_over',
      });
    } else {
      this.penaltyManager.applyRejectionPenalty();
    }
    this.closePortal();
  }

  enterPortal(): CoinRewardResult {
    if (!this.portalState.isActive) {
      Logger.warn('[PortalSystemV2] enterPortal called but no active portal');
      return this.rewardCalculator.calculate(
        'portal',
        this.portalState.type,
        this.currentPnL,
        this.rawCoins,
        this.enemyDropCoins,
        this.maxStreak,
        this.killCount,
        this.currentLevel
      );
    }

    const portalType = this.portalState.type;
    Logger.info(
      `[PortalSystemV2] Player entered ${portalType} portal #${this.portalState.portalNumber}`
    );

    EventBus.emit('portalEntered', {
      type: portalType,
      portalNumber: this.portalState.portalNumber,
      pnlPercent: this.currentPnL,
    });

    this.closePortal();
    return this.rewardCalculator.calculate(
      'portal',
      portalType,
      this.currentPnL,
      this.rawCoins,
      this.enemyDropCoins,
      this.maxStreak,
      this.killCount,
      this.currentLevel
    );
  }

  onPlayerDeath(wasAFK = false): CoinRewardResult {
    Logger.info(`[PortalSystemV2] Player died (AFK: ${wasAFK})`);
    if (this.portalState.isActive) this.closePortal();
    return this.rewardCalculator.calculate(
      wasAFK ? 'afk_death' : 'death',
      null,
      this.currentPnL,
      this.rawCoins,
      this.enemyDropCoins,
      this.maxStreak,
      this.killCount,
      this.currentLevel
    );
  }

  private closePortal(): void {
    if (!this.portalState.isActive) return;
    this.portalState.isActive = false;
    Logger.debug('[PortalSystemV2] Portal closed');
    EventBus.emit('portalClosed', {
      type: this.portalState.type,
      portalNumber: this.portalState.portalNumber,
    });
  }

  // =========================================================================
  // EVENT HANDLERS
  // =========================================================================

  private onEnemyKilled(data: { enemyType?: string; coinDrop?: number }): void {
    this.killCount++;
    if (data.coinDrop && data.coinDrop > 0) {
      this.enemyDropCoins += data.coinDrop;
    } else if (data.enemyType === 'whale') {
      this.enemyDropCoins += 50;
    } else if (data.enemyType === 'elite') {
      this.enemyDropCoins += 15;
    } else {
      this.rawCoins += 1;
    }

    if (data.enemyType === 'whale') {
      this.lastWhaleKillTime = TimeService.getGameTime();
    }
  }

  private onFlowStateChanged(newState: FlowState): void {
    this.currentFlowState = newState;
    if (newState === 'flow') {
      this.outOfFlowStartTime = null;
    } else {
      this.outOfFlowStartTime ??= TimeService.getGameTime();
    }
  }

  private onFlashCrash(): void {
    this.isFlashCrashActive = true;
    Logger.info('[PortalSystemV2] Flash crash detected');
  }

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  addRawCoins(amount: number): void {
    this.rawCoins += amount;
  }
  setMaxStreak(streak: number): void {
    this.maxStreak = streak;
  }
  getPortalState(): PortalV2State {
    return { ...this.portalState };
  }

  getSessionState(): PortalSessionState {
    return {
      portalsOpened: this.portalsOpened,
      portalsRejected: this.penaltyManager.getPortalsRejected(),
      lastPortalTime: this.lastPortalTime,
      outOfFlowStartTime: this.outOfFlowStartTime,
      isFlashCrashActive: this.isFlashCrashActive,
      lastWhaleKillTime: this.lastWhaleKillTime,
      difficultyPenalty: this.penaltyManager.getDifficultyPenalty(),
    };
  }

  getDifficultyPenalty(): { spawnRateMultiplier: number; speedMultiplier: number } {
    return this.penaltyManager.getDifficultyPenalty();
  }

  getKillCount(): number {
    return this.killCount;
  }
  getCurrentLevel(): number {
    return this.currentLevel;
  }
  getRawCoins(): number {
    return this.rawCoins;
  }
  isPortalActive(): boolean {
    return this.portalState.isActive;
  }
  getPortalsRemaining(): number {
    return PORTAL_V2_CONFIG.MAX_PORTALS - this.portalsOpened;
  }
  isFinalPortal(): boolean {
    return this.portalsOpened >= PORTAL_V2_CONFIG.MAX_PORTALS - 1;
  }

  reset(): void {
    this.portalState = {
      isActive: false,
      type: 'TAKE_PROFIT',
      x: 0,
      y: 0,
      radius: 50,
      timeLeft: 0,
      portalNumber: 0,
    };
    this.portalsOpened = 0;
    this.lastPortalTime = 0;
    this.outOfFlowStartTime = null;
    this.isFlashCrashActive = false;
    this.lastWhaleKillTime = 0;
    this.rawCoins = 0;
    this.enemyDropCoins = 0;
    this.maxStreak = 0;
    this.currentPnL = 0;
    this.currentFlowState = 'flow';
    this.killCount = 0;
    this.currentLevel = 1;
    this.penaltyManager.reset();
    Logger.debug('[PortalSystemV2] Reset');
  }

  getDebugState(): Record<string, unknown> {
    return {
      isActive: this.portalState.isActive,
      type: this.portalState.type,
      portalNumber: this.portalState.portalNumber,
      timeLeft: this.portalState.timeLeft.toFixed(1),
      portalsOpened: this.portalsOpened,
      portalsRejected: this.penaltyManager.getPortalsRejected(),
      portalsRemaining: this.getPortalsRemaining(),
      cooldown:
        PORTAL_V2_CONFIG.PORTAL_COOLDOWN + this.penaltyManager.getCooldownExtension(),
      killCount: this.killCount,
      currentLevel: this.currentLevel,
      rawCoins: this.rawCoins,
      enemyDrops: this.enemyDropCoins,
      pnl: `${(this.currentPnL * 100).toFixed(1)}%`,
      flowState: this.currentFlowState,
      penalty: this.penaltyManager.getDifficultyPenalty(),
    };
  }
}

export const PortalSystemV2 = PortalSystemV2Class.getInstance();

export function createPortalSystemV2(): PortalSystemV2Class {
  (PortalSystemV2Class as unknown as { instance: null }).instance = null;
  return PortalSystemV2Class.getInstance();
}
