/**
 * DifficultyManager - Advanced Difficulty System
 *
 * Combines technical factors (P&L, ATR, time, level) with
 * psychological mechanics (waves, near-death, streaks).
 *
 * Uses TimeService for accurate game-time tracking.
 * Integrates with Admin Dashboard config for runtime adjustments.
 */

import { TimeService } from './TimeService';
import { useAdminConfigStore } from '../stores/admin/configStore';
import type { DifficultyConfig } from '../types/admin';
import { type DifficultyDebugState, getDebugTimestamp } from '../types/DebugState';
import { type WavePhase } from '../types/metrics';
import { WAVE_CONFIG } from '../config/GameConfig';
import { EventBus } from './EventBus';
import { Logger } from './Logger';
import { DIFFICULTY } from '../constants';

/**
 * Interface representing the various factors contributing to the final difficulty.
 */
export interface DifficultyFactors {
  baseTime: number;
  pnlEffect: number;
  volatility: number;
  levelFactor: number;
  waveMultiplier: number;
  nearDeathMod: number;
  streakBonus: number;
  momentumMod: number;
  cycleFactor: number;
}

/**
 * Result of difficulty calculation for the engine to use.
 */
export interface DifficultyOutput {
  /** Enemy spawn rate multiplier */
  spawnRate: number;
  /** Enemy speed multiplier */
  enemySpeed: number;
  /** Enemy health multiplier */
  enemyHealth: number;
  /** Combined raw difficulty value */
  total: number;
}

/**
 * DifficultyManagerClass - Singleton service for managing game progression.
 *
 * Orchestrates dynamic difficulty adjustments based on market data (PnL, Volatility)
 * and player performance metrics (Kills, Level, Health).
 */
class DifficultyManagerClass {
  private static instance: DifficultyManagerClass | null = null;

  // State
  private lastPnlValues: number[] = [];
  private currentWavePhase: WavePhase = 'warmup';
  private currentLeverage: number = 1;
  private waveTimer: number = 0;
  private killStreak: number = 0;
  private lastKillStreakTime: number = 0;
  private lastWaveUpdateTime: number = 0;
  private currentCycle: number = 1;
  private lastPnlForShock: number = 0;
  private lastShockTime: number = 0;

  // Use centralized wave config from GameConfig
  private readonly WAVE_DURATIONS = WAVE_CONFIG.DURATIONS;
  private readonly WAVE_MULTIPLIERS = WAVE_CONFIG.MULTIPLIERS;
  private readonly PHASE_ORDER = WAVE_CONFIG.PHASE_ORDER;

  private constructor() {}

  /**
   * Returns the singleton instance of DifficultyManager.
   */
  static getInstance(): DifficultyManagerClass {
    return (DifficultyManagerClass.instance ??= new DifficultyManagerClass());
  }

  /**
   * Start tracking difficulty for a new game session.
   *
   * @param leverage - The leverage selected by the player for the session.
   */
  startGame(leverage: number = 1): void {
    this.lastPnlValues = [];
    this.currentLeverage = leverage;
    this.currentWavePhase = 'warmup';
    this.waveTimer = 0;
    this.killStreak = 0;
    this.lastKillStreakTime = 0;
    this.lastWaveUpdateTime = TimeService.getGameTimeSeconds();
    this.currentCycle = 1;
    this.lastPnlForShock = 0;
    this.lastShockTime = -DIFFICULTY.SHOCK_COOLDOWN_SEC;
  }

  /**
   * Record a kill for streak tracking.
   * Streaks reset if the time between kills exceeds the timeout.
   */
  recordKill(): void {
    const gameTimeSec = TimeService.getGameTimeSeconds();
    if (gameTimeSec - this.lastKillStreakTime < DIFFICULTY.KILL_STREAK_TIMEOUT_SEC) {
      this.killStreak += 1;
    } else {
      this.killStreak = 1;
    }
    this.lastKillStreakTime = gameTimeSec;
  }

