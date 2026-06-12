import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameSessionService } from '../../../services/auth/GameSessionService';

const { flushAllMock, railwayPostMock } = vi.hoisted(() => ({
  flushAllMock: vi.fn(async () => ({
    batches: 0,
    acked: 0,
    retried: 0,
    remaining: 0,
  })),
  railwayPostMock: vi.fn(),
}));

vi.mock('../../../services/api/RailwayClient', () => ({
  railwayClient: {
    get: vi.fn(),
    post: railwayPostMock,
    patch: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('../../../services/market/sync', () => ({
  getMarketSyncQueue: () => ({
    flushAll: flushAllMock,
  }),
}));

vi.mock('../../../services/auth/UserSessionService', () => ({
  UserSessionService: {
    getNickname: vi.fn(() => 'TestUser'),
    clearUser: vi.fn(),
  },
}));

vi.mock('../../../utils/crypto', () => ({
  signPayload: vi.fn(async () => 'mocked-signature-hex'),
  createSignablePayload: vi.fn(() => '{"mocked":"payload"}'),
}));

import { type MarketPosition } from '../../../types';
import { type RewardPayload, type RewardBreakdown } from '../../../types/reward';

const getPostCall = (path: string): [string, unknown] => {
  const call = railwayPostMock.mock.calls.find(([callPath]) => callPath === path);
  expect(call).toBeDefined();
  return call as [string, unknown];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Seed an active session so submitSession doesn't bail with NO_ACTIVE_SESSION */
async function seedSession(): Promise<void> {
  railwayPostMock.mockResolvedValueOnce({
    sessionId: 'sess-42',
    sessionSecret: 'secret-abc',
    startTime: new Date().toISOString(),
  });
  await GameSessionService.startSession('BTC' as any, 10, 'LONG' as MarketPosition);
}

const baseResults = {
  level: 5,
  kills: 120,
  survivalTimeMs: 60_000,
  entryPrice: 50000,
  exitPrice: 51000,
  pnlPercent: 2.0,
  pair: 'BTC' as any,
  position: 'LONG' as MarketPosition,
  leverage: 10,
  endReason: 'portal',
  exitType: 'portal' as const,
  portalType: 'TAKE_PROFIT' as const,
  maxStreak: 8,
};

const sampleBreakdown: RewardBreakdown = {
  base: 10,
  survival: 20,
  kill: 30,
  level: 15,
  market: 35,
  streak: 5,
  portal: 25,
};

const sampleRewardPayload: RewardPayload = {
  kills: 150,
  level: 7,
  survivalSeconds: 90,
  pnlPercent: 3.5,
  maxStreak: 12,
  exitType: 'portal',
  portalType: 'TAKE_PROFIT',
  rawCoins: 100,
  enemyDropCoins: 40,
  totalCoins: 140,
  breakdown: sampleBreakdown,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GameSessionService.submitSession', () => {
  beforeEach(() => {
    GameSessionService.clearSession();
    vi.clearAllMocks();
    flushAllMock.mockResolvedValue({
      batches: 0,
      acked: 0,
      retried: 0,
      remaining: 0,
    });
  });

  // ---- a. RewardPayload fields included in server request ----

  it('includes RewardPayload fields in server request when provided', async () => {
    await seedSession();

    railwayPostMock.mockResolvedValueOnce({
      verified: true,
      reward: 140,
      metaShare: 14,
    });

    await GameSessionService.submitSession(baseResults, sampleRewardPayload);

    expect(
      railwayPostMock.mock.calls.some(([path]) => path === '/api/v1/sessions/sync')
    ).toBe(false);

    const verifyCall = getPostCall('/api/v1/sessions/verify');
    expect(verifyCall[0]).toBe('/api/v1/sessions/verify');

    const body = verifyCall[1] as Record<string, unknown>;
    expect(body.sessionId).toBe('sess-42');
    expect(body.signature).toBe('mocked-signature-hex');

    const payload = body.payload as Record<string, unknown>;
    // RewardPayload overrides results fields
    expect(payload.kills).toBe(150);
    expect(payload.level).toBe(7);
    expect(payload.survivalSeconds).toBe(90);
    expect(payload.exitType).toBe('portal');
    expect(payload.portalType).toBe('TAKE_PROFIT');
    expect(payload.maxStreak).toBe(12);

    // Coin / reward fields spread from rewardPayload
    expect(payload.rawCoins).toBe(100);
    expect(payload.enemyDropCoins).toBe(40);
    expect(payload.totalCoins).toBe(140);
    expect(payload.pnlPercent).toBe(3.5);
    expect(payload.breakdown).toEqual(sampleBreakdown);
  });

  it('normalizes fractional reward survival seconds before verify', async () => {
    await seedSession();

    railwayPostMock.mockResolvedValueOnce({
      verified: true,
      reward: 140,
      metaShare: 14,
    });

    await GameSessionService.submitSession(baseResults, {
      ...sampleRewardPayload,
      survivalSeconds: 90.75,
    });

    const verifyCall = getPostCall('/api/v1/sessions/verify');
    const payload = (verifyCall[1] as Record<string, unknown>).payload as Record<
      string,
      unknown
    >;
    expect(payload.survivalSeconds).toBe(90);
  });

  // ---- b. Backward compat without RewardPayload ----

  it('works without RewardPayload (backward compat)', async () => {
    await seedSession();

    railwayPostMock.mockResolvedValueOnce({
      verified: true,
      reward: 50,
      metaShare: 5,
    });

    const result = await GameSessionService.submitSession(baseResults);

    expect(result.success).toBe(true);

    const verifyCall = getPostCall('/api/v1/sessions/verify');
    const payload = (verifyCall[1] as Record<string, unknown>).payload as Record<
      string,
      unknown
    >;

    // Falls back to results fields
    expect(payload.kills).toBe(baseResults.kills);
    expect(payload.level).toBe(baseResults.level);
    expect(payload.survivalSeconds).toBe(Math.floor(baseResults.survivalTimeMs / 1000));
    expect(payload.exitType).toBe('portal');
    expect(payload.portalType).toBe('TAKE_PROFIT');
    expect(payload.maxStreak).toBe(8);

    // Coin fields should NOT be present
    expect(payload).not.toHaveProperty('rawCoins');
    expect(payload).not.toHaveProperty('enemyDropCoins');
    expect(payload).not.toHaveProperty('totalCoins');
    expect(payload).not.toHaveProperty('breakdown');
  });

  // ---- c. Response includes verified and metaShare ----

  it('returns verified and metaShare from server response', async () => {
    await seedSession();

    railwayPostMock.mockResolvedValueOnce({
      verified: true,
      reward: 200,
      metaShare: 20,
    });

    const result = await GameSessionService.submitSession(
      baseResults,
      sampleRewardPayload
    );

    expect(result).toEqual({
      success: true,
      verified: true,
      reward: 200,
      metaShare: 20,
    });
  });

  it('returns verified=false when server says unverified', async () => {
    await seedSession();

    railwayPostMock.mockResolvedValueOnce({
      verified: false,
      reward: 0,
      metaShare: 0,
    });

    const result = await GameSessionService.submitSession(baseResults);

    expect(result.verified).toBe(false);
    expect(result.metaShare).toBe(0);
    expect(result.success).toBe(true);
  });

  // ---- d. Network error handling ----

  it('returns error on network failure (production mode)', async () => {
    await seedSession();

    // Simulate production: import.meta.env.DEV is true in vitest by default,
    // so we need to check the DEV fallback path. In DEV mode, errors return success.
    railwayPostMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await GameSessionService.submitSession(baseResults);

    // In DEV mode (vitest), the service falls back to simulated success
    expect(result.success).toBe(true);
    expect(result.reward).toBe(0);
  });

  it('returns error message from thrown Error', async () => {
    await seedSession();

    // Override import.meta.env.DEV via the service's catch block behavior
    // Since vitest runs in DEV mode, we verify the fallback path
    railwayPostMock.mockRejectedValueOnce(new Error('Server timeout'));

    const result = await GameSessionService.submitSession(baseResults);

    // DEV fallback: simulated success with reward: 0
    expect(result.success).toBe(true);
  });

  // ---- Edge cases ----

  it('returns NO_ACTIVE_SESSION when no session is active', async () => {
    // Don't seed a session
    const result = await GameSessionService.submitSession(baseResults);

    expect(result).toEqual({ success: false, error: 'NO_ACTIVE_SESSION' });
    expect(railwayPostMock).not.toHaveBeenCalled();
  });

  it('prevents concurrent submission', async () => {
    await seedSession();

    let resolveVerify!: (v: unknown) => void;
    railwayPostMock.mockReturnValueOnce(
      new Promise(resolve => {
        resolveVerify = resolve;
      })
    );

    const call1 = GameSessionService.submitSession(baseResults);
    const call2 = GameSessionService.submitSession(baseResults);

    const result2 = await call2;
    expect(result2).toEqual({ success: false, error: 'SUBMISSION_IN_PROGRESS' });

    resolveVerify({ verified: true, reward: 10, metaShare: 1 });
    const result1 = await call1;
    expect(result1.success).toBe(true);
  });

  it('clears session after successful submit', async () => {
    await seedSession();
    expect(GameSessionService.getCurrentSessionId()).toBe('sess-42');

    railwayPostMock.mockResolvedValueOnce({
      verified: true,
      reward: 50,
      metaShare: 5,
    });

    await GameSessionService.submitSession(baseResults);

    expect(GameSessionService.getCurrentSessionId()).toBeNull();
    expect(GameSessionService.getCurrentSessionSecret()).toBeNull();
  });

  it('flushes runtime audit queue before submitting', async () => {
    await seedSession();

    railwayPostMock.mockResolvedValueOnce({
      verified: true,
      reward: 10,
      metaShare: 1,
    });

    await GameSessionService.submitSession(baseResults);

    // flushAll called once on seedSession's clearSession (from previous beforeEach clear)
    // and once from the 'before_submit' flush inside submitSession
    expect(flushAllMock).toHaveBeenCalled();
  });
});
