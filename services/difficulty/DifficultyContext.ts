import { EventBus } from '../core/EventBus';
import {
  calculateCycleFactor,
  calculatePnLFactor,
  calculateLevelFactor,
  calculateLiquidationFactor,
  calculateStreakFactor,
  calculateShockFactor,
  calculateRSIFactor,
  calculateVolumeFactor,
  calculateATRFactor,
  calculateNearDeathFactor,
  calculatePerformanceFactor,
  // Wave factor removed - AI Director V2 uses market-driven difficulty
} from './factors';
import { calculateStressScore } from './factors/stress';
import {
  type DifficultyInputs,
  type DifficultyContextState,
  type DifficultyOutputV2,
  type WavePhase,
} from './types';
import { DIFFICULTY_CONFIG, getLeverageScale } from './constants';
import { clamp, getDefaultInputs } from './utils';
import type { MarketPosition } from '../../types';
import { marketIndicatorService } from '../indicators/MarketIndicatorService';

/**
 * DifficultyContextManager - Orchestrator for the Layered Difficulty System (V2)
 *
 * Responsibilities:
 * - Maintains raw inputs from various services via EventBus
 * - Tracks history (pnlHistory) for shock detection
 * - Provides lazy recalculation of factors (Dirty pattern)
 * - Exposes a unified state for Consumer Services (Layer 4)
 */
class DifficultyContextManager {
  private static instance: DifficultyContextManager | null = null;
  private state: DifficultyContextState;
  private output: DifficultyOutputV2;
  private inputs: DifficultyInputs;
  private isDirty = true;
  private lastCycleCount: number = 0;
  // Wave phase tracking removed - AI Director V2

  // Real-time performance counters
  private bulletsFiredInWindow = 0;
  private hitsInWindow = 0;
  private damageTakenInWindow = 0;
  private dashUsageInWindow = 0;
  private lastPerformanceUpdate = 0;

  // Sensor Data Buffers
  private nearDeathStartTime: number = 0; // Timestamp when player fell below 20% HP

  private constructor() {
    this.inputs = getDefaultInputs();
    this.state = this.recalculate(); // Initial state
    this.output = this.calculateFinalOutput(this.state);

    // --- Event Subscriptions ---

    // Market Updates (Price & PnL)
    EventBus.on('gameMarketUpdate', data => {
      this.inputs.pnlPercent = data.pnl;
      this.inputs.currentPrice = data.price;

      // Update PnL history buffer
      const leveragedPnL = data.pnl * this.inputs.leverage;
      this.inputs.pnlHistory.push(leveragedPnL);
      if (this.inputs.pnlHistory.length > DIFFICULTY_CONFIG.pnlHistorySize) {
        this.inputs.pnlHistory.shift();
      }

      this.markDirty();
    });

    // Market Indicator Updates (RSI, Volume, ATR)
    EventBus.on('marketStateChanged', data => {
      this.inputs.rsi = data.rsi;
      this.inputs.rsiState = data.rsiState;
      this.inputs.normalizedVolume = data.normalizedVolume;
      this.inputs.atrPercent = data.spawnRateMultiplier; // Use it as a proxy for volatility intensity for now
      this.markDirty();
    });

    // We also need ATR directly from marketStateUpdated if available
    EventBus.on('marketStateUpdated', data => {
      this.inputs.atrPercent = data.atrPercent;
      this.inputs.whaleTier = data.whaleTier as 0 | 1 | 2 | 3;
      this.markDirty();
    });

    // Player State Updates
    EventBus.on('levelUp', data => {
      this.inputs.level = data.level;
      this.markDirty();
    });

    EventBus.on('playerHit', () => {
      this.damageTakenInWindow++;
      this.markDirty();
    });

    EventBus.on('playerDash', () => {
      this.dashUsageInWindow++;
      this.markDirty();
    });

    EventBus.on('playerHealthChange', _data => {
      // Future granular HP tracking
    });

    // Combat Events
    EventBus.on('enemyKilled', () => {
      this.hitsInWindow++;
      this.markDirty();
    });

    EventBus.on('bulletFired', () => {
      this.bulletsFiredInWindow++;
      this.markDirty();
    });

    // Game Flow
    EventBus.on('gameStart', data => {
      if (data.leverage) {
        this.inputs.leverage = data.leverage;
      }
      if (data.position) {
        this.inputs.position = data.position as unknown as MarketPosition;
      }
      if (data.entryPrice) {
        this.inputs.entryPrice = data.entryPrice;
      }

      this.resetHistory();
      this.markDirty();
    });

    EventBus.on('gameReset', () => {
      this.inputs = getDefaultInputs();
      this.markDirty();
    });
  }

  public static getInstance(): DifficultyContextManager {
    return (DifficultyContextManager.instance ??= new DifficultyContextManager());
  }

  private markDirty() {
    this.isDirty = true;
  }