  /**
   * Calculate base time factor which increases as the game progresses.
   *
   * @private
   */
  private getBaseTimeFactor(): number {
    const totalElapsedSeconds = TimeService.getGameTimeSeconds();
    return Math.min(
      DIFFICULTY.TIME_FACTOR_MAX,
      1 + (totalElapsedSeconds / 60) * DIFFICULTY.TIME_FACTOR_INCREASE_PER_MINUTE
    );
  }

  /**
   * Calculate P&L effect based on player gains or losses.
   * Winning makes the game slightly easier, while losing makes it harder.
   *
   * @param pnl - Current session PnL.
   * @private
   */
  private getPnlFactor(pnl: number): number {
    if (!Number.isFinite(pnl)) {
      return 1.0;
    }

    // Track history for momentum calculation
    this.lastPnlValues.push(pnl);
    if (this.lastPnlValues.length > 30) {
      this.lastPnlValues.shift();
    }

    const leverageEffect = pnl * DIFFICULTY.PNL_LEVERAGE_MULTIPLIER;

    if (leverageEffect < 0) {
      // Losing: increase difficulty with diminishing returns
      const lossFactor = Math.abs(leverageEffect);
      return Math.min(DIFFICULTY.PNL_LOSS_CAP, 1 + Math.log1p(lossFactor) * 0.5);
    } else {
      // Winning: decrease difficulty slightly
      const winFactor = leverageEffect;
      return Math.max(
        DIFFICULTY.PNL_WIN_FLOOR,
        1 - Math.log1p(winFactor) * DIFFICULTY.PNL_WIN_LOG_SCALE
      );
    }
  }

  /**
   * Calculate volatility factor based on market ATR.
   * Higher volatility increases difficulty, especially as the game progresses into late-stage.
   *
   * @param atrPercent - Market Average True Range as a percentage.
   * @private
   */
  private getVolatilityFactor(atrPercent: number): number {
    const baseVolatility = Math.min(
      DIFFICULTY.VOLATILITY_MAX,
      Math.max(
        DIFFICULTY.VOLATILITY_MIN,
        1 + atrPercent * DIFFICULTY.VOLATILITY_ATR_SCALE
      )
    );

    // Apply volatility damping based on game time
    const elapsed = TimeService.getGameTimeSeconds();
    const damping = Math.min(
      1.0,
      DIFFICULTY.VOLATILITY_DAMPING_INITIAL +
        (elapsed / DIFFICULTY.VOLATILITY_DAMPING_FULL_TIME) * 0.8
    );

    const deviation = baseVolatility - 1.0;
    return 1.0 + deviation * damping;
  }

  /**
   * Calculate level factor based on player's current level.
   *
   * @param level - Player's current level.
   * @private
   */
  private getLevelFactor(level: number): number {
    return Math.min(
      DIFFICULTY.LEVEL_FACTOR_MAX,
      1 + (level - 1) * DIFFICULTY.LEVEL_FACTOR_INCREASE
    );
  }

  /**
   * Calculate near-death modifier to provide a "mercy" window for player recovery.
   *
   * @param hpPercent - Player's current health percentage.
   * @private
   */
  private getNearDeathMod(hpPercent: number): number {
    if (hpPercent < DIFFICULTY.NEAR_DEATH_HP_THRESHOLD) {
      return DIFFICULTY.NEAR_DEATH_DIFFICULTY_MODIFIER;
    }
    return 1.0;
  }

  /**
   * Calculate streak bonus from recent kills.
   *
   * @private
   */
  private getStreakBonus(): number {
    return Math.min(
      DIFFICULTY.STREAK_CAP,
      Math.floor(this.killStreak / DIFFICULTY.STREAK_INCREMENT_THRESHOLD) *
        DIFFICULTY.STREAK_INCREMENT_BONUS
    );
  }

