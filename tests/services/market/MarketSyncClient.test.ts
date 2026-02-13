import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MARKET_RUNTIME_VERSION } from '../../../types/marketRuntime';
import { type MarketData } from '../../../types';
import {
  createRunConstants,
  createRuntimeSnapshot,
  createRuntimeTick,
} from '../../../services/market/runtime/RuntimeContractBuilder';
import { MarketSyncClient } from '../../../services/market/sync/MarketSyncClient';
import { type MarketSyncRecord } from '../../../services/market/sync/MarketSyncStore';

vi.mock('../../../services/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
    },
  },
}));

const createRecord = (runId: string, seq: number): MarketSyncRecord => {
  const runConstants = createRunConstants({
    runId,
    pair: 'BTC',
    position: 'LONG',
    leverage: 10,
    entryPrice: 100,
    liquidationPrice: 90,
    startedAt: 1,
    versions: MARKET_RUNTIME_VERSION,
  });

  const tick = createRuntimeTick({
    runId,
    seq,
    pair: 'BTC',
    source: 'binance',
    sourceTs: 1000 + seq,
    recvTs: 1000 + seq,
    price: 100 + seq,
    volume: 5,
    prevHash: 'seed0000',
  });

  const marketData: MarketData = {
    price: 100 + seq,
    volume: 5,
    pnl: 0.01,
    effectivePnl: 0.1,
    leverage: 10,
    rsi: 50,
    difficulty: 1,
    momentum: 0,
    atrPercent: 0.003,
    spawnRateMultiplier: 1,
    enemyDamage: 1,
    enemySpeed: 1,
    gemValueMultiplier: 1,
  };

  const snapshot = createRuntimeSnapshot({
    runConstants,
    tick,
    marketData,
    createdAt: 1000 + seq,
    macd: 0.001,
  });

  return {
    id: `${runId}:${seq}`,
    runId,
    seq,
    runConstants,
    tick,
    snapshot,
    status: 'pending',
    retryCount: 0,
    nextRetryAt: 0,
    createdAt: 1000 + seq,
    updatedAt: 1000 + seq,
  };
};

describe('MarketSyncClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns retriable error when endpoint is missing', async () => {
    const client = new MarketSyncClient();
    const result = await client.sendBatch([createRecord('run-a', 1)]);

    expect(result.ok).toBe(false);
    expect(result.retriable).toBe(true);
    expect(result.error).toContain('Missing market sync endpoint');
  });

  it('rejects mixed run batches before network call', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));

    const client = new MarketSyncClient({ endpoint: 'https://example.com/sync' });
    const result = await client.sendBatch([
      createRecord('run-a', 1),
      createRecord('run-b', 2),
    ]);

    expect(result.ok).toBe(false);
    expect(result.retriable).toBe(false);
    expect(result.error).toContain('Mixed runId batch');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends authorized request when apiKey is provided', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));

    const client = new MarketSyncClient({
      endpoint: 'https://example.com/sync',
      apiKey: 'test-api-key',
    });
    const result = await client.sendBatch([createRecord('run-a', 1)]);

    expect(result.ok).toBe(true);
    const [, options] = fetchSpy.mock.calls[0] ?? [];
    const headers = (options?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-api-key');
  });
});
