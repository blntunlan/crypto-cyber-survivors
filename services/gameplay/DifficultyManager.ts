import { TimeService } from '../core/TimeService';
import { useAdminConfigStore } from '../../stores/admin/configStore';
import type { DifficultyConfig } from '../../types/admin';
import { type DifficultyDebugState, getDebugTimestamp } from '../../types/DebugState';
import { type WavePhase } from '../../types/metrics';
import { DIFFICULTY_CONFIG as D_CONFIG } from '../../config';
import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';
import { difficultyContext } from '../difficulty/DifficultyContext';
import { clamp } from '../difficulty/utils';
import { getShockDirection } from '../difficulty/factors';
import { UnifiedDirector, type UnifiedInputs } from '../difficulty/UnifiedDirector';
import { PoolManager } from '../combat/PoolManager';
import { type DifficultyOutput } from './DifficultyTypes';
import { LeverageEngine } from './LeverageEngine';

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

  // Momentum and Metric tracking
  private lastPnL: number = 0;
  private lastVolume: number = 0;
  private pnlMomentum: number = 0;
  private volumeMomentum: number = 0;

  // AI Director V2 Sensors
  private dashCount: number = 0;
  private damageTakenSum: number = 0;
  private killsInWindow: number = 0;
  private windowStartTime: number = 0;
  private unsubscribeFns: (() => void)[] = [];

  private constructor() {
    this.setupListeners();
  }

  private setupListeners(): void {
    // Sync with combat events for streak tracking
    this.unsubscribeFns.push(
      EventBus.on(
        'enemyKilled',
        () => {
          this.recordKill();
          this.killsInWindow++;
        },
        { scope: 'gameplay' }
      ),
      EventBus.on(
        'playerDash',
        () => {
          this.dashCount++;
        },
        { scope: 'gameplay' }
      ),
      EventBus.on(
        'playerHit',
        data => {
          this.damageTakenSum += data.damage;
        },
        { scope: 'gameplay' }
      ),
      EventBus.on('gameReset', () => this.reset(), { scope: 'system' })
    );
  }

  static getInstance(): DifficultyManagerClass {
    return (DifficultyManagerClass.instance ??= new DifficultyManagerClass());
  }

  /**
   * Start tracking difficulty (Legacy Wrapper).
   * NOTE: The caller (GameStateManager.resetAll) emits 'gameReset' BEFORE calling
   * this method, so all state is already clean. We only need to stamp the
   * session-specific leverage value.
   */
  startGame(leverage: number = 1): void {
    Logger.info(`[DifficultyManager] Starting session with ${leverage}x leverage`);

    // Deterministically set leverage on both systems (don't rely on event ordering)
    LeverageEngine.setLeverage(leverage);

    // Direct sync for context — stamps the chosen leverage onto the clean slate
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
    const totalRaw = agg.total * baseMultiplier;
    const total = clamp(
      isNaN(totalRaw) ? 1.0 : totalRaw,
      D_CONFIG.LIMITS.total.min,
      maxDifficulty
    );
    const scale = inp.leverageScale;

    // 4.5. Market Indicators
    const marketRSI = Number.isFinite(inp.rsi) ? inp.rsi : 50;
    const marketAtrPercent = Number.isFinite(inp.atrPercent) ? inp.atrPercent : 0;
    const marketVolume = Number.isFinite(inp.normalizedVolume)
      ? inp.normalizedVolume
      : 0.5;

    // Calculate Momentum
    const currentLeveragedPnL = pnl * inp.leverage;
    this.pnlMomentum =
      this.pnlMomentum * 0.8 + (currentLeveragedPnL - this.lastPnL) * 0.2;
    this.volumeMomentum =
      this.volumeMomentum * 0.8 + (marketVolume - this.lastVolume) * 0.2;

    this.lastPnL = currentLeveragedPnL;
    this.lastVolume = marketVolume;

    // --- AI DIRECTOR V2 INTEGRATION ---
    // Prepare 18 sensors for UnifiedDirector
    const nowMs = TimeService.getGameTime();
    const elapsedTime = nowMs / 1000;

    // Calculate Windowed Metrics (5s window)
    if (nowMs - this.windowStartTime > 5000) {
      this.dashCount = 0;
      this.damageTakenSum = 0;
      this.killsInWindow = 0;
      this.windowStartTime = nowMs;
    }

    const activeGems = PoolManager.getInstance().activeGems.length;
    const windowDuration = (nowMs - this.windowStartTime) / 1000 || 1;

    const inputs: UnifiedInputs = {
      // Market Data
      rsi: marketRSI / 100,
      rsiMomentum: (marketRSI - 50) / 50, // Simplified momentum
      atrPercent: marketAtrPercent,
      volumeNorm: marketVolume,
      priceChange: (pnl - this.lastPnL) * 10, // Scale up price change
      trendStrength: Math.abs(marketRSI - 50) / 25, // Distance from neutral

      // Player State
      hpPercent: inp.hpPercent,
      pnlRatio: clamp(currentLeveragedPnL, -1, 1),
      killsPerMin: ((this.killsInWindow / windowDuration) * 60) / 30, // Normalized to 30 kills/min
      dashFrequency: ((this.dashCount / windowDuration) * 10) / 5, // Normalized to 5 dashes/10s
      playerDPS: this.killStreak / 10, // Proxy for DPS
      damageTakenRate: this.damageTakenSum / windowDuration / 20, // Normalized to 20hp/s

      // Game Context
      elapsedMinutes: elapsedTime / 60,
      playerLevel: level / 50,
      leverage: inp.leverage / 100,
      gemPileup: activeGems / 200, // Normalized to 200 gems
      engagementScore: 0.5, // Will be updated by brain
      frustrationScore: 0.5, // Will be updated by brain
    };

    // Update brain and get outputs
    UnifiedDirector.update(inputs, nowMs);
    const uo = UnifiedDirector.getOutputs();

    const output: DifficultyOutput = {
      spawnRate: clamp(
        total * scale.spawn * uo.spawnRate || 1.0,
        D_CONFIG.LIMITS.spawnRate.min,
        D_CONFIG.LIMITS.spawnRate.max
      ),
      enemySpeed: clamp(
        f.pnl * f.atr * scale.speed * uo.enemySpeed || 1.0,
        D_CONFIG.LIMITS.enemySpeed.min,
        D_CONFIG.LIMITS.enemySpeed.max
      ),
      enemyHealth: clamp(
        f.cycle * f.level * scale.hp * uo.enemyHP || 1.0,
        D_CONFIG.LIMITS.enemyHP.min,
        D_CONFIG.LIMITS.enemyHP.max
      ),
      enemyDamage: clamp(
        f.cycle * f.pnl * scale.damage * uo.enemyDamage || 1.0,
        D_CONFIG.LIMITS.enemyDamage.min,
        D_CONFIG.LIMITS.enemyDamage.max
      ),
      gemValueMultiplier: uo.gemDropRate, // Use gemDropRate as multiplier
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
      // V2 Specific fields
      variety: uo.enemyVariety,
      chaos: uo.chaosLevel,
      mercy: uo.mercyFactor,
      pressure: uo.pressureIntensity,
      whaleProb: uo.whaleProbability,
      xpMult: uo.xpMultiplier,
    };

    // Refine total for UI - Protect against NaN components
    const totalComp = (output.spawnRate + output.enemySpeed + output.enemyHealth) / 3;
    output.total = isNaN(totalComp) ? 1.0 : totalComp;
    this.latestOutput = output;

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
          EventBus.emit('hitStop', { duration: 100, isCrit: true, isSuperCrit: false }); // Brief pause for impact
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
    const context = difficultyContext.getContext();
    const leverage = context.inputs.leverage;

    // 1. Base Leverage Scaling (Static part)
    // Power-law scaling for impact: sqrt(L) gives a nice diminishing return that still feels massive
    // 100x = 1 + (10 - 1) * 0.8 = 8.2x XP
    // 10x = 1 + (3.16 - 1) * 0.8 = 2.7x XP
    let multiplier = 1.0;
    if (leverage > 1) {
      multiplier = 1 + (Math.sqrt(leverage) - 1) * 0.8;
    }

    // 2. Dynamic Flow State Scaling (Brain part)
    // The GameMasterBrain provides gemValueMultiplier based on momentum, stress and flow
    if (this.latestOutput && typeof this.latestOutput.gemValueMultiplier === 'number') {
      // Blend static leverage multiplier with dynamic brain multiplier
      // We use gemValueMultiplier to scale the final output
      const brainMult = isNaN(this.latestOutput.gemValueMultiplier)
        ? 1.0
        : this.latestOutput.gemValueMultiplier;
      multiplier *= brainMult;
    }

    // Ensure multiplier is at least 1.0 and is a valid number
    if (isNaN(multiplier) || multiplier < 1.0 || !isFinite(multiplier)) {
      multiplier = 1.0;
    }

    return Math.min(multiplier, 25.0); // Increased upper bound to allow for high-stakes flow peaks
  }

  public getLatestOutput(): DifficultyOutput | null {
    return this.latestOutput;
  }

  getKillStreak(): number {
    return this.killStreak;
  }

  /**
   * @deprecated Legacy V1 Support: Wave cycles removed. Use DirectorAdapter instead.
   */
  getCycleNumber(): number {
    const totalSeconds = TimeService.getGameTimeSeconds();
    return Math.floor(totalSeconds / 300) + 1;
  }

  /**
   * @deprecated Legacy V1 Support.
   */
  getCycleProgress(): number {
    const totalElapsed = TimeService.getGameTimeSeconds();
    const cycleElapsed = totalElapsed % 300; // Legacy 300s cycle
    return cycleElapsed / 300;
  }

  /**
   * @deprecated Legacy V1 Support: Wave cycles removed
   */
  getTimeRemainingInCycle(): number {
    const totalElapsed = TimeService.getGameTimeSeconds();
    const cycleElapsed = totalElapsed % 300;
    return 300 - cycleElapsed;
  }

  getDebugState(): DifficultyDebugState {
    const totalElapsedSeconds = TimeService.getGameTimeSeconds();
    const cycleElapsed = totalElapsedSeconds % 300;

    return {
      systemName: 'DifficultyManager',
      timestamp: getDebugTimestamp(),
      wavePhase: 'active' as WavePhase, // AI Director V2: Always active
      waveTimer: 0, // Simplified
      killStreak: this.killStreak,
      totalElapsedSeconds,
      pnlHistoryLength: 0,
      waveDurations: { active: 300 },
      waveMultipliers: { active: 1.0 },
      cycleNumber: Math.floor(totalElapsedSeconds / 300) + 1,
      cycleProgress: cycleElapsed / 300,
      timeRemainingInPhase: 0,
      timeRemainingInCycle: 300 - cycleElapsed,
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
    this.lastPnL = 0;
    this.lastVolume = 0;
    this.pnlMomentum = 0;
    this.volumeMomentum = 0;

    difficultyContext.reset();
    Logger.info('[DifficultyManager] V2 State reset');
  }

  static resetForTesting(): void {
    if (this.instance) {
      this.instance.unsubscribeFns.forEach(unsub => unsub());
      this.instance.unsubscribeFns = [];
      this.instance.reset();
      this.instance.setupListeners();
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
export { DifficultyManagerClass };
