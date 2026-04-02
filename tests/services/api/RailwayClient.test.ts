import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockAuth, mockIsConfigured } = vi.hoisted(() => ({
  mockAuth: {
    getSession: vi.fn(),
    refreshSession: vi.fn(),
  },
  mockIsConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../../../services/supabase/client', () => ({
  supabase: { auth: mockAuth },
  isSupabaseConfigured: mockIsConfigured,
}));

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
let fetchSpy: ReturnType<typeof vi.fn>;

function mockFetchResponse(status: number, body: unknown = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('RailwayClient', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);

    // Set env
    vi.stubEnv('VITE_RAILWAY_API_URL', 'https://test-api.railway.app');

    // Mock fetch
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    // Default: session with token
    mockAuth.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok-original' } },
    });
    mockAuth.refreshSession.mockResolvedValue({
      data: { session: { access_token: 'tok-refreshed' } },
      error: null,
    });

    // Re-import to pick up env
    vi.resetModules();
    const mod = await import('../../../services/api/RailwayClient');
    railwayClient = mod.railwayClient;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  // ── Basic requests ────────────────────────────────────────────────────

  describe('Basic HTTP methods', () => {
    it('GET attaches Authorization header', async () => {
      fetchSpy.mockResolvedValue(mockFetchResponse(200, { id: '1' }));

      const result = await railwayClient.get<{ id: string }>('/api/v1/profile');

      expect(result).toEqual({ id: '1' });
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://test-api.railway.app/api/v1/profile',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer tok-original',
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
    it('sends request without auth header when no session', async () => {
      mockAuth.getSession.mockResolvedValue({ data: { session: null } });
      fetchSpy.mockResolvedValue(mockFetchResponse(200, {}));

      await railwayClient.get('/api/v1/leaderboard');

      const headers = fetchSpy.mock.calls[0]![1].headers;
      expect(headers.Authorization).toBeUndefined();
    });

    it('sends request without auth header when Supabase not configured', async () => {
      mockIsConfigured.mockReturnValue(false);
      fetchSpy.mockResolvedValue(mockFetchResponse(200, {}));

      await railwayClient.get('/api/v1/leaderboard');

      const headers = fetchSpy.mock.calls[0]![1].headers;
      expect(headers.Authorization).toBeUndefined();
    });

    it('handles getSession exception gracefully', async () => {
      mockAuth.getSession.mockRejectedValue(new Error('storage error'));
      fetchSpy.mockResolvedValue(mockFetchResponse(200, {}));

      await railwayClient.get('/api/v1/leaderboard');

      const headers = fetchSpy.mock.calls[0]![1].headers;
      expect(headers.Authorization).toBeUndefined();
    });
  });

  // ── 401 Retry with Token Refresh ──────────────────────────────────────

  describe('401 retry with token refresh', () => {
    it('retries with refreshed token on 401', async () => {
      fetchSpy
        .mockResolvedValueOnce(mockFetchResponse(401, { error: 'Token expired' }))
        .mockResolvedValueOnce(mockFetchResponse(200, { id: 'success' }));

      const result = await railwayClient.get<{ id: string }>('/api/v1/profile');

      expect(result).toEqual({ id: 'success' });
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      // Second call should use the refreshed token
      const secondCallHeaders = fetchSpy.mock.calls[1]![1].headers;
      expect(secondCallHeaders.Authorization).toBe('Bearer tok-refreshed');
    });

    it('does not retry when no original token (unauthenticated)', async () => {
      mockAuth.getSession.mockResolvedValue({ data: { session: null } });
      fetchSpy.mockResolvedValue(mockFetchResponse(401, { error: 'Missing auth' }));

      await expect(railwayClient.get('/api/v1/profile')).rejects.toThrow(
        'Missing auth'
      );
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(mockAuth.refreshSession).not.toHaveBeenCalled();
    });

    it('does not retry when refresh returns same token', async () => {
      mockAuth.refreshSession.mockResolvedValue({
        data: { session: { access_token: 'tok-original' } },
        error: null,
      });

      fetchSpy.mockResolvedValue(mockFetchResponse(401, { error: 'Invalid token' }));

      await expect(railwayClient.get('/api/v1/profile')).rejects.toThrow(
        'Invalid token'
      );
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('does not retry when refresh fails', async () => {
      mockAuth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'refresh failed' },
      });

      fetchSpy.mockResolvedValue(mockFetchResponse(401, { error: 'Token expired' }));

      await expect(railwayClient.get('/api/v1/profile')).rejects.toThrow(
        'Token expired'
      );
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('does not retry when refresh throws', async () => {
      mockAuth.refreshSession.mockRejectedValue(new Error('network down'));

      fetchSpy.mockResolvedValue(mockFetchResponse(401, { error: 'Token expired' }));

      await expect(railwayClient.get('/api/v1/profile')).rejects.toThrow(
        'Token expired'
      );
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('throws original 401 error if retry also returns 401', async () => {
      fetchSpy
        .mockResolvedValueOnce(mockFetchResponse(401, { error: 'Token expired' }))
        .mockResolvedValueOnce(mockFetchResponse(401, { error: 'Still invalid' }));

      await expect(railwayClient.get('/api/v1/profile')).rejects.toThrow(
        'Still invalid'
      );
      expect(fetchSpy).toHaveBeenCalledTimes(2);
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
        status: 502,
        json: vi.fn().mockRejectedValue(new Error('not json')),
      } as unknown as Response);

      await expect(railwayClient.get('/health')).rejects.toThrow('HTTP 502');
    });

    it('throws when BASE_URL is not set', async () => {
      vi.stubEnv('VITE_RAILWAY_API_URL', '');

      vi.resetModules();
      const mod = await import('../../../services/api/RailwayClient');

      await expect(mod.railwayClient.get('/api/v1/profile')).rejects.toThrow(
        'VITE_RAILWAY_API_URL is not configured'
      );
    });
  });
});
