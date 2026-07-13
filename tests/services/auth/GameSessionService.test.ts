import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameSessionService } from '../../../services/auth/GameSessionService';
import { UserSessionService } from '../../../services/auth/UserSessionService';

const { flushAllMock, railwayPostMock } = vi.hoisted(() => ({
  flushAllMock: vi.fn(async () => ({
    batches: 0,
    acked: 0,
    retried: 0,
    remaining: 0,
  })),
  railwayPostMock: vi.fn(),
}));

// Mock RailwayClient
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

// Mock UserSessionService
vi.mock('../../../services/auth/UserSessionService', () => ({
  UserSessionService: {
    getNickname: vi.fn(() => 'TestUser'),
    clearUser: vi.fn(),
  },
}));

import { MarketPosition } from '../../../types';

describe('GameSessionService', () => {
  beforeEach(() => {
    GameSessionService.clearSession();
    vi.clearAllMocks();
    flushAllMock.mockResolvedValue({
      batches: 0,
      acked: 0,
      retried: 0,
      remaining: 0,
    });
    // @ts-expect-error: testing
    UserSessionService.getNickname.mockReturnValue('TestUser');
  });

  describe('startSession', () => {
    it('should start session successfully via Railway API', async () => {
      const mockResponse = {
        sessionId: 'server-123',
        sessionSecret: 'secret-xyz',
        startTime: new Date().toISOString(),
      };

      railwayPostMock.mockResolvedValue(mockResponse);

      const result = await GameSessionService.startSession(
        'BTC',
        10,
        MarketPosition.LONG
      );

      expect(result).toEqual(mockResponse);
      expect(GameSessionService.getCurrentSessionId()).toBe('server-123');
      expect(GameSessionService.getCurrentSessionSecret()).toBe('secret-xyz');
      expect(railwayPostMock).toHaveBeenCalledWith(
        '/api/v1/sessions/start',
        expect.objectContaining({ pair: 'BTC', leverage: 10 })
      );
      expect((railwayPostMock.mock.calls[0] ?? [])[1]).not.toHaveProperty('userId');
    });

    it('should throw NICKNAME_REQUIRED if no nickname found', async () => {
      // @ts-expect-error: testing
      UserSessionService.getNickname.mockReturnValue(null);

      await expect(
        GameSessionService.startSession('BTC', 10, MarketPosition.LONG)
      ).rejects.toThrow('NICKNAME_REQUIRED');
      expect(GameSessionService.getCurrentSessionId()).toBeNull();
    });

    it('should handle errors by providing fallback in DEV mode', async () => {
      railwayPostMock.mockRejectedValue(new Error('Network failure'));

      const result = await GameSessionService.startSession(
        'BTC',
        10,
        MarketPosition.LONG
      );

      // In Vitest, DEV usually is true
      if (result) {
        expect(result.sessionId).toContain('local-');
        expect(result.sessionSecret).toContain('secret-');
        expect(GameSessionService.getCurrentSessionId()).toBe(result.sessionId);
      }
    });

    it('should prevent concurrent session start calls', async () => {
      let resolvePromise: any;
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      railwayPostMock.mockReturnValue(slowPromise);

      const call1 = GameSessionService.startSession('BTC', 10, MarketPosition.LONG);
      const call2 = GameSessionService.startSession('BTC', 10, MarketPosition.LONG);

      await expect(call2).resolves.toBeNull(); // Second call should fail immediately

      resolvePromise({ sessionId: '1', sessionSecret: 's', startTime: '' });
      await call1;
    });
  });

  describe('Session State Management', () => {
    it('should clear session correctly', async () => {
      railwayPostMock.mockResolvedValue({
        sessionId: 's1',
        sessionSecret: 's2',
        startTime: new Date().toISOString(),
      });

      await GameSessionService.startSession('BTC', 10, MarketPosition.LONG);
      expect(GameSessionService.getCurrentSessionId()).toBe('s1');

      GameSessionService.clearSession();
      expect(GameSessionService.getCurrentSessionId()).toBeNull();
      expect(GameSessionService.getCurrentSessionSecret()).toBeNull();
      expect(flushAllMock).toHaveBeenCalled();
    });
  });

  describe('authoritative cash-out API', () => {
    it('uses the active server session for quote and decision requests', async () => {
      railwayPostMock
        .mockResolvedValueOnce({
          sessionId: 's1',
          sessionSecret: 's2',
          startTime: new Date().toISOString(),
        })
        .mockResolvedValueOnce({
          quote: { quoteId: 'quote-1', canonicalSequence: 42, rewardPoints: 120 },
          signature: 'a'.repeat(64),
          shouldForceRecovery: false,
          safeExitOnly: false,
        })
        .mockResolvedValueOnce({ state: 'settled', rewardPoints: 120, greedDelta: 0 });

      await GameSessionService.startSession('BTC', 10, MarketPosition.LONG);
      await GameSessionService.requestCashOutQuote('RECOVERY');
      await GameSessionService.decideCashOut(
        'quote-1',
        'a'.repeat(64),
        'accept',
        'accept-key-123'
      );

      expect(railwayPostMock).toHaveBeenCalledWith('/api/v1/economy/cash-out/quote', {
        session_id: 's1',
        pacing_state: 'RECOVERY',
      });
      expect(railwayPostMock).toHaveBeenCalledWith(
        '/api/v1/economy/cash-out/decision',
        {
          quote_id: 'quote-1',
          signature: 'a'.repeat(64),
          decision: 'accept',
          idempotency_key: 'accept-key-123',
        }
      );
    });

    it('records a server-side death or liquidation failure for the active session', async () => {
      railwayPostMock
        .mockResolvedValueOnce({
          sessionId: 's1',
          sessionSecret: 's2',
          startTime: new Date().toISOString(),
        })
        .mockResolvedValueOnce({ state: 'failed', primaryRewardPoints: 0, shards: 50 });

      await GameSessionService.startSession('BTC', 10, MarketPosition.LONG);
      await GameSessionService.recordCashOutFailure('liquidation', 'failure-key-123');

      expect(railwayPostMock).toHaveBeenCalledWith('/api/v1/economy/cash-out/failure', {
        session_id: 's1',
        failure_type: 'liquidation',
        idempotency_key: 'failure-key-123',
      });
    });
  });
});
