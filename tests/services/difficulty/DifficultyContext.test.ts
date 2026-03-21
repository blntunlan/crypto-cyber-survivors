import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../services/core/EventBus';
import { difficultyContext } from '../../../services/difficulty/DifficultyContext';
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
