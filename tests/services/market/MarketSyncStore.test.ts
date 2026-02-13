import { describe, expect, it } from 'vitest';
import { MARKET_RUNTIME_VERSION } from '../../../types/marketRuntime';
import {
  createRunConstants,
  createRuntimeSnapshot,
  createRuntimeTick,
} from '../../../services/market/runtime/RuntimeContractBuilder';
import { type MarketData } from '../../../types';
import { MarketSyncStore } from '../../../services/market/sync/MarketSyncStore';

const createFixture = () => {
  const runConstants = createRunConstants({
    runId: 'run-store',
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
    seq: 1,
    pair: 'BTC',
    source: 'binance',
    sourceTs: 1000,
    recvTs: 1000,
    price: 101,
    volume: 8,
    prevHash: 'seed0000',
  });

  const marketData: MarketData = {
    price: 101,
    volume: 8,
    pnl: 0.01,
    effectivePnl: 0.1,
    leverage: 10,
    rsi: 55,
    difficulty: 1.2,
    momentum: 0.02,
    atrPercent: 0.004,
    spawnRateMultiplier: 1.1,
    enemyDamage: 1.05,
    enemySpeed: 1.03,
    gemValueMultiplier: 1.01,
  };

  const snapshot = createRuntimeSnapshot({
    runConstants,
    tick,
    marketData,
    createdAt: 1000,
    macd: 0.001,
  });

  return { runConstants, tick, snapshot };
};

describe('MarketSyncStore', () => {
  it('requeues stale inflight records back to pending', async () => {
    const store = new MarketSyncStore();
    const fixture = createFixture();

    const initial = await store.enqueue({
      runConstants: fixture.runConstants,
      tick: fixture.tick,
      snapshot: fixture.snapshot,
      createdAt: 1000,
    });

    await store.updateRecords([
      {
        ...initial,
        status: 'inflight',
        nextRetryAt: 50_000,
        updatedAt: 1000,
      },
    ]);

    const recovered = await store.requeueInflight(500, 2000);
    const batch = await store.getFlushableBatch(10, 2000);

    expect(recovered).toBe(1);
    expect(batch).toHaveLength(1);
    expect(batch[0]?.status).toBe('pending');
    expect(batch[0]?.nextRetryAt).toBe(2000);
  });

  it('keeps fresh inflight records untouched', async () => {
    const store = new MarketSyncStore();
    const fixture = createFixture();

    const initial = await store.enqueue({
      runConstants: fixture.runConstants,
      tick: fixture.tick,
      snapshot: fixture.snapshot,
      createdAt: 1000,
    });

    await store.updateRecords([
      {
        ...initial,
        status: 'inflight',
        nextRetryAt: 1000,
        updatedAt: 1900,
      },
    ]);

    const recovered = await store.requeueInflight(500, 2000);
    const batch = await store.getFlushableBatch(10, 2000);

    expect(recovered).toBe(0);
    expect(batch).toHaveLength(0);
  });
});
