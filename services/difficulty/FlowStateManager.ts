/**
 * FlowStateManager - Player Flow State Detection & Response
 *
 * AI Director V2 - Phase 4: Flow State System
 *
 * This service tracks player performance metrics and determines their
 * current flow state (bored, flow, stressed). It provides adaptive
 * difficulty corrections to keep players in the optimal engagement zone.
 *
 * Flow State Definition:
 * - BORED: HP > 65%, low engagement, kill rate < 8/min
 * - FLOW: HP 35-65%, good kill rate, healthy engagement
 * - STRESSED: HP < 35%, panic dashing, high frustration
 *
 * Key Metrics Tracked:
 * - HP percentage and duration at various levels
 * - Kill rate (kills per minute)
 * - Dash frequency (panic detection)
 * - Damage taken rate
 * - Level-up intervals
 * - Engagement score (composite)
 * - Frustration score (composite)
 */

import { EventBus } from '../core/EventBus';
import { TimeService } from '../core/TimeService';
import { Logger } from '../system/Logger';

/**
 * Flow state configuration - defines thresholds and targets
 */
export const FLOW_STATE_CONFIG = {
  // HP Sweet Spot
  HP_BAND: {
    min: 35, // Below this = struggling
    ideal: 50, // Target HP
    max: 65, // Above this = too easy
  },

  // Critical HP thresholds
  HP_CRITICAL: {
    nearDeath: 20, // Emergency mercy zone
    comfortable: 80, // Too comfortable
  },

  // Kill Rate (per minute)
  KILL_RATE: {
    min: 8, // Below = not enough action
    ideal: 15, // Good engagement
    max: 25, // Above = maybe too easy
  },

  // Upgrade Frequency (seconds between level-ups)
  UPGRADE_INTERVAL: {
    min: 20, // Too fast = overwhelming
    ideal: 30, // Good pacing
    max: 45, // Too slow = boring
  },

  // Dash Frequency (dashes per 10 seconds)
  DASH_FREQUENCY: {
    normal: 3, // Normal evasion
    panic: 8, // Panic threshold
    maxTracked: 10, // Max dashes to track
  },

  // Time thresholds
  TIME_THRESHOLDS: {
    comfortableDuration: 10, // Seconds at high HP before "bored" (was 15 — too slow at 1x)
    stressedDuration: 8, // Seconds at low HP before "stressed" (was 10 — faster mercy response)
    afkThreshold: 5, // Seconds without input = AFK
    outOfFlowMax: 60, // Max seconds outside flow before portal
  },

  // Metric weights for engagement score
  ENGAGEMENT_WEIGHTS: {
    killRate: 0.4,
    upgradeRate: 0.3,
    movementVariety: 0.15,
    combatInteraction: 0.15,
  },

  // Metric weights for frustration score
  FRUSTRATION_WEIGHTS: {
    dashPanic: 0.3,
    damageRate: 0.5,
    lowHPDuration: 0.2,
  },
} as const;

/**
 * Possible flow states
 */
export type FlowState = 'bored' | 'flow' | 'stressed';

/**
 * Player metrics tracked over time
 */
export interface PlayerMetrics {
  // HP State
  currentHP: number; // 0-1 (percentage)
  maxHP: number;
  hpPercent: number; // 0-100

  // Combat metrics
  killsLast60s: number;
  killRate: number; // kills per minute
  damageDealtLast10s: number;
  damageTakenLast10s: number;

  // Movement metrics
  dashesLast10s: number;
  distanceTraveledLast10s: number;
  lastInputTime: number;

  // Progression metrics
  currentLevel: number;
  lastLevelUpTime: number;
  levelUpInterval: number; // seconds since last level-up

  // Time metrics
  timeBelowHP30: number; // seconds
  timeAboveHP80: number; // seconds
  timeInFlow: number; // seconds
  timeOutOfFlow: number; // seconds
}

/**
 * Flow state analysis result
 */
export interface FlowStateAnalysis {
  state: FlowState;
  engagementScore: number; // 0-1
  frustrationScore: number; // 0-1
  isAFK: boolean;
  isNearDeath: boolean;
  isComfortable: boolean;
  timeInCurrentState: number; // seconds
  suggestedCorrections: FlowStateCorrections;
}

/**
 * Suggested difficulty corrections based on flow state
 */
