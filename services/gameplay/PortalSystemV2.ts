/**
 * PortalSystemV2 - Dynamic Exit Point System
 *
 * AI Director V2 - Phase 5: Portal System V2
 *
 * This system manages portal spawning and exit mechanics based on:
 * - PnL thresholds (Take Profit / Stop Loss)
 * - Flow state duration (too long outside flow)
 * - Market events (flash crash, whale kills)
 * - Time limits (max game duration)
 *
 * Key Features:
 * - Maximum 3 portals per game (forced exit on 3rd)
 * - Portal rejection penalties (difficulty increase + cooldown extension)
 * - Portal types: TAKE_PROFIT (green), STOP_LOSS (red), FLOW_EXIT (yellow)
 * - Coin calculation based on exit type and PnL
 *
 * @see docs/AI_DIRECTOR_V2_DESIGN.md
 */

import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';
import { TimeService } from '../core/TimeService';
import { type FlowState } from '../difficulty/FlowStateManager';

/**
 * Portal configuration - timing and thresholds
 */
export const PORTAL_V2_CONFIG = {
  // Timing Constraints
  FIRST_PORTAL_MIN_TIME: 300, // 5 minutes minimum (TODO: backtest)
  MAX_GAME_TIME: 600, // 10 minutes max without portal
  PORTAL_COOLDOWN: 180, // 3 minutes between portals
  PORTAL_DURATION: 25, // Seconds portal stays open

  // PnL Trigger Thresholds
  TAKE_PROFIT_THRESHOLD: 0.1, // +10% PnL
  STOP_LOSS_THRESHOLD: -0.15, // -15% PnL

  // Flow State Thresholds
  OUT_OF_FLOW_DURATION: 60, // 60s outside flow state triggers portal

  // Portal Limits
  MAX_PORTALS: 3,
  MAX_REJECTIONS: 3, // After 3 rejections, must take next portal

  // Rejection Penalties
  REJECTION_PENALTIES: [
    { spawnRateIncrease: 0.2, speedIncrease: 0, cooldownExtension: 60 },
    { spawnRateIncrease: 0.3, speedIncrease: 0.1, cooldownExtension: 90 },
    { spawnRateIncrease: 0.4, speedIncrease: 0.2, cooldownExtension: 0 }, // 3rd = forced
  ],

  // Coin Calculation
  COIN_MULTIPLIERS: {
    TAKE_PROFIT_BONUS: 1.2, // +20% for take profit
    STOP_LOSS_PENALTY: 0, // No survival bonus
    FLOW_EXIT_MULT: 0.5, // 50% survival bonus
    DEATH_PENALTY: 0.5, // 50% of raw coins
    AFK_DEATH_PENALTY: 0, // No coins for AFK death
  },
} as const;

/**
 * Portal types based on trigger condition
 */
export type PortalType = 'TAKE_PROFIT' | 'STOP_LOSS' | 'FLOW_EXIT' | 'FORCED';

/**
 * Portal state
 */
export interface PortalV2State {
  isActive: boolean;
  type: PortalType;
  x: number;
  y: number;
  radius: number;
  timeLeft: number;
  portalNumber: number; // 1, 2, or 3
}

/**
 * Session tracking for portal system
 */
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

/**
 * Trigger reason for portal spawn
 */
export type PortalTriggerReason =
  | 'TAKE_PROFIT'
  | 'STOP_LOSS'
  | 'OUT_OF_FLOW'
  | 'MAX_TIME'
  | 'POST_FLASH_CRASH'
  | 'POST_WHALE_KILL'
  | 'FORCED_FINAL';

/**
 * Portal trigger check result
 */
interface PortalTriggerResult {
  shouldSpawn: boolean;
  type: PortalType;
  reason: PortalTriggerReason;
}

/**
 * Coin reward calculation result
 */
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

/**
 * PortalSystemV2 - Singleton service
 */
class PortalSystemV2Class {
  private static instance: PortalSystemV2Class | null = null;

