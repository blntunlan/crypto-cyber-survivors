import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ACTIVE_SEASON_ID } from '../../../config/SeasonConfig';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  isRailwayApiConfigured: vi.fn(),
  getProfileId: vi.fn(),
  debug: vi.fn(),
}));

vi.mock('../../../services/api/RailwayClient', () => ({
  railwayClient: {
    post: mocks.post,
  },
  isRailwayApiConfigured: mocks.isRailwayApiConfigured,
}));

vi.mock('../../../services/auth/UserSessionService', () => ({
  UserSessionService: {
    getProfileId: mocks.getProfileId,
  },
}));

vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    debug: mocks.debug,
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ProductAnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_ENABLE_ANALYTICS', 'true');
    mocks.isRailwayApiConfigured.mockReturnValue(true);
    mocks.post.mockResolvedValue({ accepted: 1 });
    mocks.getProfileId.mockReturnValue('550e8400-e29b-41d4-a716-446655440001');
  });

  it('posts product events with profile and active season context', async () => {
    const { ProductAnalyticsService } =
      await import('../../../services/analytics/ProductAnalyticsService');

    await ProductAnalyticsService.trackLeaderboardViewed({
      sort: 'high_score',
      entryCount: 10,
      source: 'api',
    });

    expect(mocks.post).toHaveBeenCalledWith('/api/v1/telemetry/product-events', {
      event_type: 'leaderboard_viewed',
      profile_id: '550e8400-e29b-41d4-a716-446655440001',
      session_id: null,
      season_id: ACTIVE_SEASON_ID,
      quest_id: null,
      referral_code: null,
      wallet_provider: null,
      wallet_address_hash: null,
      metadata: {
        sort: 'high_score',
        entryCount: 10,
        source: 'api',
      },
    });
  });

  it('does not send when analytics is disabled', async () => {
    vi.stubEnv('VITE_ENABLE_ANALYTICS', 'false');
    const { ProductAnalyticsService } =
      await import('../../../services/analytics/ProductAnalyticsService');

    await ProductAnalyticsService.track({
      eventType: 'season_joined',
    });

    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('passes explicit session ids when supplied by gameplay services', async () => {
    const { ProductAnalyticsService } =
      await import('../../../services/analytics/ProductAnalyticsService');

    await ProductAnalyticsService.track({
      eventType: 'leaderboard_submitted',
      sessionId: '550e8400-e29b-41d4-a716-446655440002',
    });

    expect(mocks.post).toHaveBeenCalledWith(
      '/api/v1/telemetry/product-events',
      expect.objectContaining({
        session_id: '550e8400-e29b-41d4-a716-446655440002',
      })
    );
  });

  it('logs and swallows sync failures', async () => {
    mocks.post.mockRejectedValue(new Error('network down'));
    const { ProductAnalyticsService } =
      await import('../../../services/analytics/ProductAnalyticsService');

    await expect(
      ProductAnalyticsService.track({
        eventType: 'quest_completed',
        questId: 'daily-1',
      })
    ).resolves.toBeUndefined();

    expect(mocks.debug).toHaveBeenCalledWith(
      '[ProductAnalytics] Product event sync failed',
      expect.objectContaining({
        eventType: 'quest_completed',
        error: 'network down',
      })
    );
  });
});