export interface FlowStateCorrections {
  spawnRateMultiplier: number; // 0.5-2.0
  enemySpeedMultiplier: number; // 0.8-1.3
  enemyDamageMultiplier: number; // 0.7-1.2
  enemyHPMultiplier: number; // 0.8-1.3
  xpMultiplier: number; // 0.8-1.5
  gemDropMultiplier: number; // 0.8-1.5
  mercyActive: boolean;
  mercyReduction: number; // 0-0.5
}

/**
 * Default corrections (no change)
 */
const DEFAULT_CORRECTIONS: FlowStateCorrections = {
  spawnRateMultiplier: 1.0,
  enemySpeedMultiplier: 1.0,
  enemyDamageMultiplier: 1.0,
  enemyHPMultiplier: 1.0,
  xpMultiplier: 1.0,
  gemDropMultiplier: 1.0,
  mercyActive: false,
  mercyReduction: 0,
};

// ── Ring-buffer capacity constants ──────────────────────────────────────
// At 60 FPS a 60-second window can hold at most ~3 600 kills; 256 is
// generous for realistic play. Damage events fit in a 10-second window
// and even under extreme burst rarely exceed 128 hits. Fixed capacity
// eliminates .push()-growth and per-event {time,amount,type} allocation.

const KILL_RING_CAPACITY = 256;
const DASH_RING_CAPACITY = 64;
const DAMAGE_RING_CAPACITY = 128;

/**
 * FlowStateManager - Singleton service for flow state management
 */
class FlowStateManagerClass {
  private static instance: FlowStateManagerClass | null = null;

  // Current metrics
  private metrics: PlayerMetrics;

  // Current analysis
  private currentState: FlowState = 'flow';
  private stateStartTime: number = 0;
  private lastAnalysisTime: number = 0;

  // ── Pre-allocated ring buffers (zero allocation after init) ──────────

  // Kill timestamp ring buffer (60 s window)
  private readonly killRing = new Float64Array(KILL_RING_CAPACITY);
  private killHead = 0;
  private killCount = 0;

  // Dash timestamp ring buffer (10 s window)
  private readonly dashRing = new Float64Array(DASH_RING_CAPACITY);
  private dashHead = 0;
  private dashCount = 0;

  // Damage event ring buffer — struct-of-arrays (no object allocation)
  private readonly dmgTime = new Float64Array(DAMAGE_RING_CAPACITY);
  private readonly dmgAmount = new Float64Array(DAMAGE_RING_CAPACITY);
  /** 0 = taken, 1 = dealt */
  private readonly dmgType = new Uint8Array(DAMAGE_RING_CAPACITY);
  private dmgHead = 0;
  private dmgCount = 0;

  private readonly corrections: FlowStateCorrections = { ...DEFAULT_CORRECTIONS };
  private readonly analysis: FlowStateAnalysis = {
    state: 'flow',
    engagementScore: 0,
    frustrationScore: 0,
    isAFK: false,
    isNearDeath: false,
    isComfortable: false,
    timeInCurrentState: 0,
    suggestedCorrections: this.corrections,
  };

  private constructor() {
    this.metrics = this.getDefaultMetrics();

    // Subscribe to game events
    EventBus.on('gameReset', () => this.reset());
    EventBus.on('gameStart', () => this.reset());
    EventBus.on('enemyKilled', () => this.recordKill());
    EventBus.on('playerHit', data => this.recordDamageTaken(data.damage));
    EventBus.on('critHit', data => this.recordDamageDealt(data.damage));
    EventBus.on('playerDash', () => this.recordDash());
    EventBus.on('levelUpComplete', data => this.recordLevelUp(data.newLevel));

    Logger.debug('[FlowStateManager] Initialized');
  }

  static getInstance(): FlowStateManagerClass {
    return (FlowStateManagerClass.instance ??= new FlowStateManagerClass());
  }

  /**
   * Update flow state with current player data
   * Call this every game tick (or at least every 100ms)
   */
  update(
    hpPercent: number,
    currentTime: number = TimeService.getGameTime()
  ): FlowStateAnalysis {
    // Update HP metrics
    this.metrics.hpPercent = hpPercent;
    this.metrics.currentHP = hpPercent / 100;

    // Clean old events from ring buffers
    this.cleanOldEvents(currentTime);

    // Calculate derived metrics
    this.updateDerivedMetrics(currentTime);

    // Analyze current state
    const analysis = this.analyze(currentTime);

    // Track state changes
    if (analysis.state !== this.currentState) {
      const previousState = this.currentState;
      this.currentState = analysis.state;
      this.stateStartTime = currentTime;

      EventBus.emit('flowStateChanged', {
        previousState,
        newState: analysis.state,
        engagementScore: analysis.engagementScore,
        frustrationScore: analysis.frustrationScore,
      });

      Logger.debug(
        `[FlowStateManager] State changed: ${previousState} → ${analysis.state}`
      );
    }

    this.lastAnalysisTime = currentTime;
    return analysis;
  }

