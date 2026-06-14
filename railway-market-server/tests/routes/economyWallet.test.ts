import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signRailwayAccessToken } from '../../src/utils/railwayJwt';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  withTransaction: vi.fn(),
}));

vi.mock('../../src/db/pool', () => ({
  query: mocks.query,
  withTransaction: mocks.withTransaction,
}));

vi.mock('../../src/utils/logger', () => ({
  Logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import economyRouter from '../../src/routes/economy';

describe('economy wallet route', () => {
  beforeEach(() => {
    mocks.query.mockReset();
    mocks.withTransaction.mockReset();
    process.env.API_JWT_SECRET = 'economy-route-secret';
  });

  afterEach(() => {
    delete process.env.API_JWT_SECRET;
  });

  it('returns wallet projection and recent ledger entries', async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: [{ id: '550e8400-e29b-41d4-a716-446655440002' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: '550e8400-e29b-41d4-a716-446655440003',
          balance: '125',
          currency: 'gold',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'ledger-1',
          amount: '125',
          balance_after: '125',
          entry_type: 'session_reward',
          reference_type: 'session',
          reference_id: 'session-1',
          created_at: '2026-06-13T00:00:00.000Z',
        }],
      });

    const { accessToken } = signRailwayAccessToken({
      accountId: '550e8400-e29b-41d4-a716-446655440001',
      accountType: 'anonymous',
    });

    const app = express();
    app.use(express.json());
    app.use('/api/v1/economy', economyRouter);

    const response = await request(app)
      .get('/api/v1/economy/wallet')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.wallet).toEqual({
      id: '550e8400-e29b-41d4-a716-446655440003',
      balance: 125,
      currency: 'gold',
    });
    expect(response.body.ledger).toEqual([
      {
        id: 'ledger-1',
        amount: 125,
        balanceAfter: 125,
        entryType: 'session_reward',
        referenceType: 'session',
        referenceId: 'session-1',
        createdAt: '2026-06-13T00:00:00.000Z',
      },
    ]);
  });
});