  /**
   * Get the current pre-computed difficulty state.
   * Uses lazy recalculation if inputs have changed.
   */
  public getContext(): DifficultyContextState {
    if (this.isDirty) {
      this.state = this.recalculate();
      this.output = this.calculateFinalOutput(this.state);
      this.isDirty = false;
    }
    return this.state;
  }

  /**
   * Get mapped game-engine outputs (Spawn rates, speeds, etc.)
   */
  public getDifficultyOutput(): DifficultyOutputV2 {
    if (this.isDirty) {
      this.getContext(); // Triggers recalculate
    }
    return this.output;
  }

  /**
   * Internal factor aggregation logic
   */
  private recalculate(): DifficultyContextState {
    const { inputs } = this;
    const now = Date.now();

    // 0. Update Activity-based Inputs (Sensors)
    if (this.lastPerformanceUpdate === 0) this.lastPerformanceUpdate = now;
    const dtSeconds = (now - this.lastPerformanceUpdate) / 1000;

    if (dtSeconds >= 0.2) {
      // 200ms Sensor Loop

      // Accuracy calc (only if window > 5s effectively, but we do sliding average)
      if (dtSeconds >= 5) {
        if (this.bulletsFiredInWindow > 0) {
          const currentAcc = this.hitsInWindow / this.bulletsFiredInWindow;
          // Smooth accuracy (EMA)
          inputs.accuracy = inputs.accuracy * 0.7 + currentAcc * 0.3;
        }
      }

      // Damage frequency (HPM - Hits Per Minute) - Normalized to per-second contribution for smoothness
      // We scale it up to minute-rate for the formula
      const currentHPM = (this.damageTakenInWindow / dtSeconds) * 60;
      inputs.damageTakenFrequency =
        inputs.damageTakenFrequency * 0.8 + currentHPM * 0.2; // faster reaction

      // Dash Usage (Dashes Per Minute)
      const currentDPM = (this.dashUsageInWindow / dtSeconds) * 60;
      inputs.stress.dashUsage = inputs.stress.dashUsage * 0.8 + currentDPM * 0.2;

      // Reset window counters
      this.bulletsFiredInWindow = 0;
      this.hitsInWindow = 0;
      this.damageTakenInWindow = 0;
      this.dashUsageInWindow = 0;
      this.lastPerformanceUpdate = now;
    }

    // 0.5 Update Sensors (MACD & Stress)

    // MACD - Pull from centralized MarketIndicatorService
    const marketState = marketIndicatorService.getState();
    inputs.macd = marketState.macd;

    // Stress - Near Death Duration Tracking
    // We assume hpPercent is updated via updateInputs from GameEngine or Events
    const isNearDeath = inputs.hpPercent < 0.2;
    if (isNearDeath) {
      if (this.nearDeathStartTime === 0) this.nearDeathStartTime = now;
      inputs.stress.nearDeathDuration = (now - this.nearDeathStartTime) / 1000;
    } else {
      this.nearDeathStartTime = 0;
      inputs.stress.nearDeathDuration = 0;
    }

    // Update Stress Score
    inputs.stress.damageRate = inputs.damageTakenFrequency;
    inputs.stress.score = calculateStressScore({
      damageTakenFrequency: inputs.stress.damageRate,
      dashUsageFrequency: inputs.stress.dashUsage,
      nearDeathDuration: inputs.stress.nearDeathDuration,
    });

    // 1. Calculate Individual Factors (Layer 2)
    const cycle = calculateCycleFactor({
      elapsedSeconds: inputs.elapsedSeconds,
      cycleDuration: inputs.cycleDuration,
    });
    const pnl = calculatePnLFactor({
      pnlPercent: inputs.pnlPercent,
      leverage: inputs.leverage,
    });
    const level = calculateLevelFactor({
      level: inputs.level,
      leverage: inputs.leverage,
    });

    // Wave system REMOVED - AI Director V2 uses market-driven difficulty
    // Keeping a simple time ramp for long-term pressure (5% every minute)
    const timeRamp = 1.0 + (inputs.elapsedSeconds / 60) * 0.05;

    // Market-based difficulty will be handled by UnifiedDirector
    // For now, use a neutral wave factor of 1.0
    const wave = {
      factor: timeRamp,
      phase: 'active' as WavePhase, // Single "active" phase
    };

    const liquidation = calculateLiquidationFactor({
      currentPrice: inputs.currentPrice,
      entryPrice: inputs.entryPrice,
      liquidationPrice: inputs.liquidationPrice,
      position: inputs.position,
    });

    const streak = calculateStreakFactor({
      killStreak: inputs.killStreak,
      timeSinceLastKill: inputs.timeSinceLastKill,
    });
    const nearDeath = calculateNearDeathFactor({
      hpPercent: inputs.hpPercent,
    });
    const shock = calculateShockFactor({
      pnlHistory: inputs.pnlHistory,
      leverage: inputs.leverage,
    });

    const rsi = calculateRSIFactor({
      rsiState: inputs.rsiState,
      position: inputs.position,
    });
    const volume = calculateVolumeFactor({
      normalizedVolume: inputs.normalizedVolume,
      whaleTier: inputs.whaleTier,
    });
    const atr = calculateATRFactor({ atrPercent: inputs.atrPercent });

    const performance = calculatePerformanceFactor({
      accuracy: inputs.accuracy,
      damageTakenFrequency: inputs.damageTakenFrequency,
      atrPercent: inputs.atrPercent,
      leverage: inputs.leverage,
    });

    // Core is now just Time * PnL * Level
    const core = timeRamp * pnl * level;
    const modifier = liquidation.factor * streak * nearDeath * shock.factor;
    const market = rsi * volume * atr;

    const totalRaw = core * modifier * market * performance;
    const total = Number.isNaN(totalRaw)
      ? 1.0
      : clamp(
          totalRaw,
          DIFFICULTY_CONFIG.limits.total.min,
          DIFFICULTY_CONFIG.limits.total.max
        );

    const leverageScale = getLeverageScale(inputs.leverage);

    const newState: DifficultyContextState = {
      factors: {
        cycle,
        pnl,
        level,
        wave: wave.factor,
        wavePhase: wave.phase,
        liquidation,
        streak,
        nearDeath,
        shock,
        rsi,
        volume,
        atr,
        performance,
      },
      aggregates: {
        core,
        modifier,
        market,
        performance,
        total,
      },
      inputs: {
        ...inputs,
        leverageScale,
      },
    };

    // --- State-based Event Emission ---

    // 1. Cycle Completion Detection
    const currentCycle = Math.floor(inputs.elapsedSeconds / 300);
    if (this.lastCycleCount !== currentCycle && inputs.elapsedSeconds > 0) {
      EventBus.emit('cycleComplete', {
        cycleNumber: this.lastCycleCount + 1,
        totalElapsedSeconds: inputs.elapsedSeconds,
      });
      this.lastCycleCount = currentCycle;
    }

    // Wave Phase Change Detection - REMOVED in AI Director V2
    // Market-driven events will be handled by UnifiedDirector

    // 3. Emit detailed update for debug/UI systems
    if (this.isDirty) {
      EventBus.emit(
        'difficultyUpdated',
        newState as unknown as Record<string, unknown>
      );
    }

    return newState;
  }