  /**
   * Get current flow state
   */
  getCurrentState(): FlowState {
    return this.currentState;
  }

  /**
   * Get current metrics
   */
  getMetrics(): PlayerMetrics {
    return { ...this.metrics };
  }

  /**
   * Get latest analysis without updating
   */
  getLastAnalysis(currentTime: number = TimeService.getGameTime()): FlowStateAnalysis {
    return this.analyze(currentTime);
  }

  /**
   * Record a kill event
   */
  recordKill(timestamp: number = TimeService.getGameTime()): void {
    this.killRing[this.killHead] = timestamp;
    this.killHead = (this.killHead + 1) % KILL_RING_CAPACITY;
    if (this.killCount < KILL_RING_CAPACITY) this.killCount += 1;
  }

  /**
   * Record a dash event
   */
  recordDash(timestamp: number = TimeService.getGameTime()): void {
    this.dashRing[this.dashHead] = timestamp;
    this.dashHead = (this.dashHead + 1) % DASH_RING_CAPACITY;
    if (this.dashCount < DASH_RING_CAPACITY) this.dashCount += 1;
  }

  /**
   * Record damage taken
   */
  recordDamageTaken(
    amount: number,
    timestamp: number = TimeService.getGameTime()
  ): void {
    this.dmgTime[this.dmgHead] = timestamp;
    this.dmgAmount[this.dmgHead] = amount;
    this.dmgType[this.dmgHead] = 0; // taken
    this.dmgHead = (this.dmgHead + 1) % DAMAGE_RING_CAPACITY;
    if (this.dmgCount < DAMAGE_RING_CAPACITY) this.dmgCount += 1;
  }

  /**
   * Record damage dealt
   */
  recordDamageDealt(
    amount: number,
    timestamp: number = TimeService.getGameTime()
  ): void {
    this.dmgTime[this.dmgHead] = timestamp;
    this.dmgAmount[this.dmgHead] = amount;
    this.dmgType[this.dmgHead] = 1; // dealt
    this.dmgHead = (this.dmgHead + 1) % DAMAGE_RING_CAPACITY;
    if (this.dmgCount < DAMAGE_RING_CAPACITY) this.dmgCount += 1;
  }

  /**
   * Record a level-up event
   */
  recordLevelUp(newLevel: number, timestamp: number = TimeService.getGameTime()): void {
    const previousLevel = this.metrics.currentLevel;
    this.metrics.levelUpInterval = (timestamp - this.metrics.lastLevelUpTime) / 1000;
    this.metrics.lastLevelUpTime = timestamp;
    this.metrics.currentLevel = newLevel;

    Logger.debug(
      `[FlowStateManager] Level up: ${previousLevel} → ${newLevel}, interval: ${this.metrics.levelUpInterval.toFixed(1)}s`
    );
  }

  /**
   * Record player input (for AFK detection)
   */
  recordInput(timestamp: number = TimeService.getGameTime()): void {
    this.metrics.lastInputTime = timestamp;
  }

  /**
   * Reset all state (call on game start)
   */
  reset(): void {
    const now = TimeService.getGameTime();
    this.metrics = this.getDefaultMetrics(now);
    this.currentState = 'flow';
    this.stateStartTime = now;
    this.lastAnalysisTime = 0;
    this.killHead = 0;
    this.killCount = 0;
    this.dashHead = 0;
    this.dashCount = 0;
    this.dmgHead = 0;
    this.dmgCount = 0;

    Logger.debug('[FlowStateManager] Reset');
  }

  /**
   * Get debug information
   */
  getDebugState(): Record<string, unknown> {
    const analysis = this.analyze(TimeService.getGameTime());
    return {
      state: this.currentState,
      hpPercent: this.metrics.hpPercent.toFixed(1),
      killRate: this.metrics.killRate.toFixed(1),
      dashRate: this.metrics.dashesLast10s,
      engagement: analysis.engagementScore.toFixed(3),
      frustration: analysis.frustrationScore.toFixed(3),
      isAFK: analysis.isAFK,
      isNearDeath: analysis.isNearDeath,
      timeInState: analysis.timeInCurrentState.toFixed(1),
      corrections: {
        spawnRate: analysis.suggestedCorrections.spawnRateMultiplier.toFixed(2),
        mercy: analysis.suggestedCorrections.mercyActive,
      },
    };
  }

