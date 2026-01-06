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

export interface DifficultyFactors {
  baseTime: number;
  pnlEffect: number;
  volatility: number;
  levelFactor: number;
  waveMultiplier: number;
  nearDeathMod: number;
  streakBonus: number;
  momentumMod: number;
}

export interface DifficultyOutput {
  spawnRate: number; // Enemy spawn rate multiplier
  enemySpeed: number; // Enemy speed multiplier
  enemyHealth: number; // Enemy health multiplier
  total: number; // Combined difficulty
}

class DifficultyManagerClass {
  private static instance: DifficultyManagerClass | null = null;

  // State
  private lastPnlValues: number[] = [];
  private currentWavePhase: WavePhase = 'warmup';
  private currentLeverage: number = 1; // Track leverage for XP scaling
  private waveTimer: number = 0;
  private killStreak: number = 0;
  private lastKillStreakTime: number = 0;
  private lastWaveUpdateTime: number = 0; // Track last wave update for sync
  private currentCycle: number = 1; // Track which 5-minute cycle we're on
  private lastPnlForShock: number = 0; // Track last PnL to detect sudden jumps
  private lastShockTime: number = 0; // Cooldown for shockwaves

  // Use centralized wave config from GameConfig
  private readonly WAVE_DURATIONS = WAVE_CONFIG.DURATIONS;
  private readonly WAVE_MULTIPLIERS = WAVE_CONFIG.MULTIPLIERS;
  private readonly PHASE_ORDER = WAVE_CONFIG.PHASE_ORDER;

  private constructor() {}

  static getInstance(): DifficultyManagerClass {
    return (DifficultyManagerClass.instance ??= new DifficultyManagerClass());
  }

  /**
   * Start tracking difficulty for a new game
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
    this.lastShockTime = -10; // Allow immediate shock if jump is huge
  }

  /**
   * Record a kill for streak tracking
   */
  recordKill(): void {
    const gameTimeSec = TimeService.getGameTimeSeconds();
    if (gameTimeSec - this.lastKillStreakTime < 3.0) {
      this.killStreak += 1;
    } else {
      this.killStreak = 1;
    }
    this.lastKillStreakTime = gameTimeSec;
  }

  /**
   * Calculate base time factor (always increasing)
   */
  private getBaseTimeFactor(): number {
    // Increases by 15% per minute, caps at 2.5x
    const totalElapsedSeconds = TimeService.getGameTimeSeconds();
    return Math.min(2.5, 1 + (totalElapsedSeconds / 60) * 0.15);
  }

  /**
   * Calculate P&L effect with smoothing
   */
  private getPnlFactor(pnl: number): number {
    // Guard against invalid pnl values
    if (!Number.isFinite(pnl)) {
      return 1.0; // Neutral factor
    }

    // Track recent P&L for momentum
    this.lastPnlValues.push(pnl);
    if (this.lastPnlValues.length > 30) {
      this.lastPnlValues.shift();
    }

    const leverageEffect = pnl * 100;

    if (leverageEffect < 0) {
      // Losing: harder, but with diminishing returns
      const lossFactor = Math.abs(leverageEffect);
      return Math.min(3.0, 1 + Math.log1p(lossFactor) * 0.5);
    } else {
      // Winning: easier, but not too easy
      const winFactor = leverageEffect;
      return Math.max(0.7, 1 - Math.log1p(winFactor) * 0.15);
    }
  }

  /**
   * Calculate volatility factor from ATR
   */
  private getVolatilityFactor(atrPercent: number): number {
    // 1. Calculate base volatility factor
    const baseVolatility = Math.min(1.8, Math.max(0.9, 1 + atrPercent * 50));

    // 2. Apply Volatility Damping based on game time (Mathematical Core Loop)
    // Early game: Damping is high (0.2). Late game (5m+): Damping is neutral (1.0).
    const elapsed = TimeService.getGameTimeSeconds();
    const damping = Math.min(1.0, 0.2 + (elapsed / 300) * 0.8);

    // Apply damping to the deviation from neutral (1.0)
    const deviation = baseVolatility - 1.0;
    return 1.0 + deviation * damping;
  }

  /**
   * Calculate level factor
   */
  private getLevelFactor(level: number): number {
    // +5% per level, caps at 1.5x
    return Math.min(1.5, 1 + (level - 1) * 0.05);
  }

  /**
   * Calculate near-death modifier
   */
  private getNearDeathMod(hpPercent: number): number {
    if (hpPercent < 20) {
      // Give player a chance to recover
      return 0.7;
    }
    return 1.0;
  }

