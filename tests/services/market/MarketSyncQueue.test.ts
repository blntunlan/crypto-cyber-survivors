import { afterEach, describe, expect, it, vi } from 'vitest';
import { MARKET_RUNTIME_VERSION } from '../../../types/marketRuntime';
import { MarketSyncQueue } from '../../../services/market/sync/MarketSyncQueue';
import {
  createRunConstants,
  createRuntimeSnapshot,
  createRuntimeTick,
} from '../../../services/market/runtime/RuntimeContractBuilder';
import { type MarketData } from '../../../types';

const createRecordInput = () => {
  const runConstants = createRunConstants({
    runId: 'run-sync',
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
    volume: 10,
    prevHash: 'seed0000',
  });

  const marketData: MarketData = {
    price: 101,
    volume: 10,
    pnl: 0.01,
    effectivePnl: 0.1,
    leverage: 10,
    rsi: 55,
    difficulty: 1.1,
    momentum: 0.01,
    atrPercent: 0.005,
    spawnRateMultiplier: 1.05,
    enemyDamage: 1.02,
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

describe('MarketSyncQueue', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const createStoreMock = () => {
    return {
      enqueue: vi.fn(async () => undefined),
      requeueInflight: vi.fn(async () => 0),
      getFlushableBatch: vi.fn(async () => []),
      updateRecords: vi.fn(async () => undefined),
      acknowledge: vi.fn(async () => undefined),
      getStats: vi.fn(async () => ({ total: 0, pending: 0, inflight: 0 })),
    };
  };

  it('acknowledges batch on successful send', async () => {
    const input = createRecordInput();
    const batch = [
      {
        id: `${input.runConstants.runId}:${input.tick.seq}`,
        runId: input.runConstants.runId,
        seq: input.tick.seq,
        runConstants: input.runConstants,
        tick: input.tick,
        snapshot: input.snapshot,
        status: 'pending' as const,
        retryCount: 0,
        nextRetryAt: 0,
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    const store = createStoreMock();
    store.getFlushableBatch.mockResolvedValue(batch);
    const client = {
      sendBatch: vi.fn(async () => ({ ok: true, retriable: false })),
    };

    const queue = new MarketSyncQueue(store as never, client as never, {
      batchSize: 10,
    });

    const result = await queue.flush();

    expect(store.acknowledge).toHaveBeenCalledWith([batch[0]?.id]);
    expect(result.reason).toBe('success');
    expect(result.acked).toBe(1);
  });

  it('schedules retry when send fails', async () => {
    const input = createRecordInput();
    const batch = [
      {
        id: `${input.runConstants.runId}:${input.tick.seq}`,
        runId: input.runConstants.runId,
        seq: input.tick.seq,
        runConstants: input.runConstants,
        tick: input.tick,
        snapshot: input.snapshot,
        status: 'pending' as const,
        retryCount: 0,
        nextRetryAt: 0,
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    const store = createStoreMock();
    store.getFlushableBatch.mockResolvedValue(batch);
    const client = {
      sendBatch: vi.fn(async () => ({
        ok: false,
        retriable: true,
        error: 'temporary',
      })),
    };

    const queue = new MarketSyncQueue(store as never, client as never, {
      batchSize: 10,
      baseBackoffMs: 1000,
      maxBackoffMs: 5000,
    });

    const result = await queue.flush();

    const updateCalls = (store.updateRecords as ReturnType<typeof vi.fn>).mock.calls;
    const retryUpdate = updateCalls[1]?.[0]?.[0];
    expect(result.reason).toBe('retry_scheduled');
    expect(retryUpdate.status).toBe('pending');
    expect(retryUpdate.retryCount).toBe(1);
    expect(retryUpdate.nextRetryAt).toBeGreaterThan(0);
  });

  it('flushAll drains successive successful batches', async () => {
    const input = createRecordInput();
    let remaining = 2;

    const batchA = [
      {
        id: `${input.runConstants.runId}:1`,
        runId: input.runConstants.runId,
        seq: 1,
        runConstants: input.runConstants,
        tick: { ...input.tick, seq: 1 },
        snapshot: { ...input.snapshot, seq: 1 },
        status: 'pending' as const,
        retryCount: 0,
        nextRetryAt: 0,
        createdAt: 1,
        updatedAt: 1,
      },
    ];
    const batchB = [
      {
        id: `${input.runConstants.runId}:2`,
        runId: input.runConstants.runId,
        seq: 2,
        runConstants: input.runConstants,
        tick: { ...input.tick, seq: 2 },
        snapshot: { ...input.snapshot, seq: 2 },
        status: 'pending' as const,
        retryCount: 0,
        nextRetryAt: 0,
        createdAt: 2,
        updatedAt: 2,
      },
    ];

    const store = createStoreMock();
    store.getFlushableBatch
      .mockResolvedValueOnce(batchA)
      .mockResolvedValueOnce(batchB)
      .mockResolvedValueOnce([]);
    store.acknowledge.mockImplementation(async (ids: string[]) => {
      remaining -= ids.length;
    });
    store.getStats.mockImplementation(async () => ({
      total: remaining,
      pending: remaining,
      inflight: 0,
    }));

    const client = {
      sendBatch: vi.fn(async () => ({ ok: true, retriable: false })),
    };

    const queue = new MarketSyncQueue(store as never, client as never, {
      batchSize: 1,
    });

    const result = await queue.flushAll();

    expect(result.batches).toBe(2);
    expect(result.acked).toBe(2);
    expect(result.remaining).toBe(0);
  });

  it('recovers stale inflight records before flush', async () => {
    const store = createStoreMock();
    store.requeueInflight.mockResolvedValue(3);
    const client = {
      sendBatch: vi.fn(async () => ({ ok: true, retriable: false })),
    };

    const queue = new MarketSyncQueue(store as never, client as never, {
      inflightRecoveryMs: 12_345,
    });

    await queue.flush();

    expect(store.requeueInflight).toHaveBeenCalledWith(12_345);
  });

  it('flushes only a single run per batch payload', async () => {
    const input = createRecordInput();
    const runA = input.runConstants.runId;
    const runB = `${runA}-other`;

    const batch = [
      {
        id: `${runA}:1`,
        runId: runA,
        seq: 1,
        runConstants: input.runConstants,
        tick: { ...input.tick, seq: 1, runId: runA },
        snapshot: { ...input.snapshot, seq: 1, runId: runA },
        status: 'pending' as const,
        retryCount: 0,
        nextRetryAt: 0,
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: `${runB}:1`,
        runId: runB,
        seq: 1,
        runConstants: { ...input.runConstants, runId: runB },
        tick: { ...input.tick, seq: 1, runId: runB },
        snapshot: { ...input.snapshot, seq: 1, runId: runB },
        status: 'pending' as const,
        retryCount: 0,
        nextRetryAt: 0,
        createdAt: 2,
        updatedAt: 2,
      },
    ];

    const store = createStoreMock();
    store.getFlushableBatch.mockResolvedValue(batch);
    const client = {
      sendBatch: vi.fn(async () => ({ ok: true, retriable: false })),
    };

    const queue = new MarketSyncQueue(store as never, client as never, {
      batchSize: 10,
    });

    await queue.flush();

    const payload = client.sendBatch.mock.calls[0]?.[0];
    expect(payload).toHaveLength(1);
    expect(payload[0]?.runId).toBe(runA);
    expect(store.acknowledge).toHaveBeenCalledWith([`${runA}:1`]);
  });

  it('waits and drains when another flush is already in progress', async () => {
    vi.useFakeTimers();

    const input = createRecordInput();
    const batch = [
      {
        id: `${input.runConstants.runId}:1`,
        runId: input.runConstants.runId,
        seq: 1,
        runConstants: input.runConstants,
        tick: { ...input.tick, seq: 1 },
        snapshot: { ...input.snapshot, seq: 1 },
        status: 'pending' as const,
        retryCount: 0,
        nextRetryAt: 0,
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    const store = createStoreMock();
    store.getFlushableBatch.mockResolvedValueOnce(batch).mockResolvedValueOnce([]);
    let remaining = 1;
    store.acknowledge.mockImplementation(async (ids: string[]) => {
      remaining -= ids.length;
    });
    store.getStats.mockImplementation(async () => ({
      total: remaining,
      pending: remaining,
      inflight: 0,
    }));

    const client = {
      sendBatch: vi.fn(async () => ({ ok: true, retriable: false })),
    };

    const queue = new MarketSyncQueue(store as never, client as never, {
      batchSize: 1,
    });
    const queueState = queue as unknown as { flushInProgress: boolean };
    queueState.flushInProgress = true;
    setTimeout(() => {
      queueState.flushInProgress = false;
    }, 10);

    const flushAllPromise = queue.flushAll();
    await vi.advanceTimersByTimeAsync(50);
    const result = await flushAllPromise;

    expect(result.batches).toBe(1);
    expect(result.acked).toBe(1);
    expect(result.remaining).toBe(0);
  });
});