  // --- Private Methods ---

  private getDefaultMetrics(now: number = 0): PlayerMetrics {
    return {
      currentHP: 1,
      maxHP: 100,
      hpPercent: 100,
      killsLast60s: 0,
      killRate: 0,
      damageDealtLast10s: 0,
      damageTakenLast10s: 0,
      dashesLast10s: 0,
      distanceTraveledLast10s: 0,
      lastInputTime: now,
      currentLevel: 1,
      lastLevelUpTime: now,
      levelUpInterval: 0,
      timeBelowHP30: 0,
      timeAboveHP80: 0,
      timeInFlow: 0,
      timeOutOfFlow: 0,
    };
  }

  /**
   * Evict expired entries from ring buffers.
   * Counts valid (non-expired) entries by scanning the buffer;
   * the oldest entries naturally get overwritten when the buffer is full.
   */
  private cleanOldEvents(currentTime: number): void {
    const killCutoff = currentTime - 60000; // 60 s
    const dashCutoff = currentTime - 10000; // 10 s
    const damageCutoff = currentTime - 10000; // 10 s

    // Kill ring — count recent entries
    let killValid = 0;
    for (let i = 0; i < this.killCount; i++) {
      const idx =
        (this.killHead - this.killCount + i + KILL_RING_CAPACITY) % KILL_RING_CAPACITY;
      if (this.killRing[idx]! >= killCutoff) killValid += 1;
    }
    this.killCount = killValid;

    // Dash ring — count recent entries
    let dashValid = 0;
    for (let i = 0; i < this.dashCount; i++) {
      const idx =
        (this.dashHead - this.dashCount + i + DASH_RING_CAPACITY) % DASH_RING_CAPACITY;
      if (this.dashRing[idx]! >= dashCutoff) dashValid += 1;
    }
    this.dashCount = dashValid;

    // Damage ring — count recent entries
    let dmgValid = 0;
    for (let i = 0; i < this.dmgCount; i++) {
      const idx =
        (this.dmgHead - this.dmgCount + i + DAMAGE_RING_CAPACITY) %
        DAMAGE_RING_CAPACITY;
      if (this.dmgTime[idx]! >= damageCutoff) dmgValid += 1;
    }
    this.dmgCount = dmgValid;
  }

  /**
   * Update derived metrics from ring buffer data
   */
  private updateDerivedMetrics(currentTime: number): void {
    // Kill rate (kills per minute) — killCount is already pruned to 60 s window
    this.metrics.killsLast60s = this.killCount;
    this.metrics.killRate = this.killCount; // Already per 60s

    // Dash count — dashCount is already pruned to 10 s window
    this.metrics.dashesLast10s = this.dashCount;

    // Damage tracking from ring buffer (struct-of-arrays)
    let damageTaken = 0;
    let damageDealt = 0;
    for (let i = 0; i < this.dmgCount; i++) {
      const idx =
        (this.dmgHead - this.dmgCount + i + DAMAGE_RING_CAPACITY) %
        DAMAGE_RING_CAPACITY;
      const amount = this.dmgAmount[idx]!;
      if (this.dmgType[idx] === 0) {
        damageTaken += amount;
      } else {
        damageDealt += amount;
      }
    }
    this.metrics.damageTakenLast10s = damageTaken;
    this.metrics.damageDealtLast10s = damageDealt;

    // Time tracking
    const deltaTime =
      this.lastAnalysisTime > 0 ? (currentTime - this.lastAnalysisTime) / 1000 : 0;

    if (this.metrics.hpPercent < 30) {
      this.metrics.timeBelowHP30 += deltaTime;
    } else {
      this.metrics.timeBelowHP30 = Math.max(
        0,
        this.metrics.timeBelowHP30 - deltaTime * 0.5
      );
    }

    if (this.metrics.hpPercent > 80) {
      this.metrics.timeAboveHP80 += deltaTime;
    } else {
      this.metrics.timeAboveHP80 = Math.max(
        0,
        this.metrics.timeAboveHP80 - deltaTime * 0.5
      );
    }
  }

