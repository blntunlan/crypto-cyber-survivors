import { EventBus } from '../core/EventBus';
import { ResetOrchestrator, RESET_PRIORITY } from '../core/ResetOrchestrator';
import { type DifficultyInputs } from './types';
import { getDefaultInputs } from './utils';
import { LeverageEngine } from '../gameplay/LeverageEngine';
import type { MarketPosition } from '../../types';
import { MarketInputAggregator } from './aggregators/MarketInputAggregator';
import { PlayerMetricsAggregator } from './aggregators/PlayerMetricsAggregator';
import { LeverageStateProvider } from './aggregators/LeverageStateProvider';

/**
 * DifficultyContextManager - V3 (Facade over Aggregators)
 *
 * The `inputs` property composes data from three aggregators:
 *  - MarketInputAggregator (market events)
 *  - PlayerMetricsAggregator (player state)
 *  - LeverageStateProvider (leverage / position / cycle)
 *
 * Public API is fully backward-compatible with V2.
 * Hot-path safe: pre-allocated `_composedInputs` mutated in-place.
 */
class DifficultyContextManager {
  private static instance: DifficultyContextManager | null = null;

  /**
   * Pre-allocated composed inputs object.
   * Updated in-place by the `inputs` getter — zero allocation.
   */
  private _composedInputs: DifficultyInputs = getDefaultInputs();

  /** Elapsed seconds — owned here (time is global, not market/player/leverage) */
  private _elapsedSeconds = 0;

  /** Cycle duration constant */
  private _cycleDuration: number;

  private constructor() {
    this._cycleDuration = this._composedInputs.cycleDuration;

    EventBus.on('gameStart', data => {
      if (data.leverage) {
        LeverageStateProvider.setLeverage(data.leverage);
        LeverageEngine.setLeverage(data.leverage);
      }
      if (data.position) {
        LeverageStateProvider.setPosition(data.position as unknown as MarketPosition);
      }
      if (data.entryPrice) {
        LeverageStateProvider.setEntryPrice(data.entryPrice);
      }
      // Clear pnl history on new game
      MarketInputAggregator.slice.pnlHistory.length = 0;
    });

    // Listen to gameMarketUpdate to keep LeverageEngine in sync
    EventBus.on('gameMarketUpdate', data => {
      LeverageEngine.updateMarketState(
        MarketInputAggregator.slice.atrPercent,
        data.pnl
      );
    });

    // Register with ResetOrchestrator for deterministic reset order (priority 100 = Data)
    ResetOrchestrator.registerResetHandler(
      RESET_PRIORITY.DATA,
      'DifficultyContext',
      () => {
        this.reset();
      }
    );

    // Keep legacy listener for backward compat during migration
    EventBus.on('gameReset', () => {
      this.reset();
    });

    // Belt-and-suspenders: reset on gameOver regardless of which code path triggers it
    EventBus.on('gameOver', () => {
      this.reset();
    });
  }

  public static getInstance(): DifficultyContextManager {
    return (DifficultyContextManager.instance ??= new DifficultyContextManager());
  }

  /**
   * Composed inputs — backward-compatible property.
   * Reads from aggregator slices and merges into pre-allocated object.
   */
  get inputs(): DifficultyInputs {
    const c = this._composedInputs;
    const m = MarketInputAggregator.slice;
    const p = PlayerMetricsAggregator.slice;
    const l = LeverageStateProvider.slice;

    // Time
    c.elapsedSeconds = this._elapsedSeconds;
    c.cycleDuration = this._cycleDuration;

    // Market
    c.pnlPercent = m.pnlPercent;
    c.currentPrice = m.currentPrice;
    c.rsi = m.rsi;
    c.rsiState = m.rsiState;
    c.normalizedVolume = m.normalizedVolume;
    c.whaleTier = m.whaleTier;
    c.atrPercent = m.atrPercent;
    c.macd.value = m.macd.value;
    c.macd.signal = m.macd.signal;
    c.macd.histogram = m.macd.histogram;
    c.macd.macd = m.macd.macd;
    c.pnlHistory = m.pnlHistory;

    // Player
    c.level = p.level;
    c.hpPercent = p.hpPercent;
    c.killStreak = p.killStreak;
    c.timeSinceLastKill = p.timeSinceLastKill;
    c.accuracy = p.accuracy;
    c.damageTakenFrequency = p.damageTakenFrequency;
    c.performanceScore = p.performanceScore;
    c.dps = p.dps;
    c.enemyHealthPool = p.enemyHealthPool;
    c.screenDensity = p.screenDensity;
    c.upgradeEfficiency = p.upgradeEfficiency;
    c.movementEntropy = p.movementEntropy;
    c.stress.score = p.stress.score;
    c.stress.damageRate = p.stress.damageRate;
    c.stress.dashUsage = p.stress.dashUsage;
    c.stress.nearDeathDuration = p.stress.nearDeathDuration;

    // Leverage
    c.leverage = l.leverage;
    c.position = l.position;
    c.entryPrice = l.entryPrice;
    c.liquidationPrice = l.liquidationPrice;
    c.cycleFactor = l.cycleFactor;

    return c;
  }

