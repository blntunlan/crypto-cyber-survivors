import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { type RailwayStoredAuth } from '../../../services/api/RailwayAuthTokenStore';

vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ── Setup ──────────────────────────────────────────────────────────────────

let railwayClient: {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  del<T>(path: string): Promise<T>;
};
let RailwayAuthTokenStore: {
  save(auth: RailwayStoredAuth): void;
  clear(): void;
};
let fetchSpy: ReturnType<typeof vi.fn>;

function mockFetchResponse(status: number, body: unknown = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function saveRailwayAuth(overrides: Partial<RailwayStoredAuth> = {}): void {
  RailwayAuthTokenStore.save({
    accessToken: 'railway-token',
    tokenType: 'Bearer',
    expiresAt: Date.now() + 60_000,
    account: { id: 'account-1', type: 'anonymous' },
    profile: { id: 'profile-1', displayName: 'Player1' },
    ...overrides,
  });
}

describe('RailwayClient', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();

    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.stubEnv('VITE_RAILWAY_API_URL', 'https://test-api.railway.app');

    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    vi.resetModules();
    const mod = await import('../../../services/api/RailwayClient');
    railwayClient = mod.railwayClient;
    RailwayAuthTokenStore = (
      await import('../../../services/api/RailwayAuthTokenStore')
    ).RailwayAuthTokenStore;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  // ── Basic requests ────────────────────────────────────────────────────

  describe('Basic HTTP methods', () => {
    it('GET attaches Authorization header when Railway token exists', async () => {
      saveRailwayAuth();
      fetchSpy.mockResolvedValue(mockFetchResponse(200, { id: '1' }));

      const result = await railwayClient.get<{ id: string }>('/api/v1/profile');

      expect(result).toEqual({ id: '1' });
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://test-api.railway.app/api/v1/profile',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer railway-token',
          }),
        })
      );
    });

    it('POST sends JSON body', async () => {
      fetchSpy.mockResolvedValue(mockFetchResponse(201, { id: '2' }));

      await railwayClient.post('/api/v1/profile', { nickname: 'Player1' });

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://test-api.railway.app/api/v1/profile',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ nickname: 'Player1' }),
        })
      );
    });

    it('PATCH sends JSON body', async () => {
      fetchSpy.mockResolvedValue(mockFetchResponse(200, { ok: true }));

      await railwayClient.patch('/api/v1/profile', { nickname: 'Updated' });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/profile'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    it('DELETE sends correct method', async () => {
      fetchSpy.mockResolvedValue(mockFetchResponse(200, {}));

      await railwayClient.del('/api/v1/sessions/123');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/sessions/123'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  // ── Auth token handling ───────────────────────────────────────────────

  describe('Auth token', () => {
    it('sends request without auth header when no Railway token exists', async () => {
      fetchSpy.mockResolvedValue(mockFetchResponse(200, {}));

      await railwayClient.get('/api/v1/leaderboard');

      const headers = fetchSpy.mock.calls[0]![1].headers;
      expect(headers.Authorization).toBeUndefined();
    });

    it('uses stored Railway-native token', async () => {
      saveRailwayAuth({ accessToken: 'stored-railway-token' });
      fetchSpy.mockResolvedValue(mockFetchResponse(200, {}));

      await railwayClient.get('/api/v1/profile');

      const headers = fetchSpy.mock.calls[0]![1].headers;
      expect(headers.Authorization).toBe('Bearer stored-railway-token');
    });

    it('ignores expired Railway-native token', async () => {
      saveRailwayAuth({ accessToken: 'expired-token', expiresAt: Date.now() - 1 });
      fetchSpy.mockResolvedValue(mockFetchResponse(200, {}));

      await railwayClient.get('/api/v1/leaderboard');

      const headers = fetchSpy.mock.calls[0]![1].headers;
      expect(headers.Authorization).toBeUndefined();
    });
  });

  // ── 401 handling ──────────────────────────────────────────────────────

  describe('401 handling', () => {
    it('does not refresh or retry Railway token on 401', async () => {
      saveRailwayAuth();
      fetchSpy.mockResolvedValue(mockFetchResponse(401, { error: 'Token expired' }));

      await expect(railwayClient.get('/api/v1/profile')).rejects.toThrow(
        'Token expired'
      );
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('does not retry unauthenticated 401', async () => {
      fetchSpy.mockResolvedValue(mockFetchResponse(401, { error: 'Missing auth' }));

      await expect(railwayClient.get('/api/v1/profile')).rejects.toThrow(
        'Missing auth'
      );
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ── Error handling ────────────────────────────────────────────────────

  describe('Error handling', () => {
    it('throws with server error message', async () => {
      fetchSpy.mockResolvedValue(
        mockFetchResponse(500, { error: 'Internal server error' })
      );

      await expect(railwayClient.get('/api/v1/profile')).rejects.toThrow(
        'Internal server error'
      );
    });

    it('throws with HTTP status when body has no error field', async () => {
      fetchSpy.mockResolvedValue(mockFetchResponse(403, { message: 'forbidden' }));

      await expect(railwayClient.get('/api/v1/profile')).rejects.toThrow('HTTP 403');
    });

    it('throws with HTTP status when body is not JSON', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 418,
        json: vi.fn().mockRejectedValue(new Error('not json')),
      } as unknown as Response);

      await expect(railwayClient.get('/health')).rejects.toThrow('HTTP 418');
    });

    it('throws when BASE_URL is not set', async () => {
      vi.stubEnv('VITE_API_BASE_URL', '');
      vi.stubEnv('VITE_RAILWAY_API_URL', '');

      vi.resetModules();
      const mod = await import('../../../services/api/RailwayClient');

      await expect(mod.railwayClient.get('/api/v1/profile')).rejects.toThrow(
        'VITE_API_BASE_URL / VITE_RAILWAY_API_URL is not configured'
      );
    });
  });
});