  /**
   * Analyze current state and generate corrections
   */
  private analyze(currentTime: number): FlowStateAnalysis {
    const { hpPercent } = this.metrics;

    // Calculate scores
    const engagementScore = this.calculateEngagementScore();
    const frustrationScore = this.calculateFrustrationScore();

    // Check special conditions
    const isAFK = this.isPlayerAFK(currentTime);
    const isNearDeath = hpPercent < FLOW_STATE_CONFIG.HP_CRITICAL.nearDeath;
    const isComfortable = hpPercent > FLOW_STATE_CONFIG.HP_CRITICAL.comfortable;

    // Determine flow state
    const state = this.determineFlowState(hpPercent, engagementScore, frustrationScore);

    // Calculate time in current state
    const timeInCurrentState = (currentTime - this.stateStartTime) / 1000;

    // Generate corrections
    const suggestedCorrections = this.calculateCorrections(
      state,
      isNearDeath,
      isComfortable,
      isAFK,
      frustrationScore
    );

    const analysis = this.analysis;
    analysis.state = state;
    analysis.engagementScore = engagementScore;
    analysis.frustrationScore = frustrationScore;
    analysis.isAFK = isAFK;
    analysis.isNearDeath = isNearDeath;
    analysis.isComfortable = isComfortable;
    analysis.timeInCurrentState = timeInCurrentState;
    analysis.suggestedCorrections = suggestedCorrections;
    return analysis;
  }

