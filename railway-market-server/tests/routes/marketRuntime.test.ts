import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signRailwayAccessToken } from '../../src/utils/railwayJwt';

const mocks = vi.hoisted(() => ({
  getProfileId: vi.fn(),
  withTransaction: vi.fn(),
}));

vi.mock('../../src/db/helpers', () => ({
  getProfileId: mocks.getProfileId,
}));

vi.mock('../../src/db/pool', () => ({
  withTransaction: mocks.withTransaction,
}));

vi.mock('../../src/utils/logger', () => ({
  Logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import marketRuntimeRouter from '../../src/routes/marketRuntime';

const ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440001';
const PROFILE_ID = '550e8400-e29b-41d4-a716-446655440002';

const createToken = (): string => {
  return signRailwayAccessToken({
    accountId: ACCOUNT_ID,
    accountType: 'anonymous',
  }).accessToken;
};

const createPayload = () => ({
  runId: 'BTC-runtime-test',
  count: 1,
  items: [
    {
      runId: 'BTC-runtime-test',
      seq: 1,
      runConstants: {
        runId: 'BTC-runtime-test',
        pair: 'BTC',
        position: 'LONG',
        leverage: 10,
      },
      tick: {
        runId: 'BTC-runtime-test',
        seq: 1,
        pair: 'BTC',
        source: 'binance',
        recvTs: 1_800_000_000_000,
        hash: 'tick-hash',
      },
      snapshot: {
        runId: 'BTC-runtime-test',
        seq: 1,
        pair: 'BTC',
        createdAt: 1_800_000_000_000,
        checksum: 'snapshot-checksum',
      },
    },
  ],
});

describe('market runtime batch route', () => {
  beforeEach(() => {
    process.env.API_JWT_SECRET = 'market-runtime-route-secret';
    mocks.getProfileId.mockReset();
    mocks.withTransaction.mockReset();
  });

  afterEach(() => {
    delete process.env.API_JWT_SECRET;
  });

  it('persists market runtime records idempotently', async () => {
    const queryMock = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'audit-row-id' }] })
      .mockResolvedValueOnce({ rows: [] });

    mocks.getProfileId.mockResolvedValue(PROFILE_ID);
    mocks.withTransaction.mockImplementation(async (callback) => {
      return callback({ query: queryMock });
    });

    const app = express();
    app.use(express.json());
    app.use('/api/v1/market', marketRuntimeRouter);

    const response = await request(app)
      .post('/api/v1/market/runtime-batch')
      .set('Authorization', `Bearer ${createToken()}`)
      .send(createPayload());

    expect(response.status).toBe(202);
    expect(response.body).toEqual({
      runId: 'BTC-runtime-test',
      received: 1,
      accepted: 1,
      duplicates: 0,
    });
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO market_runtime_audit'),
      expect.arrayContaining([
        ACCOUNT_ID,
        PROFILE_ID,
        null,
        'BTC-runtime-test',
        1,
        'BTC',
        'binance',
      ])
    );
  });

  it('rejects mismatched batch count', async () => {
    mocks.getProfileId.mockResolvedValue(PROFILE_ID);

    const app = express();
    app.use(express.json());
    app.use('/api/v1/market', marketRuntimeRouter);

    const response = await request(app)
      .post('/api/v1/market/runtime-batch')
      .set('Authorization', `Bearer ${createToken()}`)
      .send({ ...createPayload(), count: 2 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('count must match items length');
    expect(mocks.withTransaction).not.toHaveBeenCalled();
  });
});