  /**
   * Calculate momentum modifier based on the trend of the player's PnL.
   *
   * @private
   */
  private getMomentumMod(): number {
    if (this.lastPnlValues.length < DIFFICULTY.MOMENTUM_WINDOW_SMALL) {
      return 1.0;
    }

    const recent = this.lastPnlValues.slice(-DIFFICULTY.MOMENTUM_WINDOW_SMALL);
    const older = this.lastPnlValues.slice(
      -DIFFICULTY.MOMENTUM_WINDOW_LARGE,
      -DIFFICULTY.MOMENTUM_WINDOW_SMALL
    );

    if (older.length === 0) {
      return 1.0;
    }

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const trend = recentAvg - olderAvg;

    if (trend > 0) {
      return DIFFICULTY.MOMENTUM_BUFF;
    } else if (trend < 0) {
      return DIFFICULTY.MOMENTUM_DEBUFF;
    }
    return 1.0;
  }

  /**
   * Returns the current XP multiplier based on selected leverage.
   * High leverage carries high risk but yields higher XP rewards.
   */
  public getXpMultiplier(): number {
    const leverage = this.currentLeverage;
    if (leverage <= 1) {
      return 1.0;
    }
    return 1 + Math.log10(leverage) * 0.5;
  }

  /**
   * Detect sudden market shocks to trigger volatility shockwave events.
   *
   * @param pnl - Current session PnL.
   * @private
   */
  private detectShock(pnl: number): void {
    const diff = Math.abs(pnl - this.lastPnlForShock);
    const now = TimeService.getGameTimeSeconds();

    if (
      diff > DIFFICULTY.SHOCK_THRESHOLD &&
      now - this.lastShockTime > DIFFICULTY.SHOCK_COOLDOWN_SEC
    ) {
      this.lastShockTime = now;
      Logger.info(
        `[Shockwave] Sudden price movement detected! Diff: ${(diff * 100).toFixed(2)}%`
      );
      EventBus.emit('volatilityShock', {
        intensity: Math.min(2.0, diff / DIFFICULTY.SHOCK_THRESHOLD),
        direction: pnl > this.lastPnlForShock ? 'up' : 'down',
      });
    }

    this.lastPnlForShock = pnl;
  }

  /**
   * Synchronize the progression wave timer with actual game time.
   * Advances the game state through wave phases (Warmup, Resolution, etc.).
   *
   * @private
   */
  private syncWaveTimer(): void {
    const currentGameTime = TimeService.getGameTimeSeconds();
    const elapsed = currentGameTime - this.lastWaveUpdateTime;

    if (elapsed < 0) {
      Logger.warn(
        `[WaveSync] Backward time jump detected (${this.lastWaveUpdateTime.toFixed(2)} -> ${currentGameTime.toFixed(2)}). Resetting wave state.`
      );
      this.resetWaveToTime(currentGameTime);
      return;
    }

    if (elapsed === 0) {
      return;
    }

    this.lastWaveUpdateTime = currentGameTime;
    this.waveTimer += elapsed;

    // Advance through wave phases based on durations defined in GameConfig
    while (this.waveTimer >= this.WAVE_DURATIONS[this.currentWavePhase]) {
      const currentDuration = this.WAVE_DURATIONS[this.currentWavePhase];
      this.waveTimer -= currentDuration;

      const currentIndex = this.PHASE_ORDER.indexOf(this.currentWavePhase);
      const nextIndex = (currentIndex + 1) % this.PHASE_ORDER.length;
      const oldPhase = this.currentWavePhase;
      this.currentWavePhase = this.PHASE_ORDER[nextIndex]!;

      Logger.info(
        `[WaveSync] Phase transition: ${oldPhase} -> ${this.currentWavePhase} (Timer: ${this.waveTimer.toFixed(2)})`
      );

      EventBus.emit('wavePhaseChange', { phase: this.currentWavePhase, oldPhase });

      // Handle cycle completion (Game Loop Decision point)
      if (nextIndex === 0) {
        this.currentCycle++;
        EventBus.emit('cycleComplete', {
          cycleNumber: this.currentCycle - 1,
          totalElapsedSeconds: currentGameTime,
        });
      }
    }
  }

