import { TimeService } from '../core/TimeService';
import { useAdminConfigStore } from '../../stores/admin/configStore';
import type { DifficultyConfig } from '../../types/admin';
import { type DifficultyDebugState, getDebugTimestamp } from '../../types/DebugState';
import { type WavePhase } from '../../types/metrics';
import { DIFFICULTY_CONFIG as D_CONFIG } from '../../config';
import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';
import {
  difficultyContext,
  clamp,
  UnifiedDirector,
  type UnifiedInputs,
  type LiquidationWarning,
} from '../difficulty';
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
  private lastLiquidationWarning: LiquidationWarning = 'NONE';
  private lastLiquidationWarningDistance: number = 100;
  private lastLiquidationWarningEmitTime: number = -Infinity;

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
      EventBus.on('gameReset', () => this.reset(), { scope: 'system' }),
      // Belt-and-suspenders: reset UnifiedDirector on gameOver event so its
      // smoothedOutputs don't leak across runs (mirrors DifficultyContext's
      // own gameOver listener). The liquidation path (useMarketTimeout) emits
      // gameOver without going through handleGameOver, so this listener is the
      // only reset trigger for UnifiedDirector on that path.
      EventBus.on(
        'gameOver',
        () => {
          UnifiedDirector.reset();
        },
        { scope: 'system' }
      )
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
    // Extend combo window at high leverage (enemies are faster/denser, harder to chain kills)
    // 1x→3s, 25x→3.75s, 50x→4.25s, 100x→5s
    const leverageExtension = Math.min(2.0, (LeverageEngine.getLeverage() - 1) * 0.02);
    const streakWindowSec = D_CONFIG.STREAK_TIMEOUT_MS / 1000 + leverageExtension;
    if (gameTimeSec - this.lastKillStreakTime < streakWindowSec) {
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
    configOverride?: Partial<DifficultyConfig>,
    forceSnap: boolean = false
  ): DifficultyOutput {
    difficultyContext.updateInputs({
      pnlPercent: pnl,
      atrPercent,
      level,
      hpPercent,
      elapsedSeconds: TimeService.getGameTimeSeconds(),
    });
    const timeSinceLastKillMs =
      (TimeService.getGameTimeSeconds() - this.lastKillStreakTime) * 1000;
    difficultyContext.updateCombatState(this.killStreak, timeSinceLastKillMs);

    const inputs = difficultyContext.inputs;

    const adminConfig = configOverride ?? this.getAdminConfig();
    const baseMultiplier = adminConfig?.base
      ? adminConfig.base / D_CONFIG.BASE_ADMIN_DIVISOR
      : 1.0;
    const maxDifficulty = adminConfig?.maxDifficulty ?? D_CONFIG.LIMITS.total.max;

    const marketRSI = Number.isFinite(inputs.rsi) ? inputs.rsi : 50;
    const marketAtrPercent = Number.isFinite(inputs.atrPercent) ? inputs.atrPercent : 0;
    const marketVolume = Number.isFinite(inputs.normalizedVolume)
      ? inputs.normalizedVolume
      : 0.5;

    const previousLeveragedPnL = this.lastPnL;
    const currentLeveragedPnL = pnl * inputs.leverage;
    this.pnlMomentum =
      this.pnlMomentum * 0.8 + (currentLeveragedPnL - previousLeveragedPnL) * 0.2;
    this.volumeMomentum =
      this.volumeMomentum * 0.8 + (marketVolume - this.lastVolume) * 0.2;

    this.lastPnL = currentLeveragedPnL;
    this.lastVolume = marketVolume;

    const nowMs = TimeService.getGameTime();
    const elapsedTime = nowMs / 1000;

    if (this.windowStartTime === 0) {
      this.windowStartTime = nowMs;
    }

    if (nowMs - this.windowStartTime > 5000) {
      this.dashCount = 0;
      this.damageTakenSum = 0;
      this.killsInWindow = 0;
      this.windowStartTime = nowMs;
    }

    const activeGems = PoolManager.getInstance().activeGems.length;
    const windowDuration = (nowMs - this.windowStartTime) / 1000 || 1;

    const unifiedInputs: UnifiedInputs = {
      rsi: marketRSI / 100,
      rsiMomentum: (marketRSI - 50) / 50,
      atrPercent: marketAtrPercent,
      volumeNorm: marketVolume,
      priceChange: (currentLeveragedPnL - previousLeveragedPnL) * 10,
      trendStrength: Math.abs(marketRSI - 50) / 25,
      hpPercent: inputs.hpPercent,
      pnlRatio: clamp(currentLeveragedPnL, -1, 1),
      killsPerMin: ((this.killsInWindow / windowDuration) * 60) / 30,
      dashFrequency: ((this.dashCount / windowDuration) * 10) / 5,
      playerDPS: this.killStreak / 10,
      damageTakenRate: this.damageTakenSum / windowDuration / 20,
      elapsedMinutes: elapsedTime / 60,
      playerLevel: level / 50,
      leverage: inputs.leverage / 100,
      gemPileup: activeGems / 200,
      engagementScore: 0.5,
      frustrationScore: 0.5,
      macdHistogram: 0,
      side: 'long',
    };

    UnifiedDirector.update(unifiedInputs, nowMs);
    if (forceSnap) {
      UnifiedDirector.snapToTargets();
    }
    const uo = UnifiedDirector.getOutputs();
    const liquidation = this.calculateLiquidationWarning(currentLeveragedPnL);

    // Convert old shock logic context
    let isShockActive = false;
    let shockFactor = 1.0;

    // Downside shock (extreme losses)
    if (this.pnlMomentum < -0.01) {
      isShockActive = true;
      shockFactor = 2.0;
    }
    // Upside shock (extreme gains - keep them on their toes)
    // Threshold set to 0.01 to match downside sensitivity
    else if (this.pnlMomentum > 0.01) {
      isShockActive = true;
      shockFactor = 1.2;
    }

    // Scale properties correctly using outputs from Director
    const totalRaw =
      ((uo.spawnRate + uo.enemySpeed + uo.enemyHP + uo.enemyDamage) / 4) *
      baseMultiplier *
      shockFactor;
    const total = clamp(
      isNaN(totalRaw) ? 1.0 : totalRaw,
      D_CONFIG.LIMITS.total.min,
      maxDifficulty
    );

    const output: DifficultyOutput = {
      spawnRate: uo.spawnRate,
      enemySpeed: uo.enemySpeed,
      enemyHP: uo.enemyHP,
      enemyDamage: uo.enemyDamage,
      gemDropRate: uo.gemDropRate,
      total,
      wavePhase: 'active',
      liquidationWarning: liquidation.level,
      fovReduction: liquidation.fovReduction,
      shockActive: isShockActive,
      enemyVariety: uo.enemyVariety,
      chaosLevel: uo.chaosLevel,
      mercyFactor: uo.mercyFactor,
      pressureIntensity: uo.pressureIntensity,
      whaleProbability: uo.whaleProbability,
      xpMultiplier: uo.xpMultiplier,
    };

    this.latestOutput = output;
    this.emitLiquidationWarning(liquidation, currentLeveragedPnL, nowMs);

    const isGracePeriod = TimeService.getGameTimeSeconds() < 5;

    if (isShockActive && !isGracePeriod) {
      if (nowMs / 1000 - this.lastShockTime >= 10) {
        this.lastShockTime = nowMs / 1000;
        const leverageImpact = 1 + Math.log10(inputs.leverage) * 0.5;
        const payload = {
          intensity: Math.min(2.0, shockFactor * leverageImpact),
          direction: 'down' as const,
          isHighLeverage: inputs.leverage >= 25,
        };
        EventBus.emit('volatilityShock', payload);
        EventBus.emit('shockDetected', payload);
        if (inputs.leverage >= 50) {
          EventBus.emit('hitStop', { duration: 100, isCrit: true, isSuperCrit: false });
        }
      }
    }

    return output;
  }

  public getXpMultiplier(): number {
    // Dynamic Flow State Scaling ONLY (brain/director part).
    // Leverage-based XP scaling is handled exclusively by:
    //   - LeverageEngine.gemValue (gem reward size)
    //   - LEVERAGE_TIERS.xpReq (level threshold reduction)
    // These two factors combined give ~1x-3.5x leveling speed across leverages.
    // Stacking a third leverage multiplier here caused ~64x compounding at 100x.
    let multiplier = 1.0;

    if (this.latestOutput && typeof this.latestOutput.gemDropRate === 'number') {
      const brainMult = isNaN(this.latestOutput.gemDropRate)
        ? 1.0
        : this.latestOutput.gemDropRate;
      multiplier *= brainMult;
    }

    if (isNaN(multiplier) || multiplier < 1.0 || !isFinite(multiplier)) {
      multiplier = 1.0;
    }

    return Math.min(multiplier, 3.0);
  }

  public getLatestOutput(): DifficultyOutput | null {
    return this.latestOutput;
  }

  getKillStreak(): number {
    return this.killStreak;
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

  private calculateLiquidationWarning(effectivePnl: number): {
    level: LiquidationWarning;
    distance: number;
    fovReduction: number;
  } {
    const distance = clamp((1 + effectivePnl) * 100, 0, 100);

    if (effectivePnl <= -0.95) {
      return { level: 'CRITICAL', distance, fovReduction: 0.55 };
    }
    if (effectivePnl <= -0.8) {
      return { level: 'DANGER', distance, fovReduction: 0.35 };
    }
    if (effectivePnl <= -0.6) {
      return { level: 'CAUTION', distance, fovReduction: 0.18 };
    }

    return { level: 'NONE', distance, fovReduction: 0 };
  }

  private emitLiquidationWarning(
    liquidation: { level: LiquidationWarning; distance: number; fovReduction: number },
    effectivePnl: number,
    nowMs: number
  ): void {
    const distanceDelta = Math.abs(
      liquidation.distance - this.lastLiquidationWarningDistance
    );
    const levelChanged = liquidation.level !== this.lastLiquidationWarning;
    const shouldRefreshActive =
      liquidation.level !== 'NONE' &&
      (nowMs - this.lastLiquidationWarningEmitTime >= 1000 || distanceDelta >= 1);

    if (!levelChanged && !shouldRefreshActive) {
      return;
    }

    this.lastLiquidationWarning = liquidation.level;
    this.lastLiquidationWarningDistance = liquidation.distance;
    this.lastLiquidationWarningEmitTime = nowMs;

    EventBus.emit('liquidationWarning', {
      level: liquidation.level,
      distance: liquidation.distance,
      distanceToLiquidation: liquidation.distance,
      effectivePnl,
      fovReduction: liquidation.fovReduction,
    });
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
    this.lastLiquidationWarning = 'NONE';
    this.lastLiquidationWarningDistance = 100;
    this.lastLiquidationWarningEmitTime = -Infinity;
    this.dashCount = 0;
    this.damageTakenSum = 0;
    this.killsInWindow = 0;
    this.windowStartTime = 0;

    difficultyContext.reset();
    UnifiedDirector.reset();
    Logger.info('[DifficultyManager] V2 State reset');
  }

  resetForCycleContinue(): void {
    this.killStreak = 0;
    this.lastKillStreakTime = 0;
    this.lastShockTime = -20;
    this.dashCount = 0;
    this.damageTakenSum = 0;
    this.killsInWindow = 0;
    this.windowStartTime = 0;

    difficultyContext.resetForCycleContinue();
    UnifiedDirector.reset();
    Logger.info('[DifficultyManager] Cycle continue state reset');
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
