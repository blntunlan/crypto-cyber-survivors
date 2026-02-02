import { TimeService } from '../core/TimeService';
import { useAdminConfigStore } from '../../stores/admin/configStore';
import type { DifficultyConfig } from '../../types/admin';
import { type DifficultyDebugState, getDebugTimestamp } from '../../types/DebugState';
import { type WavePhase } from '../../types/metrics';
import { WAVE_CONFIG, DIFFICULTY_CONFIG as D_CONFIG } from '../../config';
import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';
import { difficultyContext } from '../difficulty/DifficultyContext';
import { clamp } from '../difficulty/utils';
import { getShockDirection } from '../difficulty/factors';
import { GameMasterBrain, type GameMasterInputs } from '../difficulty/GameMasterBrain';
import { marketIndicatorService } from '../indicators/MarketIndicatorService';
import { calculateMACDFactor } from '../difficulty/factors/macd';
import { PoolManager } from '../combat/PoolManager';
import { DirectorAdapter } from '../difficulty/DirectorAdapter';

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
  private lastShockTime: number = 0; // Prevent shock triggers for the first 10 seconds
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

    // 4.5. Update GameMaster Brain with current state
    const market = marketIndicatorService.getState();
    const macdFactor = (calculateMACDFactor() + 1) / 2; // Normalize to 0-1

    // Determine trend from RSI
    let trendValue = 0.5;
    if (market.rsi > 60) trendValue = 1.0;
    else if (market.rsi < 40) trendValue = 0.0;

    // Calculate player stats for brain
    const activeGems = PoolManager.getInstance().activeGems.length;
    const zoningScore = Math.min(1, activeGems / 150);
    const killEfficiency = Math.min(1, this.killStreak / 30);

    const brainInputs: GameMasterInputs = {
      rsi: market.rsi / 100,
      macd: macdFactor,
      volatility: Math.min(1, market.atrPercent * 2),
      volume: market.normalizedVolume,
      trend: trendValue,
      pnl: clamp(inp.pnlHistory[inp.pnlHistory.length - 1] ?? 0, -1, 1),
      stress: 1 - Math.min(100, Math.max(0, inp.hpPercent)) / 100,
      playerDPS: 0.5, // Will be set externally
      killEfficiency,
      elapsedTime: inp.elapsedSeconds / 900, // 15 min normalized
      level: level / 30,
      luckStat: 0.1, // Base luck, can be updated
      zoningScore,
      leverage: inp.leverage / 100,
    };

    GameMasterBrain.update(brainInputs, TimeService.getGameTime());
    const gm = GameMasterBrain.getOutputs();

    // Apply GameMaster Brain outputs directly
    const output: DifficultyOutput = {
      spawnRate: clamp(
        total * scale.spawn * gm.spawnRate,
        D_CONFIG.LIMITS.spawnRate.min,
        D_CONFIG.LIMITS.spawnRate.max
      ),
      enemySpeed: clamp(
        f.pnl * f.atr * scale.speed * gm.enemySpeed,
        D_CONFIG.LIMITS.enemySpeed.min,
        D_CONFIG.LIMITS.enemySpeed.max
      ),
      enemyHealth: clamp(
        f.cycle * f.level * scale.hp * gm.enemyHP,
        D_CONFIG.LIMITS.enemyHP.min,
        D_CONFIG.LIMITS.enemyHP.max
      ),
      enemyDamage: clamp(
        f.cycle * f.pnl * scale.damage * gm.enemyDamage,
        D_CONFIG.LIMITS.enemyDamage.min,
        D_CONFIG.LIMITS.enemyDamage.max
      ),
      total,
      factors: {
        baseTime: f.cycle,
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

    // Recalculate total difficulty metric for UI (Using GameMaster brain output)
    const finalTotal = (output.total + output.total * gm.spawnRate) / 2;
    output.total = clamp(finalTotal, D_CONFIG.LIMITS.total.min, maxDifficulty);

    // === AI Director V2 Integration ===
    // Update player HP in DirectorAdapter
    DirectorAdapter.updatePlayerHP(inp.hpPercent * 100, 100);
    // Apply Director V2 blending (returns blended output)
    const finalOutput = DirectorAdapter.process(output);

    this.latestOutput = finalOutput;

    // 5. Emit Events (Cooldown 10s + 5s Session Grace Period)
    const isGracePeriod = TimeService.getGameTimeSeconds() < 5;

    if (f.shock.triggered && !isGracePeriod) {
      const now = TimeService.getGameTimeSeconds();
      if (now - this.lastShockTime >= 10) {
        this.lastShockTime = now;
        const dir = getShockDirection(inp.pnlHistory);

        // Scale shock intensity and duration based on leverage (1x = 100%, 100x = ~200%)
        const leverageImpact = 1 + Math.log10(inp.leverage) * 0.5;
        const baseIntensity = Math.min(1.0, (f.shock.factor - 1.0) / 1.0);

        const payload = {
          intensity: Math.min(2.0, baseIntensity * leverageImpact),
          direction: dir === 'none' ? 'down' : dir,
          isHighLeverage: inp.leverage >= 25,
        };

        EventBus.emit('volatilityShock', payload);
        EventBus.emit('shockDetected', payload);

        // Increase global shake based on leverage during shocks
        if (inp.leverage >= 50) {
          EventBus.emit('hitStop', { duration: 100, isCrit: true }); // Brief pause for impact
        }
      }
    }

    if (f.liquidation.warningLevel !== 'NONE' && !isGracePeriod) {
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
    // Power-law scaling for impact: sqrt(L) gives a nice diminishing return that still feels massive
    // 100x = 1 + (10 - 1) * 0.8 = 8.2x XP
    // 10x = 1 + (3.16 - 1) * 0.8 = 2.7x XP
    const multiplier = 1 + (Math.sqrt(leverage) - 1) * 0.8;
    return Math.min(multiplier, 12.0); // Extreme upper bound for 100x+ scenarios
  }

  public getLatestOutput(): DifficultyOutput | null {
    return this.latestOutput;
  }

  /**
   * @deprecated AI Director V2: Wave phases removed - always returns 'active'
   */
  getWavePhase(): WavePhase {
    return 'active'; // AI Director V2: Always active
  }

  getKillStreak(): number {
    return this.killStreak;
  }

  /**
   * @deprecated AI Director V2: Wave cycles removed
   */
  getCycleNumber(): number {
    const totalSeconds = TimeService.getGameTimeSeconds();
    return Math.floor(totalSeconds / 300) + 1;
  }

  /**
   * @deprecated AI Director V2: Wave cycles removed
   */
  getCycleProgress(): number {
    const totalElapsed = TimeService.getGameTimeSeconds();
    const cycleElapsed = totalElapsed % WAVE_CONFIG.TOTAL_DURATION;
    return cycleElapsed / WAVE_CONFIG.TOTAL_DURATION;
  }

  /**
   * @deprecated AI Director V2: Wave phases removed - always returns 0
   */
  getTimeRemainingInPhase(): number {
    return 0; // AI Director V2: No phases
  }

  /**
   * @deprecated AI Director V2: Wave phases removed - always returns 1.0
   */
  getWaveMultiplier(): number {
    return 1.0; // AI Director V2: No wave multiplier
  }

  /**
   * @deprecated AI Director V2: Wave cycles removed
   */
  getTimeRemainingInCycle(): number {
    const totalElapsed = TimeService.getGameTimeSeconds();
    const cycleElapsed = totalElapsed % WAVE_CONFIG.TOTAL_DURATION;
    return WAVE_CONFIG.TOTAL_DURATION - cycleElapsed;
  }

  /**
   * @deprecated AI Director V2: Wave cycles removed - always returns false
   */
  isCycleComplete(): boolean {
    return false; // AI Director V2: No wave cycles
  }

  getDebugState(): DifficultyDebugState {
    return {
      systemName: 'DifficultyManager',
      timestamp: getDebugTimestamp(),
      wavePhase: 'active' as WavePhase, // AI Director V2: Always active
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
    this.lastShockTime = -20; // Ensure it can fire after grace period
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