  // Current portal state
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
  private sessionState: PortalSessionState = {
    portalsOpened: 0,
    portalsRejected: 0,
    lastPortalTime: 0,
    outOfFlowStartTime: null,
    isFlashCrashActive: false,
    lastWhaleKillTime: 0,
    difficultyPenalty: {
      spawnRateMultiplier: 1.0,
      speedMultiplier: 1.0,
    },
  };

  // Coin tracking
  private rawCoins: number = 0;
  private enemyDropCoins: number = 0;
  private comboBonus: number = 0;

  // Current game state (updated externally)
  private currentPnL: number = 0;
  private currentFlowState: FlowState = 'flow';

  private constructor() {
    // Subscribe to game events
    EventBus.on('gameReset', () => this.reset());

    // Track coin sources
    EventBus.on('enemyKilled', data => {
      this.onEnemyKilled(data);
    });

    // Track flow state changes
    EventBus.on('flowStateChanged', data => {
      this.onFlowStateChanged(data.newState, data.previousState);
    });

    // Track market events
    EventBus.on('clientIndicatorsUpdated', data => {
      if (data.priceChangePercent <= -0.01) {
        this.onFlashCrash();
      }
    });

    Logger.debug('[PortalSystemV2] Initialized');
  }

  static getInstance(): PortalSystemV2Class {
    return (PortalSystemV2Class.instance ??= new PortalSystemV2Class());
  }

  /**
   * Update portal system - call every frame
   *
   * @param dt Delta time in ms
   * @param pnlPercent Current PnL percentage (-1 to 1+)
   * @param width Screen width
   * @param height Screen height
   */
  update(dt: number, pnlPercent: number, width: number, height: number): void {
    this.currentPnL = pnlPercent;

    // Update active portal timer
    if (this.portalState.isActive) {
      this.portalState.timeLeft -= dt / 1000;
      if (this.portalState.timeLeft <= 0) {
        this.onPortalExpired();
      }
      return;
    }

    // Check for new portal triggers
    const elapsed = TimeService.getGameTimeSeconds();

    // Minimum time check
    if (elapsed < PORTAL_V2_CONFIG.FIRST_PORTAL_MIN_TIME) {
      return;
    }

    // Cooldown check
    const timeSinceLastPortal = elapsed - this.sessionState.lastPortalTime;
    const effectiveCooldown = this.getEffectiveCooldown();

    if (
      timeSinceLastPortal < effectiveCooldown &&
      this.sessionState.portalsOpened > 0
    ) {
      return;
    }

    // Check trigger conditions
    const trigger = this.checkTriggerConditions(elapsed);

    if (trigger.shouldSpawn) {
      this.spawnPortal(trigger.type, trigger.reason, width, height);
    }
  }

  /**
   * Check all portal trigger conditions
   */
  private checkTriggerConditions(elapsedSeconds: number): PortalTriggerResult {
    const config = PORTAL_V2_CONFIG;

    // Priority 1: Max game time reached (forced final portal)
    if (elapsedSeconds >= config.MAX_GAME_TIME) {
      return { shouldSpawn: true, type: 'FORCED', reason: 'MAX_TIME' };
    }

    // Priority 2: Max portals reached (forced if previously rejected all)
    if (
      this.sessionState.portalsOpened >= config.MAX_PORTALS - 1 &&
      this.sessionState.portalsRejected >= config.MAX_REJECTIONS
    ) {
      return { shouldSpawn: true, type: 'FORCED', reason: 'FORCED_FINAL' };
    }

    // Priority 3: PnL-based triggers
    if (this.currentPnL >= config.TAKE_PROFIT_THRESHOLD) {
      return { shouldSpawn: true, type: 'TAKE_PROFIT', reason: 'TAKE_PROFIT' };
    }

    if (this.currentPnL <= config.STOP_LOSS_THRESHOLD) {
      return { shouldSpawn: true, type: 'STOP_LOSS', reason: 'STOP_LOSS' };
    }

    // Priority 4: Flow state - too long outside flow
    if (this.sessionState.outOfFlowStartTime !== null) {
      const outOfFlowDuration =
        (Date.now() - this.sessionState.outOfFlowStartTime) / 1000;
      if (outOfFlowDuration >= config.OUT_OF_FLOW_DURATION) {
        return { shouldSpawn: true, type: 'FLOW_EXIT', reason: 'OUT_OF_FLOW' };
      }
    }

    // Priority 5: Post flash crash (if enabled)
    if (this.sessionState.isFlashCrashActive) {
      this.sessionState.isFlashCrashActive = false;
      return { shouldSpawn: true, type: 'STOP_LOSS', reason: 'POST_FLASH_CRASH' };
    }

    // Priority 6: Post whale kill (within 30s)
    const timeSinceWhale = (Date.now() - this.sessionState.lastWhaleKillTime) / 1000;
    if (timeSinceWhale < 30 && this.sessionState.lastWhaleKillTime > 0) {
      this.sessionState.lastWhaleKillTime = 0; // Reset to not trigger again
      return { shouldSpawn: true, type: 'TAKE_PROFIT', reason: 'POST_WHALE_KILL' };
    }

    return { shouldSpawn: false, type: 'TAKE_PROFIT', reason: 'TAKE_PROFIT' };
  }