  /**
   * Calculate streak bonus
   */
  private getStreakBonus(): number {
    // +5% per 5 kills, caps at +30%
    return Math.min(0.3, Math.floor(this.killStreak / 5) * 0.05);
  }

  /**
   * Calculate momentum modifier (trend-based)
   */
  private getMomentumMod(): number {
    if (this.lastPnlValues.length < 10) return 1.0;

    const recent = this.lastPnlValues.slice(-10);
    const older = this.lastPnlValues.slice(-20, -10);

    if (older.length === 0) return 1.0;

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const trend = recentAvg - olderAvg;

    if (trend > 0) {
      // Improving: difficulty increases faster
      return 1.1;
    } else if (trend < 0) {
      // Worsening: difficulty increases slower (mercy)
      return 0.9;
    }
    return 1.0;
  }

  /**
   * Calculate XP multiplier based on leverage (Leverage Risk Reward)
   */
  public getXpMultiplier(): number {
    const leverage = this.currentLeverage;
    // 1x = 1.0x XP
    // 10x = 1.2x XP
    // 100x = 2.0x XP
    // Formula: 1 + log10(leverage) * 0.5
    if (leverage <= 1) return 1.0;
    return 1 + Math.log10(leverage) * 0.5;
  }

  /**
   * Detect sudden market shocks for "Volatility Shockwaves"
   */
  private detectShock(pnl: number): void {
    const shockThreshold = 0.005; // 0.5% price jump in a single tick
    const diff = Math.abs(pnl - this.lastPnlForShock);
    const now = TimeService.getGameTimeSeconds();

    if (diff > shockThreshold && now - this.lastShockTime > 10) {
      this.lastShockTime = now;
      Logger.info(`[Shockwave] Sudden price movement detected! Diff: ${(diff * 100).toFixed(2)}%`);
      EventBus.emit('volatilityShock', {
        intensity: Math.min(2.0, diff / shockThreshold),
        direction: pnl > this.lastPnlForShock ? 'up' : 'down',
      });
    }

    this.lastPnlForShock = pnl;
  }