  public updateTime(elapsedSeconds: number) {
    if (this.inputs.elapsedSeconds !== elapsedSeconds) {
      this.inputs.elapsedSeconds = elapsedSeconds;
      this.markDirty();
    }
  }

  /**
   * Directly update multiple inputs (useful for legacy bridges or manual sync)
   */
  public updateInputs(updates: Partial<DifficultyInputs>) {
    Object.assign(this.inputs, updates);
    if (updates.pnlPercent !== undefined) {
      this.recordPnLMove(updates.pnlPercent);
    }
    this.markDirty();
  }

  public reset() {
    this.inputs = getDefaultInputs();
    this.resetHistory();
    this.markDirty();
  }

  private recordPnLMove(pnl: number) {
    const leveragedPnL = pnl * this.inputs.leverage;
    this.inputs.pnlHistory.push(leveragedPnL);
    if (this.inputs.pnlHistory.length > DIFFICULTY_CONFIG.pnlHistorySize) {
      this.inputs.pnlHistory.shift();
    }
  }

  public updateCombatState(killStreak: number, timeSinceLastKill: number) {
    this.inputs.killStreak = killStreak;
    this.inputs.timeSinceLastKill = timeSinceLastKill;
    this.markDirty();
  }

  private resetHistory() {
    this.inputs.pnlHistory = [];
    this.bulletsFiredInWindow = 0;
    this.hitsInWindow = 0;
    this.damageTakenInWindow = 0;
    this.dashUsageInWindow = 0;
  }

  /**
   * Mapping Layer (Layer 4 helper)
   * Transforms raw factors into game-engine digestible outputs
   */
  private calculateFinalOutput(state: DifficultyContextState): DifficultyOutputV2 {
    const { factors: f, aggregates: agg, inputs: inp } = state;
    const { limits } = DIFFICULTY_CONFIG;
    const scale = inp.leverageScale;

    return {
      total: agg.total,
      wavePhase: f.wavePhase, // Always 'active' in V2
      liquidationWarning: f.liquidation.warningLevel,
      fovReduction: f.liquidation.fovReduction,
      shockActive: f.shock.triggered,
      spawnRate: clamp(
        agg.total * scale.spawn,
        limits.spawnRate.min,
        limits.spawnRate.max
      ),
      // Wave factor removed from enemySpeed calculation
      enemySpeed: clamp(
        f.pnl * f.atr * scale.speed,
        limits.enemySpeed.min,
        limits.enemySpeed.max
      ),
      enemyHP: clamp(
        f.cycle * f.level * scale.hp,
        limits.enemyHP.min,
        limits.enemyHP.max
      ),
      enemyDamage: clamp(
        f.cycle * f.pnl * scale.damage,
        limits.enemyDamage.min,
        limits.enemyDamage.max
      ),
    };
  }
}

export const difficultyContext = DifficultyContextManager.getInstance();