  /**
   * Calculate engagement score (0-1)
   */
  private calculateEngagementScore(): number {
    const config = FLOW_STATE_CONFIG;
    const weights = config.ENGAGEMENT_WEIGHTS;

    // Kill rate component (0-1)
    const killRateNorm = Math.min(1, this.metrics.killRate / config.KILL_RATE.max);

    // Level-up rate component (inverse - faster is better up to a point)
    const levelUpInterval =
      this.metrics.levelUpInterval || config.UPGRADE_INTERVAL.ideal;
    const levelUpNorm =
      1 -
      Math.min(
        1,
        Math.abs(levelUpInterval - config.UPGRADE_INTERVAL.ideal) /
          config.UPGRADE_INTERVAL.max
      );

    // Combat interaction (damage dealt vs taken ratio)
    const damageRatio =
      this.metrics.damageDealtLast10s > 0
        ? Math.min(
            1,
            this.metrics.damageDealtLast10s / (this.metrics.damageTakenLast10s + 1)
          ) / 10
        : 0.5;

    // Movement variety (dash usage - not too much, not too little)
    const dashNorm =
      1 -
      Math.abs(this.metrics.dashesLast10s - config.DASH_FREQUENCY.normal) /
        config.DASH_FREQUENCY.maxTracked;

    const score =
      killRateNorm * weights.killRate +
      levelUpNorm * weights.upgradeRate +
      damageRatio * weights.combatInteraction +
      Math.max(0, dashNorm) * weights.movementVariety;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate frustration score (0-1)
   */
  private calculateFrustrationScore(): number {
    const config = FLOW_STATE_CONFIG;
    const weights = config.FRUSTRATION_WEIGHTS;

    // Dash panic (high dash frequency = panic)
    const dashPanic = Math.min(
      1,
      this.metrics.dashesLast10s / config.DASH_FREQUENCY.maxTracked
    );

    // Damage rate (normalized by typical max damage)
    const damageRate = Math.min(1, this.metrics.damageTakenLast10s / 50);

    // Low HP duration (time spent below 30% HP)
    const lowHPDuration = Math.min(
      1,
      this.metrics.timeBelowHP30 / config.TIME_THRESHOLDS.stressedDuration
    );

    const score =
      dashPanic * weights.dashPanic +
      damageRate * weights.damageRate +
      lowHPDuration * weights.lowHPDuration;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Check if player is AFK
   */
  private isPlayerAFK(currentTime: number): boolean {
    const timeSinceInput = (currentTime - this.metrics.lastInputTime) / 1000;
    return timeSinceInput > FLOW_STATE_CONFIG.TIME_THRESHOLDS.afkThreshold;
  }

  /**
   * Determine flow state from metrics
   */
  private determineFlowState(
    hpPercent: number,
    engagementScore: number,
    frustrationScore: number
  ): FlowState {
    const config = FLOW_STATE_CONFIG;

    // High HP + low engagement = bored
    if (
      hpPercent > config.HP_BAND.max &&
      (engagementScore < 0.4 ||
        this.metrics.timeAboveHP80 > config.TIME_THRESHOLDS.comfortableDuration)
    ) {
      return 'bored';
    }

    // Low HP + high frustration = stressed
    if (
      hpPercent < config.HP_BAND.min &&
      (frustrationScore > 0.6 ||
        this.metrics.timeBelowHP30 > config.TIME_THRESHOLDS.stressedDuration)
    ) {
      return 'stressed';
    }

    // Otherwise in flow
    return 'flow';
  }

  /**
   * Calculate difficulty corrections based on state
   */
  private calculateCorrections(
    state: FlowState,
    isNearDeath: boolean,
    isComfortable: boolean,
    isAFK: boolean,
    frustrationScore: number
  ): FlowStateCorrections {
    // Start with defaults
    const corrections = this.corrections;
    corrections.spawnRateMultiplier = DEFAULT_CORRECTIONS.spawnRateMultiplier;
    corrections.enemySpeedMultiplier = DEFAULT_CORRECTIONS.enemySpeedMultiplier;
    corrections.enemyDamageMultiplier = DEFAULT_CORRECTIONS.enemyDamageMultiplier;
    corrections.enemyHPMultiplier = DEFAULT_CORRECTIONS.enemyHPMultiplier;
    corrections.xpMultiplier = DEFAULT_CORRECTIONS.xpMultiplier;
    corrections.gemDropMultiplier = DEFAULT_CORRECTIONS.gemDropMultiplier;
    corrections.mercyActive = DEFAULT_CORRECTIONS.mercyActive;
    corrections.mercyReduction = DEFAULT_CORRECTIONS.mercyReduction;

    // AFK players get no mercy
    if (isAFK) {
      return corrections;
    }

    // Near death emergency mercy
    if (isNearDeath) {
      corrections.mercyActive = true;
      corrections.mercyReduction = 0.3;
      corrections.spawnRateMultiplier = 0.7;
      corrections.enemyDamageMultiplier = 0.7;
      corrections.enemySpeedMultiplier = 0.9;
      return corrections;
    }

    // State-based corrections
    switch (state) {
      case 'bored':
        // Increase challenge
        corrections.spawnRateMultiplier = 1.3 + (isComfortable ? 0.2 : 0);
        corrections.enemySpeedMultiplier = 1.15;
        corrections.enemyDamageMultiplier = 1.1;
        corrections.xpMultiplier = 0.9; // Slight XP reduction to slow progress
        corrections.gemDropMultiplier = 0.9;
        break;

      case 'flow':
        // Maintain current balance
        // Small adjustments based on HP within flow band
        if (this.metrics.hpPercent > 55) {
          corrections.spawnRateMultiplier = 1.1;
        } else if (this.metrics.hpPercent < 45) {
          corrections.spawnRateMultiplier = 0.95;
          corrections.gemDropMultiplier = 1.1;
        }
        break;

      case 'stressed':
        // Reduce difficulty
        corrections.spawnRateMultiplier = 0.8 - frustrationScore * 0.1;
        corrections.enemyDamageMultiplier = 0.85;
        corrections.enemySpeedMultiplier = 0.95;
        corrections.xpMultiplier = 1.2; // Help them progress
        corrections.gemDropMultiplier = 1.3;

        // Apply mercy if very stressed
        if (frustrationScore > 0.7) {
          corrections.mercyActive = true;
          corrections.mercyReduction = 0.2;
        }
        break;
    }

    // Clamp all multipliers to safe ranges
    corrections.spawnRateMultiplier = Math.max(
      0.5,
      Math.min(2.0, corrections.spawnRateMultiplier)
    );
    corrections.enemySpeedMultiplier = Math.max(
      0.8,
      Math.min(1.3, corrections.enemySpeedMultiplier)
    );
    corrections.enemyDamageMultiplier = Math.max(
      0.7,
      Math.min(1.2, corrections.enemyDamageMultiplier)
    );
    corrections.enemyHPMultiplier = Math.max(
      0.8,
      Math.min(1.3, corrections.enemyHPMultiplier)
    );
    corrections.xpMultiplier = Math.max(0.8, Math.min(1.5, corrections.xpMultiplier));
    corrections.gemDropMultiplier = Math.max(
      0.8,
      Math.min(1.5, corrections.gemDropMultiplier)
    );

    return corrections;
  }
}

// Export singleton instance
export const FlowStateManager = FlowStateManagerClass.getInstance();

// For testing - allows creating fresh instances
export function createFlowStateManager(): FlowStateManagerClass {
  (FlowStateManagerClass as unknown as { instance: null }).instance = null;
  return FlowStateManagerClass.getInstance();
}
