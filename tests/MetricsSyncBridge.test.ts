import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsStorage } from '../services/core/metrics/MetricsStorage';
import { GameEndReason } from '../types/metrics';
import { MarketPosition } from '../types';

// Mock Supabase
const mockInsert = vi.fn().mockReturnValue({
  select: () => ({
    single: () => Promise.resolve({ data: { id: 'mock-uuid' }, error: null }),
  }),
});

const mockUpsert = vi.fn().mockResolvedValue({ error: null });

vi.mock('../services/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      insert: (data: any) => mockInsert(table, data),
      upsert: (data: any) => mockUpsert(table, data),
    }),
  },
  isSupabaseConfigured: () => true,
}));

describe('MetricsSyncBridge Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should sync all optimized schema fields to Supabase', async () => {
    const storage = new MetricsStorage();

    const mockSession = {
      sessionId: 'test-session-123',
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

    // 1. Verify sessions insert
    const sessionCall = mockInsert.mock.calls.find(call => call[0] === 'sessions');
    expect(sessionCall).toBeDefined();
    expect(sessionCall?.[1]).toMatchObject({
      crypto_pair: 'BTC',
      position_chosen: MarketPosition.LONG,
    });

    // 2. Verify performance_metrics insert
    const perfCall = mockInsert.mock.calls.find(
      call => call[0] === 'performance_metrics'
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

    // 3. Verify device_profiles upsert
    const deviceCall = mockUpsert.mock.calls.find(
      call => call[0] === 'device_profiles'
    );
    expect(deviceCall).toBeDefined();
    expect(deviceCall?.[1]).toMatchObject({
      fingerprint: 'device-123',
      browser: 'Chrome',
      device_type: expect.stringMatching(/desktop|mobile/),
      screen_width: expect.any(Number),
      screen_height: expect.any(Number),
    });
  });
});
