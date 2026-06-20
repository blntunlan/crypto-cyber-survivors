import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signRailwayAccessToken } from '../../src/utils/railwayJwt';

const ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440001';
const PROFILE_ID = '550e8400-e29b-41d4-a716-446655440002';

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock('../../src/db', () => ({
  getDb: mocks.getDb,
}));

vi.mock('../../src/utils/logger', () => ({
  Logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import profileRouter from '../../src/routes/profile';

const createToken = (): string => {
  return signRailwayAccessToken({
    accountId: ACCOUNT_ID,
    accountType: 'anonymous',
  }).accessToken;
};

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/profile', profileRouter);
  return app;
};

const makeLimitSelect = (rows: unknown[]) => {
  const limit = vi.fn(async () => rows);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  return { from, where, limit };
};

const makeWhereSelect = (rows: unknown[]) => {
  const where = vi.fn(async () => rows);
  const from = vi.fn(() => ({ where }));
  return { from, where };
};

describe('profile stats route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_JWT_SECRET = 'profile-stats-route-secret';
  });

  afterEach(() => {
    delete process.env.API_JWT_SECRET;
  });

  it('returns verified aggregate stats and wallet balance', async () => {
    const profileSelect = makeLimitSelect([{ id: PROFILE_ID }]);
    const statsSelect = makeWhereSelect([
      {
        totalKills: 42,
        totalSurvivalTime: 360,
        totalGames: 3,
        maxSurvivalTime: 180,
        maxKills: 20,
        totalGoldEarned: 150,
      },
    ]);
    const walletSelect = makeLimitSelect([{ balance: 99 }]);
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(profileSelect)
        .mockReturnValueOnce(statsSelect)
        .mockReturnValueOnce(walletSelect),
    };
    mocks.getDb.mockReturnValue(db);

    const response = await request(createApp())
      .get('/api/v1/profile/stats')
      .set('Authorization', `Bearer ${createToken()}`)
      .expect(200);

    expect(response.body).toEqual({
      stats: {
        totalKills: 42,
        totalSurvivalTime: 360,
        totalGames: 3,
        maxSurvivalTime: 180,
        maxKills: 20,
        totalGoldEarned: 150,
        goldBalance: 99,
        gemsBalance: 0,
      },
    });
  });

  it('returns 404 when authenticated account has no profile', async () => {
    const db = {
      select: vi.fn().mockReturnValueOnce(makeLimitSelect([])),
    };
    mocks.getDb.mockReturnValue(db);

    const response = await request(createApp())
      .get('/api/v1/profile/stats')
      .set('Authorization', `Bearer ${createToken()}`)
      .expect(404);

    expect(response.body).toEqual({ error: 'Profile not found' });
  });
});
