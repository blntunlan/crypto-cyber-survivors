import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarketSyncClient } from '../../../services/market/sync/MarketSyncClient';
import { RailwayAuthTokenStore } from '../../../services/api/RailwayAuthTokenStore';
import { type MarketSyncRecord } from '../../../services/market/sync/MarketSyncStore';

const record = (): MarketSyncRecord =>
  ({
    id: 'run-1:1',
    runId: 'run-1',
    seq: 1,
    runConstants: { runId: 'run-1' },
    tick: { seq: 1 },
    snapshot: { seq: 1 },
    status: 'inflight',
    retryCount: 0,
    nextRetryAt: 0,
    createdAt: 1,
    updatedAt: 1,
  }) as unknown as MarketSyncRecord;

describe('MarketSyncClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(RailwayAuthTokenStore, 'getAccessToken').mockReturnValue(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('does not hit the endpoint when there is no auth token', async () => {
    const client = new MarketSyncClient({ endpoint: 'https://api.test/batch' });

    const result = await client.sendBatch([record()]);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    // Retriable so the evidence stays queued until the player signs in.
    expect(result.retriable).toBe(true);
  });

  it.each([401, 403, 404, 429, 500, 503])(
    'treats HTTP %i as retriable',
    async status => {
      (RailwayAuthTokenStore.getAccessToken as any).mockReturnValue('token');
      fetchMock.mockResolvedValue({ ok: false, status });
      const client = new MarketSyncClient({ endpoint: 'https://api.test/batch' });

      const result = await client.sendBatch([record()]);

      expect(result.ok).toBe(false);
      expect(result.retriable).toBe(true);
      expect(result.statusCode).toBe(status);
    }
  );

  it.each([400, 413, 422])('treats HTTP %i as permanent', async status => {
    (RailwayAuthTokenStore.getAccessToken as any).mockReturnValue('token');
    fetchMock.mockResolvedValue({ ok: false, status });
    const client = new MarketSyncClient({ endpoint: 'https://api.test/batch' });

    const result = await client.sendBatch([record()]);

    expect(result.retriable).toBe(false);
  });

  it('sends with the bearer token when authenticated', async () => {
    (RailwayAuthTokenStore.getAccessToken as any).mockReturnValue('token-123');
    fetchMock.mockResolvedValue({ ok: true, status: 202 });
    const client = new MarketSyncClient({ endpoint: 'https://api.test/batch' });

    const result = await client.sendBatch([record()]);

    expect(result.ok).toBe(true);
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers.Authorization).toBe('Bearer token-123');
  });
});