  /**
   * Spawn a portal
   */
  private spawnPortal(
    type: PortalType,
    reason: PortalTriggerReason,
    width: number,
    height: number
  ): void {
    const portalNumber = this.sessionState.portalsOpened + 1;

    // Position away from center (20% margin)
    const margin = 0.2;
    const x = (margin + Math.random() * (1 - 2 * margin)) * width;
    const y = (margin + Math.random() * (1 - 2 * margin)) * height;

    this.portalState = {
      isActive: true,
      type,
      x,
      y,
      radius: type === 'FORCED' ? 60 : 50, // Forced portals are larger
      timeLeft: PORTAL_V2_CONFIG.PORTAL_DURATION,
      portalNumber,
    };

    this.sessionState.portalsOpened = portalNumber;
    this.sessionState.lastPortalTime = TimeService.getGameTimeSeconds();

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

  /**
   * Handle portal expiration (player didn't enter)
   */
  private onPortalExpired(): void {
    const wasForced = this.portalState.type === 'FORCED';

    if (wasForced) {
      // Forced portal expired = game over
      Logger.warn('[PortalSystemV2] Forced portal expired - game over');
      EventBus.emit('portalMissed', {
        type: this.portalState.type,
        portalNumber: this.portalState.portalNumber,
        consequence: 'game_over',
      });
      // Game engine should handle forced death
    } else {
      // Regular portal rejected
      this.applyRejectionPenalty();
    }

    this.closePortal();
  }

  /**
   * Apply penalty for rejecting a portal
   */
  private applyRejectionPenalty(): void {
    const rejectionCount = this.sessionState.portalsRejected;
    const penalties = PORTAL_V2_CONFIG.REJECTION_PENALTIES;
    const penalty = penalties[Math.min(rejectionCount, penalties.length - 1)];

    if (!penalty) return;

    // Apply difficulty penalty
    this.sessionState.difficultyPenalty.spawnRateMultiplier +=
      penalty.spawnRateIncrease;
    this.sessionState.difficultyPenalty.speedMultiplier += penalty.speedIncrease;

    this.sessionState.portalsRejected++;

    Logger.warn(
      `[PortalSystemV2] Portal rejected (${this.sessionState.portalsRejected}/${PORTAL_V2_CONFIG.MAX_REJECTIONS})`,
      {
        spawnPenalty: this.sessionState.difficultyPenalty.spawnRateMultiplier,
        speedPenalty: this.sessionState.difficultyPenalty.speedMultiplier,
      }
    );

    EventBus.emit('portalRejected', {
      rejectionCount: this.sessionState.portalsRejected,
      spawnRateMultiplier: this.sessionState.difficultyPenalty.spawnRateMultiplier,
      speedMultiplier: this.sessionState.difficultyPenalty.speedMultiplier,
    });
  }

  /**
   * Player entered the portal - calculate rewards and exit
   */
  enterPortal(): CoinRewardResult {
    if (!this.portalState.isActive) {
      Logger.warn('[PortalSystemV2] enterPortal called but no active portal');
      return this.calculateReward('portal', this.portalState.type);
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
    return this.calculateReward('portal', portalType);
  }

  /**
   * Player died - calculate reduced rewards
   */
  onPlayerDeath(wasAFK: boolean = false): CoinRewardResult {
    Logger.info(`[PortalSystemV2] Player died (AFK: ${wasAFK})`);

    if (this.portalState.isActive) {
      this.closePortal();
    }

    return this.calculateReward(wasAFK ? 'afk_death' : 'death', null);
  }

  /**
   * Calculate final coin reward
   */
  private calculateReward(
    exitType: 'portal' | 'death' | 'afk_death',
    portalType: PortalType | null
  ): CoinRewardResult {
    const config = PORTAL_V2_CONFIG.COIN_MULTIPLIERS;
    const survivalTime = TimeService.getGameTimeSeconds();
    const leveragedPnL = this.currentPnL; // Already includes leverage effect

    let rawCoins = this.rawCoins;
    let enemyDrops = this.enemyDropCoins;
    let survivalBonus = 0;
    let portalBonus = 0;
    let comboBonus = this.comboBonus;

    // Calculate survival bonus (time * leveraged PnL)
    if (leveragedPnL > 0) {
      survivalBonus = Math.floor((survivalTime / 10) * (leveragedPnL * 100));
    }

    // Apply exit type modifiers
    if (exitType === 'portal' && portalType) {
      switch (portalType) {
        case 'TAKE_PROFIT':
          // Full rewards + 20% bonus
          portalBonus = Math.floor((rawCoins + enemyDrops + survivalBonus) * 0.2);
          break;

        case 'STOP_LOSS':
          // Raw coins only, no survival bonus
          survivalBonus = 0;
          break;

        case 'FLOW_EXIT':
          // 50% survival bonus
          survivalBonus = Math.floor(survivalBonus * config.FLOW_EXIT_MULT);
          break;

        case 'FORCED':
          // Same as flow exit
          survivalBonus = Math.floor(survivalBonus * config.FLOW_EXIT_MULT);
          break;
      }
    } else if (exitType === 'death') {
      // 50% of raw coins only
      rawCoins = Math.floor(rawCoins * config.DEATH_PENALTY);
      enemyDrops = Math.floor(enemyDrops * config.DEATH_PENALTY);
      survivalBonus = 0;
      comboBonus = 0;
    } else if (exitType === 'afk_death') {
      // No coins for AFK
      rawCoins = 0;
      enemyDrops = 0;
      survivalBonus = 0;
      comboBonus = 0;
    }

    const total = rawCoins + enemyDrops + survivalBonus + portalBonus + comboBonus;

    return {
      total: Math.floor(total),
      breakdown: {
        raw: rawCoins,
        enemyDrops,
        survivalBonus,
        portalBonus,
        comboBonus,
      },
      exitType,
      portalType,
    };
  }

  /**
   * Close the current portal
   */
  private closePortal(): void {
    if (!this.portalState.isActive) return;

    this.portalState.isActive = false;
    Logger.debug('[PortalSystemV2] Portal closed');
    EventBus.emit('portalClosed', {
      type: this.portalState.type,
      portalNumber: this.portalState.portalNumber,
    });
  }

  /**
   * Get effective cooldown (base + rejection extension)
   */
  private getEffectiveCooldown(): number {
    const baseCooldown = PORTAL_V2_CONFIG.PORTAL_COOLDOWN;
    const rejectionCount = this.sessionState.portalsRejected;
    const penalties = PORTAL_V2_CONFIG.REJECTION_PENALTIES;

    let totalExtension = 0;
    for (let i = 0; i < rejectionCount && i < penalties.length; i++) {
      totalExtension += penalties[i]?.cooldownExtension ?? 0;
    }

    return baseCooldown + totalExtension;
  }

  // --- Event Handlers ---

  private onEnemyKilled(data: { enemyType?: string; coinDrop?: number }): void {
    // Track coin drops from enemies
    if (data.coinDrop && data.coinDrop > 0) {
      this.enemyDropCoins += data.coinDrop;
    } else {
      // Default coin values
      if (data.enemyType === 'whale') {
        this.enemyDropCoins += 50;
      } else if (data.enemyType === 'elite') {
        this.enemyDropCoins += 15;
      } else {
        this.rawCoins += 1;
      }
    }

    // Check for whale kill (tier 3+)
    if (data.enemyType === 'whale') {
      this.sessionState.lastWhaleKillTime = Date.now();
    }
  }

  private onFlowStateChanged(newState: FlowState, _previousState: FlowState): void {
    this.currentFlowState = newState;

    if (newState === 'flow') {
      // Reset out-of-flow timer
      this.sessionState.outOfFlowStartTime = null;
    } else {
      // Start tracking out-of-flow time
      this.sessionState.outOfFlowStartTime ??= Date.now();
    }
  }

  private onFlashCrash(): void {
    // Flag flash crash for next portal check
    this.sessionState.isFlashCrashActive = true;
    Logger.info('[PortalSystemV2] Flash crash detected');
  }

  // --- Public API ---

  /**
   * Add raw coins (from gameplay, gems, etc.)
   */
  addRawCoins(amount: number): void {
    this.rawCoins += amount;
  }

  /**
   * Add combo bonus
   */
  addComboBonus(amount: number): void {
    this.comboBonus += amount;
  }

  /**
   * Get current portal state
   */
  getPortalState(): PortalV2State {
    return { ...this.portalState };
  }

  /**
   * Get session state
   */
  getSessionState(): PortalSessionState {
    return { ...this.sessionState };
  }

  /**
   * Get difficulty penalty multipliers (for SpawnSystem)
   */
  getDifficultyPenalty(): { spawnRateMultiplier: number; speedMultiplier: number } {
    return { ...this.sessionState.difficultyPenalty };
  }

  /**
   * Get raw coins accumulated
   */
  getRawCoins(): number {
    return this.rawCoins;
  }

  /**
   * Check if a portal is currently active
   */
  isPortalActive(): boolean {
    return this.portalState.isActive;
  }

  /**
   * Get number of portals remaining
   */
  getPortalsRemaining(): number {
    return PORTAL_V2_CONFIG.MAX_PORTALS - this.sessionState.portalsOpened;
  }

  /**
   * Check if this is the final portal
   */
  isFinalPortal(): boolean {
    return this.sessionState.portalsOpened >= PORTAL_V2_CONFIG.MAX_PORTALS - 1;
  }

  /**
   * Reset portal system (call on game start)
   */
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

    this.sessionState = {
      portalsOpened: 0,
      portalsRejected: 0,
      lastPortalTime: 0,
      outOfFlowStartTime: null,
      isFlashCrashActive: false,
      lastWhaleKillTime: 0,
      difficultyPenalty: {
        spawnRateMultiplier: 1.0,
        speedMultiplier: 1.0,
      },
    };

    this.rawCoins = 0;
    this.enemyDropCoins = 0;
    this.comboBonus = 0;
    this.currentPnL = 0;
    this.currentFlowState = 'flow';

    Logger.debug('[PortalSystemV2] Reset');
  }

  /**
   * Get debug information
   */
  getDebugState(): Record<string, unknown> {
    return {
      isActive: this.portalState.isActive,
      type: this.portalState.type,
      portalNumber: this.portalState.portalNumber,
      timeLeft: this.portalState.timeLeft.toFixed(1),
      portalsOpened: this.sessionState.portalsOpened,
      portalsRejected: this.sessionState.portalsRejected,
      portalsRemaining: this.getPortalsRemaining(),
      cooldown: this.getEffectiveCooldown(),
      rawCoins: this.rawCoins,
      enemyDrops: this.enemyDropCoins,
      pnl: `${(this.currentPnL * 100).toFixed(1)}%`,
      flowState: this.currentFlowState,
      penalty: {
        spawn: this.sessionState.difficultyPenalty.spawnRateMultiplier.toFixed(2),
        speed: this.sessionState.difficultyPenalty.speedMultiplier.toFixed(2),
      },
    };
  }
}

// Export singleton instance
export const PortalSystemV2 = PortalSystemV2Class.getInstance();

// For testing - allows creating fresh instances
export function createPortalSystemV2(): PortalSystemV2Class {
  (PortalSystemV2Class as unknown as { instance: null }).instance = null;
  return PortalSystemV2Class.getInstance();
}
