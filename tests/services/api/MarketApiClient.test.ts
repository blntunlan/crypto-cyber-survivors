import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let marketApiClient: {
  getHistory(
    pair: string,
    limit?: number
  ): Promise<
    Array<{
      price: number;
      volume: number;
      timestamp: number;
    }>
  >;
};
let fetchSpy: ReturnType<typeof vi.fn>;

function mockFetchResponse(status: number, body: unknown = []): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('MarketApiClient', () => {
  beforeEach(async () => {
    vi.stubEnv('VITE_MARKET_AGGREGATOR_URL', 'https://market.example.com/');
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.resetModules();

    const mod = await import('../../../services/api/MarketApiClient');
    marketApiClient = mod.marketApiClient;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('loads market history from the dedicated aggregator URL', async () => {
    fetchSpy.mockResolvedValue(
      mockFetchResponse(200, [
        {
          price: '100',
          volume: '2',
          timestamp: '2026-05-30T10:00:00.000Z',
        },
      ])
    );

    const result = await marketApiClient.getHistory('btc', 300);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://market.example.com/api/v1/market/history?pair=BTC&limit=300',
      expect.objectContaining({ method: 'GET' })
    );
    expect(result).toEqual([
      {
        price: 100,
        volume: 2,
        timestamp: new Date('2026-05-30T10:00:00.000Z').getTime(),
      },
    ]);
  });

  it('falls back to the API URL when aggregator URL is not configured', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_MARKET_AGGREGATOR_URL', '');
    vi.stubEnv('VITE_RAILWAY_API_URL', 'https://api.example.com');
    vi.resetModules();
    const mod = await import('../../../services/api/MarketApiClient');

    fetchSpy.mockResolvedValue(mockFetchResponse(200, []));

    await mod.marketApiClient.getHistory('ETH', 5000);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/market/history?pair=ETH&limit=1000',
      expect.any(Object)
    );
  });

  it('rejects unsupported pairs before making a request', async () => {
    await expect(marketApiClient.getHistory('DOGE')).rejects.toThrow(
      'Unsupported market pair'
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
