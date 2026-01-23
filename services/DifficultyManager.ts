import { TimeService } from './TimeService';
import { useAdminConfigStore } from '../stores/admin/configStore';
import type { DifficultyConfig } from '../types/admin';
import { type DifficultyDebugState, getDebugTimestamp } from '../types/DebugState';
import { type WavePhase } from '../types/metrics';
import { WAVE_CONFIG, DIFFICULTY_CONFIG as D_CONFIG } from '../config';
import { EventBus } from './EventBus';
import { Logger } from './Logger';
import { difficultyContext } from './difficulty/DifficultyContext';
import { clamp } from './difficulty/utils';
import { getShockDirection } from './difficulty/factors';

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
  leverageDamage: number;
  leverageSpawn: number;
  leverageSpeed: number;
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
  /** Enemy damage multiplier */
  enemyDamage: number;
  /** Combined raw difficulty value */
  total: number;
  /** Raw contributing factors for debugging/analytics */
  factors: DifficultyFactors;
}

/**
 * DifficultyManagerClass - Singleton service for managing game progression.
 * Refactored to V2 (Layered Architecture).
 *
 * Acts as a Consumer Service (Layer 4) of DifficultyContext (Layer 3).
 */
class DifficultyManagerClass {
  private static instance: DifficultyManagerClass | null = null;

  // Track state for legacy compatibility & local combat logic
  private killStreak: number = 0;
  private lastKillStreakTime: number = 0;
  private lastShockTime: number = -10; // Allow first shock immediately
  private latestOutput: DifficultyOutput | null = null;

  private constructor() {
    // Sync with combat events for streak tracking
    EventBus.on('enemyKilled', () => this.recordKill());
    EventBus.on('gameReset', () => this.reset());
  }

  static getInstance(): DifficultyManagerClass {
    return (DifficultyManagerClass.instance ??= new DifficultyManagerClass());
  }

  /**
   * Start tracking difficulty (Legacy Wrapper)
   */
  startGame(leverage: number = 1): void {
    this.reset();
    Logger.info(`[DifficultyManager] Starting session with ${leverage}x leverage`);

    // Direct sync for context
    difficultyContext.updateInputs({
      leverage,
      level: 1,
      elapsedSeconds: 0,
      pnlHistory: [],
    });
  }

  /**
   * Record a kill for streak tracking.
   */
  recordKill(): void {
    const gameTimeSec = TimeService.getGameTimeSeconds();
    if (gameTimeSec - this.lastKillStreakTime < D_CONFIG.STREAK_TIMEOUT_MS / 1000) {
      this.killStreak += 1;
    } else {
      this.killStreak = 1;
    }
    this.lastKillStreakTime = gameTimeSec;

    // Sync with context
    difficultyContext.updateCombatState(this.killStreak, 0);
  }

  /**
   * Main difficulty calculation logic (Refactored for V2).
   *
   * Pulls aggregated data from Layer 3 (DifficultyContext) and Maps it to
   * game-specific outputs (Layer 4).
   */
  calculate(
    pnl: number,
    atrPercent: number,
    level: number,
    hpPercent: number,
    configOverride?: Partial<DifficultyConfig>
  ): DifficultyOutput {
    // 1. Update Context Inputs (Directly or via events)
    difficultyContext.updateInputs({
      pnlPercent: pnl,
      atrPercent,
      level,
      hpPercent,
      elapsedSeconds: TimeService.getGameTimeSeconds(),
    });
    // We handle hpPercent separately since it's used for the near-death factor
    // that might not be in the core input set yet but is needed here.
    // Calculate accurate time since last kill for streak decay
    const timeSinceLastKillMs =
      (TimeService.getGameTimeSeconds() - this.lastKillStreakTime) * 1000;
    difficultyContext.updateCombatState(this.killStreak, timeSinceLastKillMs);

    // 2. Get Pre-computed Context (Layer 3)
    const context = difficultyContext.getContext();
    const { factors: f, aggregates: agg, inputs: inp } = context;

    // 3. Admin & Override Scaling
    const adminConfig = configOverride ?? this.getAdminConfig();
    const baseMultiplier = adminConfig?.base
      ? adminConfig.base / D_CONFIG.BASE_ADMIN_DIVISOR
      : 1.0;
    const maxDifficulty = adminConfig?.maxDifficulty ?? D_CONFIG.LIMITS.total.max;

    // 4. Transform Aggregates to Engine Outputs (Layer 4 Mapping)
    const total = clamp(
      agg.total * baseMultiplier,
      D_CONFIG.LIMITS.total.min,
      maxDifficulty
    );
    const scale = inp.leverageScale;

    const output: DifficultyOutput = {
      spawnRate: clamp(
        total * scale.spawn * D_CONFIG.SPAWN_RATE_TOTAL_MULTIPLIER,
        D_CONFIG.LIMITS.spawnRate.min,
        D_CONFIG.LIMITS.spawnRate.max
      ),
      enemySpeed: clamp(
        f.pnl * f.atr * f.wave * scale.speed,
        D_CONFIG.LIMITS.enemySpeed.min,
        D_CONFIG.LIMITS.enemySpeed.max
      ),
      enemyHealth: clamp(
        f.cycle * f.level * scale.hp,
        D_CONFIG.LIMITS.enemyHP.min,
        D_CONFIG.LIMITS.enemyHP.max
      ),
      enemyDamage: clamp(
        f.cycle * f.pnl * scale.damage,
        D_CONFIG.LIMITS.enemyDamage.min,
        D_CONFIG.LIMITS.enemyDamage.max
      ),
      total,
      factors: {
        baseTime: f.cycle, // V2 uses cycle as base time factor
        pnlEffect: f.pnl,
        volatility: f.atr,
        levelFactor: f.level,
        waveMultiplier: f.wave,
        nearDeathMod: f.nearDeath,
        streakBonus: f.streak - 1.0,
        momentumMod: f.shock.factor,
        cycleFactor: f.cycle,
        leverageDamage: scale.damage,
        leverageSpawn: scale.spawn,
        leverageSpeed: scale.speed,
      },
    };

    this.latestOutput = output;

    // 5. Emit Events (Cooldown 10s)
    if (f.shock.triggered) {
      const now = TimeService.getGameTimeSeconds();
      if (now - this.lastShockTime >= 10) {
        this.lastShockTime = now;
        const dir = getShockDirection(inp.pnlHistory);
        const payload = {
          intensity: Math.min(1.0, (f.shock.factor - 1.0) / 1.0),
          direction: dir === 'none' ? 'down' : dir,
        };
        EventBus.emit('volatilityShock', payload);
        EventBus.emit('shockDetected', payload);
      }
    }

    if (f.liquidation.warningLevel !== 'NONE') {
      EventBus.emit('liquidationWarning', {
        level: f.liquidation.warningLevel,
        distance: (1.0 - (f.liquidation.factor - 1.0) / 1.0) * 100, // Roughly map factor to distance %
      });
    }

    return output;
  }

