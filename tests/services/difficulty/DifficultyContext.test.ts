import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../services/core/EventBus';
import { difficultyContext } from '../../../services/difficulty/DifficultyContext';
import { LeverageStateProvider } from '../../../services/difficulty/aggregators/LeverageStateProvider';
import {
  createRunConstants,
  createRuntimeSnapshot,
  createRuntimeTick,
} from '../../../services/market/runtime/RuntimeContractBuilder';
import { MARKET_RUNTIME_VERSION } from '../../../types/marketRuntime';
import { type MarketData } from '../../../types';
import { type MACDResult } from '../../../types/indicators';

const createRuntimeSnapshotEvent = (seq: number, macd: number) => {
  const runConstants = createRunConstants({
    runId: 'run-difficulty',
    pair: 'BTC',
    position: 'LONG',
    leverage: 10,
    entryPrice: 100,
    liquidationPrice: 90,
    startedAt: 1,
    versions: MARKET_RUNTIME_VERSION,
  });

  const tick = createRuntimeTick({
    runId: runConstants.runId,
    seq,
    pair: 'BTC',
    source: 'binance',
    sourceTs: 1_000 + seq,
    recvTs: 1_000 + seq,
    price: 100 + seq,
    volume: 5,
    prevHash: seq === 1 ? 'seed0000' : 'seed0001',
  });

  const marketData: MarketData = {
    price: 100 + seq,
    volume: 5,
    pnl: 0.01,
    effectivePnl: 0.1,
    leverage: 10,
    rsi: 55,
    difficulty: 1.1,
    momentum: 0.02,
    atrPercent: 0.004,
    spawnRateMultiplier: 1.02,
    enemyDamage: 1.01,
    enemySpeed: 1.01,
    gemValueMultiplier: 1.01,
  };

  return createRuntimeSnapshot({
    runConstants,
    tick,
    marketData,
    createdAt: tick.recvTs,
    macd,
  });
};

