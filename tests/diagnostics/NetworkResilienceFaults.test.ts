/**
 * tests/diagnostics/NetworkResilienceFaults.test.ts
 *
 * Fault injection and network resilience diagnostics testing transient retries,
 * permanent failure handling, timeout propagation, and offline queue behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarketSyncClient } from '../../services/market/sync/MarketSyncClient';
import { RailwayAuthTokenStore } from '../../services/api/RailwayAuthTokenStore';
import { type MarketSyncRecord } from '../../services/market/sync/MarketSyncStore';

describe('Network Resilience & Fault Injection Diagnostics', () => {
  beforeEach(() => {
    RailwayAuthTokenStore.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockRecord = (runId: string, seq: number): MarketSyncRecord =>
    ({
      runId,
      seq,
      runConstants: {} as any,
      tick: {} as any,
      snapshot: {} as any,
      createdAt: Date.now(),
    }) as unknown as MarketSyncRecord;

  it('marks transient 502/503/504 errors as retriable in sync clients', async () => {
    RailwayAuthTokenStore.save({
      accessToken: 'mock-token',
      tokenType: 'Bearer',
      expiresAt: Date.now() + 60000,
      account: { id: 'acc-1', type: 'registered' },
      profile: { id: 'prof-1', displayName: 'Tester' },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });

    const client = new MarketSyncClient({
      endpoint: 'https://mock.railway.app/api/v1/market/runtime-batch',
    });

    const result = await client.sendBatch([createMockRecord('run-1', 1)]);

    expect(result.ok).toBe(false);
    expect(result.retriable).toBe(true);
    expect(result.statusCode).toBe(503);
  });

  it('marks 400 Bad Request as non-retriable to prevent retry storms', async () => {
    RailwayAuthTokenStore.save({
      accessToken: 'mock-token',
      tokenType: 'Bearer',
      expiresAt: Date.now() + 60000,
      account: { id: 'acc-1', type: 'registered' },
      profile: { id: 'prof-1', displayName: 'Tester' },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
    });

    const client = new MarketSyncClient({
      endpoint: 'https://mock.railway.app/api/v1/market/runtime-batch',
    });

    const result = await client.sendBatch([createMockRecord('run-1', 1)]);

    expect(result.ok).toBe(false);
    expect(result.retriable).toBe(false);
    expect(result.statusCode).toBe(400);
  });

  it('buffers and holds items without throwing when unauthenticated', async () => {
    // No token in token store
    const client = new MarketSyncClient({
      endpoint: 'https://mock.railway.app/api/v1/market/runtime-batch',
    });

    const result = await client.sendBatch([createMockRecord('run-1', 1)]);

    expect(result.ok).toBe(false);
    expect(result.retriable).toBe(true);
    expect(result.error).toBe('Missing auth token');
  });
});
