import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getPool: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
  onConflictDoUpdate: vi.fn(),
  query: vi.fn(),
}));

vi.mock('../../src/db', () => ({
  getDb: mocks.getDb,
}));

vi.mock('../../src/db/pool', () => ({
  getPool: mocks.getPool,
}));

vi.mock('../../src/utils/logger', () => ({
  Logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import adminRouter from '../../src/routes/admin';
import telemetryRouter from '../../src/routes/telemetry';

const makeTelemetryApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/telemetry', telemetryRouter);
  return app;
};

const makeAdminApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/admin', adminRouter);
  return app;
};

const countRows = (count: number) => ({ rows: [{ count: String(count) }] });
const avgRows = (avg: number) => ({ rows: [{ avg: String(avg) }] });

describe('telemetry ingestion and admin visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_API_SECRET = 'admin-test-secret';

    const insertBuilder = {
      values: mocks.values,
      onConflictDoUpdate: mocks.onConflictDoUpdate,
    };
    mocks.values.mockReturnValue(insertBuilder);
    mocks.onConflictDoUpdate.mockResolvedValue(undefined);
    mocks.insert.mockReturnValue(insertBuilder);
    mocks.getDb.mockReturnValue({ insert: mocks.insert });
  });

  it('persists error reports, cheat attempts, device profiles, and performance metrics', async () => {
    const app = makeTelemetryApp();

    await request(app).post('/api/v1/telemetry/errors').send({
      errorType: 'render_crash',
      errorMessage: 'Canvas crashed',
      severity: 'critical',
      category: 'runtime',
      url: '/play',
      userAgent: 'vitest',
      context: { scene: 'combat' },
    }).expect(200);

    await request(app).post('/api/v1/telemetry/cheat-reports').send({
      profileId: '550e8400-e29b-41d4-a716-446655440001',
      sessionId: '550e8400-e29b-41d4-a716-446655440002',
      cheatType: 'speed_timing_anomaly',
      severity: 'medium',
      details: { deltaMs: 2 },
    }).expect(200);

    await request(app).post('/api/v1/telemetry/device-profiles').send({
      fingerprint: 'device-1',
      device_type: 'desktop',
      browser: 'chromium',
      screen_width: 1920,
      screen_height: 1080,
      hardware_concurrency: 8,
      device_memory: '8',
      recommended_profile: 'high',
      benchmark_score: '98',
    }).expect(200);

    await request(app).post('/api/v1/telemetry/performance-metrics').send({
      profile_id: '550e8400-e29b-41d4-a716-446655440001',
      session_id: '550e8400-e29b-41d4-a716-446655440002',
      avg_fps: '59',
      min_fps: '51',
      max_fps: '121',
      frame_drops: 3,
      metadata: { onePercentLow: 48 },
    }).expect(200);

    expect(mocks.insert).toHaveBeenCalledTimes(4);
    expect(mocks.values).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          errorType: 'render_crash',
          message: 'Canvas crashed',
          severity: 'critical',
          status: 'new',
        }),
      ])
    );
    expect(mocks.values).toHaveBeenCalledWith(
      expect.objectContaining({
        cheatType: 'speed_timing_anomaly',
        severity: 'medium',
      })
    );
    expect(mocks.values).toHaveBeenCalledWith(
      expect.objectContaining({
        fingerprint: 'device-1',
        recommendedProfile: 'high',
      })
    );
    expect(mocks.values).toHaveBeenCalledWith(
      expect.objectContaining({
        avgFps: '59',
        frameDrops: 3,
      })
    );
  });

  it('exposes telemetry counts in the admin dashboard summary', async () => {
    mocks.query.mockImplementation((queryText: string) => {
      if (queryText.includes('COUNT(*) AS count FROM profiles')) return countRows(10);
      if (queryText.includes('COUNT(*) AS count FROM sessions')) return countRows(8);
      if (queryText.includes('AVG(survival_seconds)')) return avgRows(123);
      if (queryText.includes('SUM(gold_balance)')) return { rows: [{ sum: '5000' }] };
      if (queryText.includes('COUNT(*) AS count FROM ledger')) return countRows(6);
      if (queryText.includes('SUM(meta_coins)')) return { rows: [{ sum: '700' }] };
      if (queryText.includes('FROM identities')) {
        return { rows: [{ provider: 'twitter', count: '2' }] };
      }
      if (queryText.includes('severity =')) return countRows(2);
      if (queryText.includes('FROM audit_log WHERE action')) return countRows(1);
      if (queryText.includes('GROUP BY action')) {
        return { rows: [{ action: 'session.suspicious', count: '1' }] };
      }
      if (queryText.includes('FROM sessions s JOIN profiles')) {
        return { rows: [{ nickname: 'satoshi', total_reward: '300', sessions_count: '2' }] };
      }
      if (queryText.includes('FROM error_reports WHERE created_at')) return countRows(4);
      if (queryText.includes('FROM cheat_attempts WHERE created_at')) return countRows(3);
      if (queryText.includes('AVG(avg_fps)')) return avgRows(58.6);
      if (queryText.includes('FROM performance_metrics WHERE created_at')) return countRows(5);
      if (queryText.includes('FROM device_profiles WHERE last_seen_at')) return countRows(7);
      return countRows(0);
    });

    mocks.getPool.mockReturnValue({
      totalCount: 4,
      idleCount: 2,
      waitingCount: 0,
      query: mocks.query,
    });

    const response = await request(makeAdminApp())
      .get('/api/v1/admin/dashboard')
      .set('Authorization', 'Bearer admin-test-secret')
      .expect(200);

    expect(response.body.telemetry).toEqual({
      errorReports24h: 4,
      cheatAttempts24h: 3,
      performanceMetrics24h: 5,
      avgFps24h: 59,
      activeDeviceProfiles24h: 7,
    });
    expect(response.body.security).toEqual(
      expect.objectContaining({
        cheatAttempts24h: 3,
        criticalErrors24h: 2,
        suspiciousSessions24h: 1,
      })
    );
  });
});