  /**
   * Hard reset wave state to a specific absolute time point.
   *
   * @param totalSeconds - Absolute game time seconds to reset to.
   * @private
   */
  private resetWaveToTime(totalSeconds: number): void {
    this.currentCycle = Math.floor(totalSeconds / WAVE_CONFIG.TOTAL_DURATION) + 1;
    let remaining = totalSeconds % WAVE_CONFIG.TOTAL_DURATION;

    let phaseIndex = 0;
    while (phaseIndex < this.PHASE_ORDER.length) {
      const phase = this.PHASE_ORDER[phaseIndex]!;
      const duration = this.WAVE_DURATIONS[phase];
      if (remaining < duration) {
        const oldPhase = this.currentWavePhase;
        this.currentWavePhase = phase;
        this.waveTimer = remaining;

        if (oldPhase !== this.currentWavePhase) {
          EventBus.emit('wavePhaseChange', { phase: this.currentWavePhase, oldPhase });
        }
        break;
      }
      remaining -= duration;
      phaseIndex++;
    }

    this.lastWaveUpdateTime = totalSeconds;
    Logger.info(
      `[WaveSync] Reset to Cycle ${this.currentCycle}, Phase ${this.currentWavePhase}, Timer ${this.waveTimer.toFixed(2)}`
    );
  }

  /**
   * Updates the wave timer logic in synchronization with the game clock.
   */
  updateWaveTimer(_deltaMs: number): void {
    this.syncWaveTimer();
  }

  /**
   * Fetches the current difficulty configuration from the admin dashboard store.
   *
   * @private
   */
  private getAdminConfig(): DifficultyConfig | null {
    try {
      const store = useAdminConfigStore.getState();
      return store.config.difficulty;
    } catch {
      return null;
    }
  }

  /**
   * Main difficulty calculation logic.
   * Combines all technical and psychological factors into a single output.
   *
   * @param pnl - Current player PnL.
   * @param atrPercent - Market volatility factor (ATR %).
   * @param level - Player's current level.
   * @param hpPercent - Player's current health percentage.
   * @param configOverride - Optional configuration for testing.
   */
  calculate(
    pnl: number,
    atrPercent: number,
    level: number,
    hpPercent: number,
    configOverride?: Partial<DifficultyConfig>
  ): DifficultyOutput {
    this.detectShock(pnl);
    this.syncWaveTimer();

    const adminConfig = configOverride ?? this.getAdminConfig();
    const baseMultiplier = adminConfig?.base
      ? adminConfig.base / DIFFICULTY.BASE_ADMIN_DIVISOR
      : 1.0;
    const volatilityMultiplier = adminConfig?.volatilityMultiplier ?? 1.0;
    const maxDifficulty = adminConfig?.maxDifficulty ?? 8.0;

    const factors: DifficultyFactors = {
      baseTime: this.getBaseTimeFactor(),
      pnlEffect: this.getPnlFactor(pnl),
      volatility: this.getVolatilityFactor(atrPercent) * volatilityMultiplier,
      levelFactor: this.getLevelFactor(level),
      waveMultiplier: this.WAVE_MULTIPLIERS[this.currentWavePhase],
      nearDeathMod: this.getNearDeathMod(hpPercent),
      streakBonus: this.getStreakBonus(),
      momentumMod: this.getMomentumMod(),
      cycleFactor: 1 + (this.currentCycle - 1) * DIFFICULTY.CYCLE_DIFFICULTY_INCREMENT,
    };

    const technical =
      factors.baseTime *
      factors.pnlEffect *
      factors.volatility *
      factors.levelFactor *
      factors.cycleFactor *
      baseMultiplier;

    const psychological =
      factors.waveMultiplier * factors.nearDeathMod * (1 + factors.streakBonus);

    const total = this.clamp(
      technical * psychological * factors.momentumMod,
      0.3,
      maxDifficulty
    );

    return {
      spawnRate: this.clamp(
        total * DIFFICULTY.SPAWN_RATE_TOTAL_MULTIPLIER,
        DIFFICULTY.SPAWN_RATE_MIN,
        DIFFICULTY.SPAWN_RATE_MAX
      ),
      enemySpeed: this.clamp(
        factors.pnlEffect * factors.volatility * factors.waveMultiplier,
        DIFFICULTY.ENEMY_SPEED_MIN,
        DIFFICULTY.ENEMY_SPEED_MAX
      ),
      enemyHealth: this.clamp(
        factors.baseTime * factors.levelFactor,
        DIFFICULTY.ENEMY_HEALTH_MIN,
        DIFFICULTY.ENEMY_HEALTH_MAX
      ),
      total,
    };
  }