  public getXpMultiplier(): number {
    const leverage = difficultyContext.getContext().inputs.leverage;
    if (leverage <= 1) return 1.0;
    return 1 + Math.log10(leverage) * 0.5;
  }

  public getLatestOutput(): DifficultyOutput | null {
    return this.latestOutput;
  }

  getWavePhase(): WavePhase {
    return difficultyContext.getContext().factors.wavePhase as WavePhase;
  }

  getKillStreak(): number {
    return this.killStreak;
  }

  getCycleNumber(): number {
    const totalSeconds = TimeService.getGameTimeSeconds();
    return Math.floor(totalSeconds / 300) + 1;
  }

  getCycleProgress(): number {
    const totalElapsed = TimeService.getGameTimeSeconds();
    const cycleElapsed = totalElapsed % WAVE_CONFIG.TOTAL_DURATION;
    return cycleElapsed / WAVE_CONFIG.TOTAL_DURATION;
  }

  getTimeRemainingInPhase(): number {
    const phase = this.getWavePhase();
    const totalElapsed = TimeService.getGameTimeSeconds();
    const timeInCycle = totalElapsed % 300;

    let accumulated = 0;
    for (const p of WAVE_CONFIG.PHASE_ORDER) {
      const phaseConfig = WAVE_CONFIG.PHASES.find(pc => pc.name === p);
      const d = phaseConfig?.duration ?? 0;
      if (p === phase) {
        return Math.max(0, d - (timeInCycle - accumulated));
      }
      accumulated += d;
    }
    return 0;
  }

  getWaveMultiplier(): number {
    const phase = this.getWavePhase();
    const phaseConfig = WAVE_CONFIG.PHASES.find(pc => pc.name === phase);
    return phaseConfig?.multiplier ?? 1.0;
  }

  getTimeRemainingInCycle(): number {
    const totalElapsed = TimeService.getGameTimeSeconds();
    const cycleElapsed = totalElapsed % WAVE_CONFIG.TOTAL_DURATION;
    return WAVE_CONFIG.TOTAL_DURATION - cycleElapsed;
  }

  isCycleComplete(): boolean {
    const phase = this.getWavePhase();
    return phase === 'resolution' && this.getTimeRemainingInPhase() < 0.1;
  }

  getDebugState(): DifficultyDebugState {
    const ctx = difficultyContext.getContext();
    return {
      systemName: 'DifficultyManager',
      timestamp: getDebugTimestamp(),
      wavePhase: ctx.factors.wavePhase as WavePhase,
      waveTimer: 0, // Simplified
      killStreak: this.killStreak,
      totalElapsedSeconds: TimeService.getGameTimeSeconds(),
      pnlHistoryLength: 0,
      waveDurations: Object.fromEntries(
        WAVE_CONFIG.PHASES.map(p => [p.name, p.duration])
      ),
      waveMultipliers: Object.fromEntries(
        WAVE_CONFIG.PHASES.map(p => [p.name, p.multiplier])
      ),
      cycleNumber: this.getCycleNumber(),
      cycleProgress: this.getCycleProgress(),
      timeRemainingInPhase: this.getTimeRemainingInPhase(),
      timeRemainingInCycle: this.getTimeRemainingInCycle(),
    };
  }

  private getAdminConfig(): DifficultyConfig | null {
    try {
      const store = useAdminConfigStore.getState();
      return store.config.difficulty;
    } catch {
      return null;
    }
  }

  reset(): void {
    this.killStreak = 0;
    this.lastKillStreakTime = 0;
    this.lastShockTime = -10;
    this.latestOutput = null;
    difficultyContext.reset();
    Logger.info('[DifficultyManager] V2 State reset');
  }

  static resetForTesting(): void {
    if (this.instance) {
      this.instance.reset();
    }
  }

  /**
   * Returns total game time seconds.
   */
  getTotalElapsedSeconds(): number {
    return TimeService.getGameTimeSeconds();
  }

  /** Update utility for Engine */
  updateWaveTimer(_deltaMs: number): void {
    // Sync time to context
    difficultyContext.updateTime(TimeService.getGameTimeSeconds());
  }
}

export const DifficultyManager = DifficultyManagerClass.getInstance();