describe('DifficultyContext', () => {
  beforeEach(() => {
    difficultyContext.reset();
    vi.restoreAllMocks();
  });

  it('uses client indicator MACD when runtime authority is absent', () => {
    EventBus.emit('clientIndicatorsUpdated', {
      rsi: 61,
      rsiState: 'OVERBOUGHT',
      atrPercent: 0.0065,
      normalizedVolume: 0.72,
      priceChangePercent: 0.02,
      trendStrength: 0.44,
      trendDirection: 'UP',
      macd: {
        value: 3.4,
        signal: 1.2,
        histogram: 2.2,
      },
      whaleTier: 2,
    });

    difficultyContext.updateTime(1);
    const context = difficultyContext.inputs;

    expect(context.rsi).toBe(61);
    expect(context.rsiState).toBe('OVERBOUGHT');
    expect(context.macd).toEqual({
      value: 3.4,
      signal: 1.2,
      histogram: 2.2,
      macd: 3.4,
    });
  });

  it('keeps runtime MACD as source after runtime snapshot arrives', () => {
    const snapshot = createRuntimeSnapshotEvent(1, 0.75);
    EventBus.emit('marketRuntimeSnapshot', snapshot);

    const first = difficultyContext.inputs;
    expect(first.macd.value).toBe(0.75);
    expect(first.macd.signal).toBe(0);
    expect(first.macd.histogram).toBe(0.75);

    EventBus.emit('clientIndicatorsUpdated', {
      rsi: 20,
      rsiState: 'OVERSOLD',
      atrPercent: 0.02,
      normalizedVolume: 0.95,
      priceChangePercent: -0.08,
      trendStrength: 0.9,
      trendDirection: 'DOWN',
      macd: {
        value: -9,
        signal: -8,
        histogram: -1,
      },
      whaleTier: 3,
    });

    difficultyContext.updateTime(2);
    const second = difficultyContext.inputs;
    expect(second.macd.value).toBe(0.75);
    expect(second.macd.signal).toBe(0);
    expect(second.macd.histogram).toBe(0.75);
  });

  it('resets on gameOver event (belt-and-suspenders)', () => {
    // Simulate accumulated state
    difficultyContext.updateInputs({ cycleFactor: 2.5, level: 10 });
    expect(difficultyContext.inputs.cycleFactor).toBe(2.5);

    EventBus.emit('gameOver', { finalLevel: 10, finalPnl: 0.5 });

    const after = difficultyContext.inputs;
    expect(after.cycleFactor).toBe(1);
    expect(after.level).toBe(1);
    expect(after.elapsedSeconds).toBe(0);
  });

  it('resetForCycleContinue resets cycleFactor and player metrics but preserves leverage state', () => {
    // Set up session-level and per-cycle state
    difficultyContext.updateInputs({
      leverage: 10,
      entryPrice: 45000,
      cycleFactor: 1.5,
      level: 8,
      killStreak: 15,
    });

    difficultyContext.resetForCycleContinue();

    const after = difficultyContext.inputs;
    // Per-cycle state should be reset
    expect(after.cycleFactor).toBe(1.0);
    expect(after.level).toBe(1);
    expect(after.killStreak).toBe(0);
    // Session-level state should be preserved
    expect(after.leverage).toBe(10);
    expect(after.entryPrice).toBe(45000);
  });

  it('resetForCycleContinue clears pnlHistory but preserves live market indicators', () => {
    difficultyContext.updateInputs({
      rsi: 65,
      currentPrice: 50000,
    });
    // Add pnlHistory entries via market aggregator
    difficultyContext.updateInputs({ pnlPercent: 0.05 });
    difficultyContext.updateInputs({ pnlPercent: 0.1 });

    const before = difficultyContext.inputs;
    expect(before.pnlHistory.length).toBeGreaterThan(0);

    difficultyContext.resetForCycleContinue();

    const after = difficultyContext.inputs;
    expect(after.pnlHistory.length).toBe(0);
    expect(after.rsi).toBe(65);
    expect(after.currentPrice).toBe(50000);
  });

  it('resetForCycleContinue preserves elapsedSeconds', () => {
    difficultyContext.updateTime(300);
    difficultyContext.resetForCycleContinue();

    const after = difficultyContext.inputs;
    expect(after.elapsedSeconds).toBe(300);
  });

  it('resetForCycleContinue followed by updateInputs applies cycleFactor cleanly', () => {
    difficultyContext.updateInputs({ cycleFactor: 1.5, level: 10 });
    expect(difficultyContext.inputs.cycleFactor).toBe(1.5);
    expect(difficultyContext.inputs.level).toBe(10);

    difficultyContext.resetForCycleContinue();
    difficultyContext.updateInputs({ cycleFactor: 2.0 });

    const after = difficultyContext.inputs;
    expect(after.cycleFactor).toBe(2.0);
    expect(after.level).toBe(1);
  });

  it('reset() clears all mutable state to defaults', () => {
    // Mutate every category of state
    difficultyContext.updateInputs({
      cycleFactor: 3.0,
      level: 15,
      hpPercent: 0.3,
      killStreak: 42,
      timeSinceLastKill: 5,
      leverage: 50,
      entryPrice: 70000,
      pnlPercent: 0.25,
      rsi: 80,
      rsiState: 'OVERBOUGHT',
      normalizedVolume: 0.9,
      atrPercent: 0.02,
      whaleTier: 3,
      dps: 150,
      screenDensity: 0.8,
    });
    difficultyContext.updateTime(600);

    difficultyContext.reset();
    const after = difficultyContext.inputs;

    // Time
    expect(after.elapsedSeconds).toBe(0);
    // Leverage/Cycle
    expect(after.cycleFactor).toBe(1);
    expect(after.leverage).toBe(5);
    expect(after.entryPrice).toBe(0);
    // Market
    expect(after.pnlPercent).toBe(0);
    expect(after.rsi).toBe(50);
    expect(after.rsiState).toBe('NEUTRAL');
    expect(after.normalizedVolume).toBe(0);
    expect(after.atrPercent).toBe(0);
    expect(after.whaleTier).toBe(0);
    // Player
    expect(after.level).toBe(1);
    expect(after.hpPercent).toBe(1.0);
    expect(after.killStreak).toBe(0);
    expect(after.timeSinceLastKill).toBe(-1);
    expect(after.dps).toBe(0);
    expect(after.screenDensity).toBe(0);
    // MACD
    expect(after.macd).toEqual({ histogram: 0, signal: 0, macd: 0, value: 0 });
    // Stress
    expect(after.stress).toEqual({
      score: 0,
      damageRate: 0,
      dashUsage: 0,
      nearDeathDuration: 0,
    });
  });

  it('reset() is idempotent — double reset returns same defaults', () => {
    difficultyContext.updateInputs({ cycleFactor: 2.5, level: 10, rsi: 75 });
    difficultyContext.reset();
    const first = { ...difficultyContext.inputs };

    difficultyContext.reset();
    const second = difficultyContext.inputs;

    expect(second.cycleFactor).toBe(first.cycleFactor);
    expect(second.level).toBe(first.level);
    expect(second.rsi).toBe(first.rsi);
    expect(second.elapsedSeconds).toBe(first.elapsedSeconds);
  });

  it('reset() after multiple mutation rounds returns to initial state', () => {
    // Round 1: market mutations
    difficultyContext.updateInputs({ pnlPercent: 0.5, rsi: 70, currentPrice: 60000 });
    difficultyContext.updateTime(120);

    // Round 2: player mutations
    difficultyContext.updateInputs({ level: 8, killStreak: 30, hpPercent: 0.4 });
    difficultyContext.updateTime(240);

    // Round 3: leverage mutations
    difficultyContext.updateInputs({
      cycleFactor: 2.0,
      leverage: 25,
      entryPrice: 55000,
    });

    difficultyContext.reset();
    const after = difficultyContext.inputs;

    expect(after.elapsedSeconds).toBe(0);
    expect(after.pnlPercent).toBe(0);
    expect(after.currentPrice).toBe(0);
    expect(after.level).toBe(1);
    expect(after.killStreak).toBe(0);
    expect(after.hpPercent).toBe(1.0);
    expect(after.cycleFactor).toBe(1);
    expect(after.leverage).toBe(5);
    expect(after.entryPrice).toBe(0);
  });

  it('gameReset event also triggers reset()', () => {
    difficultyContext.updateInputs({ cycleFactor: 3.0, level: 12 });
    EventBus.emit('gameReset', {});
    const after = difficultyContext.inputs;
    expect(after.cycleFactor).toBe(1);
    expect(after.level).toBe(1);
  });

  it('returns to client indicator MACD after game reset', () => {
    EventBus.emit('marketRuntimeSnapshot', createRuntimeSnapshotEvent(1, 0.5));
    expect(difficultyContext.inputs.macd.value).toBe(0.5);

    EventBus.emit('gameReset', {});
    EventBus.emit('clientIndicatorsUpdated', {
      rsi: 48,
      rsiState: 'NEUTRAL',
      atrPercent: 0.004,
      normalizedVolume: 0.55,
      priceChangePercent: 0,
      trendStrength: 0.1,
      trendDirection: 'SIDEWAYS',
      macd: {
        macd: 2.5,
        value: 2.5,
        signal: 1.5,
        histogram: 1.0,
      } as MACDResult,
      whaleTier: 1,
    });
    difficultyContext.updateTime(1);

    const context = difficultyContext.inputs;
    expect(context.macd).toEqual({
      value: 2.5,
      signal: 1.5,
      histogram: 1.0,
      macd: 2.5,
    });
  });
});

describe('LeverageStateProvider', () => {
  beforeEach(() => {
    LeverageStateProvider.reset();
  });

  it('resetCycleState only resets cycleFactor, preserves leverage/position/entryPrice', () => {
    LeverageStateProvider.setLeverage(10);
    LeverageStateProvider.setEntryPrice(45000);
    LeverageStateProvider.setCycleFactor(1.5);
    LeverageStateProvider.setLiquidationPrice(40500);

    LeverageStateProvider.resetCycleState();

    expect(LeverageStateProvider.slice.cycleFactor).toBe(1.0);
    expect(LeverageStateProvider.slice.leverage).toBe(10);
    expect(LeverageStateProvider.slice.entryPrice).toBe(45000);
    expect(LeverageStateProvider.slice.liquidationPrice).toBe(40500);
  });
});