  /**
   * Returns current wave phase.
   */
  getWavePhase(): WavePhase {
    return this.currentWavePhase;
  }

  /**
   * Returns current kill streak.
   */
  getKillStreak(): number {
    return this.killStreak;
  }

  /**
   * Returns total game time seconds.
   */
  getTotalElapsedSeconds(): number {
    return TimeService.getGameTimeSeconds();
  }

  /**
   * Returns current cycle number.
   */
  getCycleNumber(): number {
    return this.currentCycle;
  }

  /**
   * Returns normalized cycle progress (0.0 to 1.0).
   */
  getCycleProgress(): number {
    const totalElapsed = TimeService.getGameTimeSeconds();
    const cycleElapsed = totalElapsed % WAVE_CONFIG.TOTAL_DURATION;
    return cycleElapsed / WAVE_CONFIG.TOTAL_DURATION;
  }

  /**
   * Returns time remaining in the current wave phase (seconds).
   */
  getTimeRemainingInPhase(): number {
    const phaseDuration = this.WAVE_DURATIONS[this.currentWavePhase];
    return Math.max(0, phaseDuration - this.waveTimer);
  }

  /**
   * Returns current wave multiplier.
   */
  getWaveMultiplier(): number {
    return this.WAVE_MULTIPLIERS[this.currentWavePhase];
  }

  /**
   * Returns time remaining in current 5-minute cycle (seconds).
   */
  getTimeRemainingInCycle(): number {
    const totalElapsed = TimeService.getGameTimeSeconds();
    const cycleElapsed = totalElapsed % WAVE_CONFIG.TOTAL_DURATION;
    return WAVE_CONFIG.TOTAL_DURATION - cycleElapsed;
  }

  /**
   * Returns whether the current cycle is coming to an end.
   */
  isCycleComplete(): boolean {
    return (
      this.currentWavePhase === 'resolution' &&
      this.waveTimer >= this.WAVE_DURATIONS.resolution - 0.1
    );
  }

  /**
   * Returns current calculated momentum multiplier.
   */
  public getMomentum(): number {
    return this.getMomentumMod();
  }

  /**
   * Generates a snapshot of the current difficulty system state for debugging.
   */
  getDebugState(): DifficultyDebugState {
    return {
      systemName: 'DifficultyManager',
      timestamp: getDebugTimestamp(),
      wavePhase: this.currentWavePhase,
      waveTimer: this.waveTimer,
      killStreak: this.killStreak,
      totalElapsedSeconds: TimeService.getGameTimeSeconds(),
      pnlHistoryLength: this.lastPnlValues.length,
      waveDurations: { ...this.WAVE_DURATIONS },
      waveMultipliers: { ...this.WAVE_MULTIPLIERS },
      cycleNumber: this.currentCycle,
      cycleProgress: this.getCycleProgress(),
      timeRemainingInPhase: this.getTimeRemainingInPhase(),
      timeRemainingInCycle: this.getTimeRemainingInCycle(),
    };
  }

  /** Helper to clamp numeric values within a range */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

// Export singleton
export const DifficultyManager = DifficultyManagerClass.getInstance();
