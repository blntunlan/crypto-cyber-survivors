/**
 * DifficultyManager - Advanced Difficulty System
 *
 * Combines technical factors (P&L, ATR, time, level) with
 * psychological mechanics (waves, near-death, streaks).
 *
 * Uses TimeService for accurate game-time tracking.
 */

import { TimeService } from './TimeService';

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

type WavePhase = 'calm' | 'building' | 'intense' | 'peak';

class DifficultyManagerClass {
  private static instance: DifficultyManagerClass | null = null;

  // State
  private lastPnlValues: number[] = [];
  private currentWavePhase: WavePhase = 'building';
  private waveTimer: number = 0;
  private killStreak: number = 0;
  private lastKillStreakTime: number = 0;

  // Wave configuration (seconds)
  private readonly WAVE_DURATIONS: Record<WavePhase, number> = {
    calm: 8,
    building: 12,
    intense: 20,
    peak: 6,
  };

  private readonly WAVE_MULTIPLIERS: Record<WavePhase, number> = {
    calm: 0.4,
    building: 0.8,
    intense: 1.2,
    peak: 1.5,
  };

  private constructor() {}

  static getInstance(): DifficultyManagerClass {
    return (DifficultyManagerClass.instance ??= new DifficultyManagerClass());
  }

  /**
   * Start tracking difficulty for a new game
   */
  startGame(): void {
    this.lastPnlValues = [];
    this.currentWavePhase = 'building';
    this.waveTimer = 0;
    this.killStreak = 0;
    this.lastKillStreakTime = 0;
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
    // ATR as percentage of price, normalized
    // High volatility = harder
    return Math.min(1.8, Math.max(0.9, 1 + atrPercent * 50));
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
   * Main game loop update for time-based difficulty factors
   */
  update(deltaMs: number): void {
    const dtSeconds = deltaMs / 1000;
    this.waveTimer += dtSeconds;

    const currentDuration = this.WAVE_DURATIONS[this.currentWavePhase];
    if (this.waveTimer >= currentDuration) {
      this.waveTimer = 0;

      // Cycle through phases
      const phases: WavePhase[] = ['calm', 'building', 'intense', 'peak'];
      const currentIndex = phases.indexOf(this.currentWavePhase);
      this.currentWavePhase = phases[(currentIndex + 1) % phases.length]!;
    }
  }

  /**
   * Main difficulty calculation
   * Called when market data updates or periodically
   */
  calculate(pnl: number, atrPercent: number, level: number, hpPercent: number): DifficultyOutput {
    // Calculate all factors
    const factors: DifficultyFactors = {
      baseTime: this.getBaseTimeFactor(),
      pnlEffect: this.getPnlFactor(pnl),
      volatility: this.getVolatilityFactor(atrPercent),
      levelFactor: this.getLevelFactor(level),
      waveMultiplier: this.WAVE_MULTIPLIERS[this.currentWavePhase],
      nearDeathMod: this.getNearDeathMod(hpPercent),
      streakBonus: this.getStreakBonus(),
      momentumMod: this.getMomentumMod(),
    };

    // Combine technical factors
    const technical =
      factors.baseTime * factors.pnlEffect * factors.volatility * factors.levelFactor;

    // Combine psychological factors
    const psychological = factors.waveMultiplier * factors.nearDeathMod * (1 + factors.streakBonus);

    // Final difficulty with momentum adjustment
    const total = this.clamp(technical * psychological * factors.momentumMod, 0.3, 8.0);

    return {
      spawnRate: this.clamp(total * 0.6, 0.3, 3.5), // Reduced from 0.8, 0.5-5.0
      enemySpeed: this.clamp(
        factors.pnlEffect * factors.volatility * factors.waveMultiplier,
        0.4, // Lower minimum
        1.8 // Reduced from 2.5 for slower max speed
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

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

// Export singleton
export const DifficultyManager = DifficultyManagerClass.getInstance();
