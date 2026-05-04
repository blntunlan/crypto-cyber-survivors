import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsStorage } from '../services/core/metrics/MetricsStorage';
import { GameEndReason } from '../types/metrics';
import { MarketPosition } from '../types';

// Mock RailwayClient
const mockPost = vi.fn().mockResolvedValue({ id: 'mock-uuid' });

vi.mock('../services/api/RailwayClient', () => ({
  railwayClient: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

// Set Railway API URL
vi.stubEnv('VITE_RAILWAY_API_URL', 'http://localhost:3001');

// Mock UserSessionService
vi.mock('../services/auth/UserSessionService', () => ({
  UserSessionService: {
    getProfileId: vi.fn().mockReturnValue('test-profile-id'),
    getNickname: vi.fn().mockReturnValue('test-nickname'),
  },
}));

// Mock VerificationQueue (exported as singleton instance)
vi.mock('../services/verification/VerificationQueue', () => ({
  VerificationQueue: {
    enqueue: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock EventBus
vi.mock('../services/core/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
}));

// Mock Logger
vi.mock('../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('MetricsSyncBridge Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should sync all optimized schema fields to Railway API', async () => {
    vi.stubEnv('VITE_ENABLE_ANALYTICS', 'true');
    const storage = new MetricsStorage();

    const mockSession = {
      sessionId: 'test-session-123',
      serverSessionId: '22222222-2222-4222-8222-222222222222',
      serverSigningKey: 'test-signing-key',
      sessionTimestamp: Date.now(),
      gameEndReason: GameEndReason.DEATH,
      pair: 'BTC' as const,
      bitcoin: {
        priceAtStart: 50000,
        priceAtEnd: 51000,
        pnlAtDeath: 2.0,
        leverage: 10,
        positionChosen: MarketPosition.LONG,
      },
      player: {
        maxLevel: 10,
        totalKills: 100,
        survivalTimeMs: 300000,
      },
      verification: {
        isSuspicious: true,
        suspicionReason: 'Impossible PnL movement',
        clientHash: 'hash123',
      },
      performance: {
        avgFps: 60,
        minFps: 30,
        maxFps: 62,
        fps_1_percentile: 25,
        avg_frame_time_ms: 16.6,
        max_frame_time_ms: 40,
        enemy_count_avg: 15,
        bullet_count_avg: 5,
        particle_count_avg: 100,
        deviceFingerprint: 'device-123',
        browser: 'Chrome',
        os: 'Windows',
        pixelRatio: 2,
        gpuRenderer: 'RTX 4090',
      },
    };

    // Trigger sync
    // @ts-expect-error:  testing private/internal sync logic via addSession
    await storage.syncToSupabase(mockSession);

    // 1. Verify session sync call
    const sessionCall = mockPost.mock.calls.find(
      (call: unknown[]) => call[0] === '/api/v1/sessions/sync'
    );
    expect(sessionCall).toBeDefined();
    expect(sessionCall?.[1].sessionData).toMatchObject({
      entry_price: 50000,
      exit_price: 51000,
      survival_seconds: 300,
      kills: 100,
    });
    expect(sessionCall?.[1].sessionData).not.toHaveProperty('pair');
    expect(sessionCall?.[1].sessionData).not.toHaveProperty('position');
    expect(sessionCall?.[1].sessionData).not.toHaveProperty('leverage');

    // 2. Verify performance metrics call
    const perfCall = mockPost.mock.calls.find(
      (call: unknown[]) => call[0] === '/api/v1/telemetry/performance-metrics'
    );
    expect(perfCall).toBeDefined();
    expect(perfCall?.[1].metadata).toMatchObject({
      fps_1_percentile: 25,
      avg_frame_time_ms: 16.6,
      max_frame_time_ms: 40,
      enemy_count_avg: 15,
      bullet_count_avg: 5,
      particle_count_avg: 100,
      device_fingerprint: 'device-123',
    });

    // 3. Verify device profile call
    const deviceCall = mockPost.mock.calls.find(
      (call: unknown[]) => call[0] === '/api/v1/telemetry/device-profiles'
    );
    expect(deviceCall).toBeDefined();
    expect(deviceCall?.[1]).toMatchObject({
      fingerprint: 'device-123',
      browser: 'Chrome',
      device_type: expect.stringMatching(/desktop|mobile/),
    });
  });
});
