import { describe, expect, it } from 'vitest';
import { MARKET_RUNTIME_VERSION } from '../../../types/marketRuntime';
import {
  computeRuntimeSnapshot,
  createInitialMarketComputeState,
} from '../../../services/market/runtime/MarketCompute';
import {
  createRunConstants,
  createRuntimeTick,
} from '../../../services/market/runtime/RuntimeContractBuilder';

describe('MarketCompute', () => {
  it('produces deterministic snapshot for same input', () => {
    const runConstants = createRunConstants({
      runId: 'run-a',
      pair: 'BTC',
      position: 'LONG',
      leverage: 10,
      entryPrice: 40000,
      liquidationPrice: 36000,
      startedAt: 1,
      versions: MARKET_RUNTIME_VERSION,
    });

    const tick = createRuntimeTick({
      runId: 'run-a',
      seq: 1,
      pair: 'BTC',
      source: 'binance',
      sourceTs: 1000,
      recvTs: 1000,
      price: 40500,
      volume: 12,
      prevHash: 'seed0000',
    });

    const first = computeRuntimeSnapshot({
      runConstants,
      tick,
      previousSnapshot: null,
      previousState: createInitialMarketComputeState(),
    });

    const second = computeRuntimeSnapshot({
      runConstants,
      tick,
      previousSnapshot: null,
      previousState: createInitialMarketComputeState(),
    });

    expect(first.snapshot.checksum).toBe(second.snapshot.checksum);
    expect(first.snapshot.rawPnl).toBe(second.snapshot.rawPnl);
    expect(first.snapshot.difficulty).toBe(second.snapshot.difficulty);
  });

  it('updates state incrementally across ticks', () => {
    const runConstants = createRunConstants({
      runId: 'run-b',
      pair: 'BTC',
      position: 'LONG',
      leverage: 5,
      entryPrice: 100,
      liquidationPrice: 80,
      startedAt: 1,
      versions: MARKET_RUNTIME_VERSION,
    });

    const tick1 = createRuntimeTick({
      runId: 'run-b',
      seq: 1,
      pair: 'BTC',
      source: 'binance',
      sourceTs: 1000,
      recvTs: 1000,
      price: 101,
      volume: 5,
      prevHash: 'seed0000',
    });
    const out1 = computeRuntimeSnapshot({
      runConstants,
      tick: tick1,
      previousSnapshot: null,
      previousState: createInitialMarketComputeState(),
    });

    const tick2 = createRuntimeTick({
      runId: 'run-b',
      seq: 2,
      pair: 'BTC',
      source: 'binance',
      sourceTs: 2000,
      recvTs: 2000,
      price: 95,
      volume: 8,
      prevHash: tick1.hash,
    });
    const out2 = computeRuntimeSnapshot({
      runConstants,
      tick: tick2,
      previousSnapshot: out1.snapshot,
      previousState: out1.nextState,
    });

    expect(out2.nextState.tickCount).toBe(2);
    expect(out2.snapshot.seq).toBe(2);
    expect(out2.snapshot.rawPnl).toBeLessThan(0);
    expect(out2.snapshot.isLiquidated).toBe(false);
    expect(out2.snapshot.rsiState).toBe('OVERSOLD');
    expect(out2.snapshot.normalizedVolume).toBeGreaterThanOrEqual(0);
    expect(out2.snapshot.normalizedVolume).toBeLessThanOrEqual(1);
    expect(out2.snapshot.whaleTier).toBeGreaterThanOrEqual(0);
    expect(out2.snapshot.whaleTier).toBeLessThanOrEqual(3);
  });
});