  /**
   * Allow direct set for backward compat (legacy code that does `difficultyContext.inputs = ...`)
   * Propagates values into the appropriate aggregator slices so the getter stays consistent.
   */
  set inputs(value: DifficultyInputs) {
    const base = getDefaultInputs();
    Object.assign(base, value);
    // Ensure nested objects exist even if value was cast with `as any`
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    base.macd ??= { histogram: 0, signal: 0, macd: 0, value: 0 };
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    base.stress ??= { score: 0, damageRate: 0, dashUsage: 0, nearDeathDuration: 0 };
    this._composedInputs = base;

    // Propagate to aggregators so the getter composition stays in sync
    const m = MarketInputAggregator.slice;
    m.pnlPercent = base.pnlPercent;
    m.currentPrice = base.currentPrice;
    m.rsi = base.rsi;
    m.rsiState = base.rsiState;
    m.normalizedVolume = base.normalizedVolume;
    m.whaleTier = base.whaleTier;
    m.atrPercent = base.atrPercent;
    m.macd.value = base.macd.value;
    m.macd.signal = base.macd.signal;
    m.macd.histogram = base.macd.histogram;
    m.macd.macd = base.macd.macd;

    const p = PlayerMetricsAggregator.slice;
    p.level = base.level;
    p.hpPercent = base.hpPercent;
    p.killStreak = base.killStreak;
    p.timeSinceLastKill = base.timeSinceLastKill;
    p.accuracy = base.accuracy;
    p.damageTakenFrequency = base.damageTakenFrequency;
    p.performanceScore = base.performanceScore;
    p.dps = base.dps;
    p.enemyHealthPool = base.enemyHealthPool;
    p.screenDensity = base.screenDensity;
    p.upgradeEfficiency = base.upgradeEfficiency;
    p.movementEntropy = base.movementEntropy;
    p.stress.score = base.stress.score;
    p.stress.damageRate = base.stress.damageRate;
    p.stress.dashUsage = base.stress.dashUsage;
    p.stress.nearDeathDuration = base.stress.nearDeathDuration;

    const l = LeverageStateProvider.slice;
    l.leverage = base.leverage;
    l.position = base.position;
    l.entryPrice = base.entryPrice;
    l.liquidationPrice = base.liquidationPrice;
    l.cycleFactor = base.cycleFactor;

    this._elapsedSeconds = base.elapsedSeconds;
  }

  // =========================================================================
  // PASS-THROUGH METHODS (backward compat)
  // =========================================================================

  public updateTime(elapsedSeconds: number): void {
    this._elapsedSeconds = elapsedSeconds;
  }

  public updateInputs(updates: Partial<DifficultyInputs>): void {
    // Apply updates to the appropriate aggregators
    if (updates.pnlPercent !== undefined) {
      MarketInputAggregator.slice.pnlPercent = updates.pnlPercent;
      MarketInputAggregator.recordPnLMove(
        updates.pnlPercent,
        LeverageStateProvider.slice.leverage
      );
    }
    if (updates.currentPrice !== undefined) {
      MarketInputAggregator.slice.currentPrice = updates.currentPrice;
    }
    if (updates.rsi !== undefined) MarketInputAggregator.slice.rsi = updates.rsi;
    if (updates.rsiState !== undefined) {
      MarketInputAggregator.slice.rsiState = updates.rsiState;
    }
    if (updates.normalizedVolume !== undefined) {
      MarketInputAggregator.slice.normalizedVolume = updates.normalizedVolume;
    }
    if (updates.atrPercent !== undefined) {
      MarketInputAggregator.slice.atrPercent = updates.atrPercent;
    }
    if (updates.whaleTier !== undefined) {
      MarketInputAggregator.slice.whaleTier = updates.whaleTier;
    }

    if (updates.level !== undefined) {
      PlayerMetricsAggregator.slice.level = updates.level;
    }
    if (updates.hpPercent !== undefined) {
      PlayerMetricsAggregator.slice.hpPercent = updates.hpPercent;
    }
    if (updates.killStreak !== undefined) {
      PlayerMetricsAggregator.slice.killStreak = updates.killStreak;
    }
    if (updates.timeSinceLastKill !== undefined) {
      PlayerMetricsAggregator.slice.timeSinceLastKill = updates.timeSinceLastKill;
    }
    if (updates.dps !== undefined) PlayerMetricsAggregator.slice.dps = updates.dps;
    if (updates.screenDensity !== undefined) {
      PlayerMetricsAggregator.slice.screenDensity = updates.screenDensity;
    }

    if (updates.leverage !== undefined) {
      LeverageStateProvider.setLeverage(updates.leverage);
    }
    if (updates.position !== undefined) {
      LeverageStateProvider.setPosition(updates.position);
    }
    if (updates.entryPrice !== undefined) {
      LeverageStateProvider.setEntryPrice(updates.entryPrice);
    }
    if (updates.cycleFactor !== undefined) {
      LeverageStateProvider.setCycleFactor(updates.cycleFactor);
    }

    if (updates.elapsedSeconds !== undefined) {
      this._elapsedSeconds = updates.elapsedSeconds;
    }
  }

  public updateCombatState(killStreak: number, timeSinceLastKill: number): void {
    PlayerMetricsAggregator.updateCombatState(killStreak, timeSinceLastKill);
  }

  public reset(): void {
    MarketInputAggregator.reset();
    PlayerMetricsAggregator.reset();
    LeverageStateProvider.reset();
    this._elapsedSeconds = 0;
    this._composedInputs = getDefaultInputs();
  }

  /** Reset per-cycle state on continue; preserve session-level state (leverage, market, time) */
  public resetForCycleContinue(): void {
    MarketInputAggregator.resetForCycleContinue();
    PlayerMetricsAggregator.resetForCycleContinue();
    LeverageStateProvider.resetCycleState();
    // Do NOT reset _elapsedSeconds — total run time persists across cycles
    // Do NOT reset _composedInputs — will be recomposed on next .inputs access
  }
}

export const difficultyContext = DifficultyContextManager.getInstance();
