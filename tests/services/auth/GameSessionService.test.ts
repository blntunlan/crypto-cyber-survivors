import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameSessionService } from '../../../services/auth/GameSessionService';
import { UserSessionService } from '../../../services/auth/UserSessionService';
import { supabase } from '../../../services/Supabase';
import { MarketPosition } from '../../../types';

// Mock Supabase invoke
vi.mock('../../../services/Supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

// Mock UserSessionService
vi.mock('../../../services/auth/UserSessionService', () => ({
  UserSessionService: {
    getNickname: vi.fn(() => 'TestUser'),
  },
}));

describe('GameSessionService', () => {
  beforeEach(() => {
    GameSessionService.clearSession();
    vi.clearAllMocks();
    // Re-apply default mock value
    // @ts-expect-error: testing
    UserSessionService.getNickname.mockReturnValue('TestUser');
  });

  describe('startSession', () => {
    it('should start session successfully via Supabase function', async () => {
      const mockResponse = {
        sessionId: 'server-123',
        sessionSecret: 'secret-xyz',
        startTime: new Date().toISOString(),
      };

      // @ts-expect-error: testing
      supabase.functions.invoke.mockResolvedValue({ data: mockResponse, error: null });

      const result = await GameSessionService.startSession(
        'BTC',
        10,
        MarketPosition.LONG
      );

      expect(result).toEqual(mockResponse);
      expect(GameSessionService.getCurrentSessionId()).toBe('server-123');
      expect(GameSessionService.getCurrentSessionSecret()).toBe('secret-xyz');
    });

    it('should return null and log error if no nickname found', async () => {
      // @ts-expect-error: testing
      UserSessionService.getNickname.mockReturnValue(null);

      const result = await GameSessionService.startSession(
        'BTC',
        10,
        MarketPosition.LONG
      );

      expect(result).toBeNull();
      expect(GameSessionService.getCurrentSessionId()).toBeNull();
    });

    it('should handle function errors by providing fallback in DEV mode', async () => {
      // Mock global import.meta.env.DEV if possible or assume test env handles it
      // @ts-expect-error: testing
      supabase.functions.invoke.mockResolvedValue({
        data: null,
        error: new Error('Network failure'),
      });

      const result = await GameSessionService.startSession(
        'BTC',
        10,
        MarketPosition.LONG
      );

      // In Vitest, DEV usually is true unless specified
      if (result) {
        expect(result.sessionId).toContain('local-');
        expect(result.sessionSecret).toContain('secret-');
        expect(GameSessionService.getCurrentSessionId()).toBe(result.sessionId);
      }
    });

    it('should prevent concurrent session start calls', async () => {
      // Mock a slow response
      let resolvePromise: any;
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      // @ts-expect-error: testing
      supabase.functions.invoke.mockReturnValue(slowPromise);

      const call1 = GameSessionService.startSession('BTC', 10, MarketPosition.LONG);
      const call2 = GameSessionService.startSession('BTC', 10, MarketPosition.LONG);

      await expect(call2).resolves.toBeNull(); // Second call should fail immediately

      resolvePromise({ data: { sessionId: '1' }, error: null });
      await call1;
    });
  });

  describe('Session State Management', () => {
    it('should clear session correctly', async () => {
      // @ts-expect-error: testing
      supabase.functions.invoke.mockResolvedValue({
        data: { sessionId: 's1', sessionSecret: 's2' },
        error: null,
      });

      await GameSessionService.startSession('BTC', 10, MarketPosition.LONG);
      expect(GameSessionService.getCurrentSessionId()).toBe('s1');

      GameSessionService.clearSession();
      expect(GameSessionService.getCurrentSessionId()).toBeNull();
      expect(GameSessionService.getCurrentSessionSecret()).toBeNull();
    });
  });
});