  /**
   * Synchronize wave timer with current game time.
   * Called automatically by calculate() to ensure wave state is current.
   */
  private syncWaveTimer(): void {
    const currentGameTime = TimeService.getGameTimeSeconds();
    const elapsed = currentGameTime - this.lastWaveUpdateTime;

    // Handle backward time jumps or exact zero (e.g. debugging/testing)
    if (elapsed < 0) {
      Logger.warn(
        `[WaveSync] Backward time jump detected (${this.lastWaveUpdateTime.toFixed(2)} -> ${currentGameTime.toFixed(2)}). Resetting wave state.`
      );
      this.resetWaveToTime(currentGameTime);
      return;
    }

    if (elapsed === 0) return;

    this.lastWaveUpdateTime = currentGameTime;
    this.waveTimer += elapsed;

    // Advance through wave phases
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

      // Emit event for UI to update
      EventBus.emit('wavePhaseChange', { phase: this.currentWavePhase, oldPhase });

      // If we completed a full cycle (back to warmup), increment cycle counter
      if (nextIndex === 0) {
        this.currentCycle++;
      }
    }
  }

  /**
   * Hard reset wave state to a specific absolute time.
   * Useful for handling significant time jumps.
   */
  private resetWaveToTime(totalSeconds: number): void {
    this.currentCycle = Math.floor(totalSeconds / WAVE_CONFIG.TOTAL_DURATION) + 1;
    let remaining = totalSeconds % WAVE_CONFIG.TOTAL_DURATION;

    // Find phase for the remaining time
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
   * Main game loop update for time-based difficulty factors.
   * Advances the wave system independently of market data updates.
   */
  updateWaveTimer(_deltaMs: number): void {
    this.syncWaveTimer();
  }

  /**
   * Get Admin Dashboard difficulty config (if available)
   */
  private getAdminConfig(): DifficultyConfig | null {
    try {
      const store = useAdminConfigStore.getState();
      return store.config.difficulty;
    } catch {
      // Admin store may not be available in all contexts
      return null;
    }
  }

  /**
   * Main difficulty calculation
   * Called when market data updates or periodically.
   * Automatically syncs wave timer using TimeService for consistency.
   *
   * @param pnl - Current PnL (with difficulty-capped leverage)
   * @param atrPercent - ATR as percentage of price
   * @param level - Player's current level
   * @param hpPercent - Player's current HP percentage
   * @param configOverride - Optional config for testing (defaults to admin store)
   */
  calculate(
    pnl: number,
    atrPercent: number,
    level: number,
    hpPercent: number,
    configOverride?: Partial<DifficultyConfig>
  ): DifficultyOutput {
    // Detect sudden market shocks
    this.detectShock(pnl);

    // Sync wave timer with current game time (ensures waves are always current)
    this.syncWaveTimer();

    // Get admin config overrides (explicit injection takes precedence)
    const adminConfig = configOverride ?? this.getAdminConfig();
    const baseMultiplier = adminConfig?.base ? adminConfig.base / 5 : 1.0; // base 5 = 1.0x
    const volatilityMultiplier = adminConfig?.volatilityMultiplier ?? 1.0;
    const maxDifficulty = adminConfig?.maxDifficulty ?? 8.0;

    // Calculate all factors
    const factors: DifficultyFactors = {
      baseTime: this.getBaseTimeFactor(),
      pnlEffect: this.getPnlFactor(pnl),
      volatility: this.getVolatilityFactor(atrPercent) * volatilityMultiplier,
      levelFactor: this.getLevelFactor(level),
      waveMultiplier: this.WAVE_MULTIPLIERS[this.currentWavePhase],
      nearDeathMod: this.getNearDeathMod(hpPercent),
      streakBonus: this.getStreakBonus(),
      momentumMod: this.getMomentumMod(),
    };

    // Combine technical factors with base multiplier from admin config
    const technical =
      factors.baseTime *
      factors.pnlEffect *
      factors.volatility *
      factors.levelFactor *
      baseMultiplier;

    // Combine psychological factors
    const psychological = factors.waveMultiplier * factors.nearDeathMod * (1 + factors.streakBonus);

    // Final difficulty with momentum adjustment, capped by admin config
    const total = this.clamp(technical * psychological * factors.momentumMod, 0.3, maxDifficulty);

    return {
      spawnRate: this.clamp(total * 0.6, 0.3, 3.5),
      enemySpeed: this.clamp(
        factors.pnlEffect * factors.volatility * factors.waveMultiplier,
        0.4,
        1.8
      ),
      enemyHealth: this.clamp(factors.baseTime * factors.levelFactor, 0.8, 3.0),
      total,
    };
  }

  /**
   * Get current wave phase for UI
   */
  getWavePhase(): WavePhase {
    return this.currentWavePhase;
  }

  /**
   * Get current kill streak
   */
  getKillStreak(): number {
    return this.killStreak;
  }

  /**
   * Get total active game time in seconds
   */
  getTotalElapsedSeconds(): number {
    return TimeService.getGameTimeSeconds();
  }

  /**
   * Get current cycle number (1-indexed)
   */
  getCycleNumber(): number {
    return this.currentCycle;
  }

  /**
   * Get progress through current 5-minute cycle (0-1)
   */
  getCycleProgress(): number {
    const totalElapsed = TimeService.getGameTimeSeconds();
    const cycleElapsed = totalElapsed % WAVE_CONFIG.TOTAL_DURATION;
    return cycleElapsed / WAVE_CONFIG.TOTAL_DURATION;
  }

  /**
   * Get time remaining in current phase (seconds)
   */
  getTimeRemainingInPhase(): number {
    const phaseDuration = this.WAVE_DURATIONS[this.currentWavePhase];
    return Math.max(0, phaseDuration - this.waveTimer);
  }

  /**
   * Get time remaining in current cycle (seconds)
   */
  getTimeRemainingInCycle(): number {
    const totalElapsed = TimeService.getGameTimeSeconds();
    const cycleElapsed = totalElapsed % WAVE_CONFIG.TOTAL_DURATION;
    return WAVE_CONFIG.TOTAL_DURATION - cycleElapsed;
  }

  /**
   * Check if cycle just completed (useful for triggering decision screen)
   */
  isCycleComplete(): boolean {
    return (
      this.currentWavePhase === 'resolution' &&
      this.waveTimer >= this.WAVE_DURATIONS.resolution - 0.1
    );
  }

  /**
   * Get debug state for runtime inspection
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
      // New cycle-related fields
      cycleNumber: this.currentCycle,
      cycleProgress: this.getCycleProgress(),
      timeRemainingInPhase: this.getTimeRemainingInPhase(),
      timeRemainingInCycle: this.getTimeRemainingInCycle(),
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

// Export singleton
export const DifficultyManager = DifficultyManagerClass.getInstance();
