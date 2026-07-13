import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440001';
const PROFILE_ID = '550e8400-e29b-41d4-a716-446655440002';
const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const mocks = vi.hoisted(() => ({ withTransaction: vi.fn(), query: vi.fn() }));

vi.mock('../../src/middleware/auth', () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => { req.accountId = ACCOUNT_ID; next(); },
  getRequiredAccountId: vi.fn(() => ACCOUNT_ID),
}));
vi.mock('../../src/db/pool', () => ({ query: mocks.query, withTransaction: mocks.withTransaction }));
vi.mock('../../src/utils/logger', () => ({ Logger: { error: vi.fn() } }));
import economyRouter from '../../src/routes/economy';

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/economy', economyRouter);
  return app;
};

describe('cash-out failure route', () => {
  beforeEach(() => vi.clearAllMocks());

  it('records a death as a shard-only failed escrow with no primary reward', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ id: PROFILE_ID }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: SESSION_ID, survival_seconds: 600, kills: 30 }] })
        .mockResolvedValueOnce({ rows: [{ id: 'escrow-1' }] })
        .mockResolvedValueOnce({ rows: [{ amount: 50 }] })
        .mockResolvedValueOnce({ rows: [] }),
    };
    mocks.withTransaction.mockImplementation(async (callback) => callback(client));

    const response = await request(makeApp()).post('/api/v1/economy/cash-out/failure').send({
      session_id: SESSION_ID,
      failure_type: 'death',
      idempotency_key: 'failure-key-123',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ state: 'failed', primaryRewardPoints: 0, shards: 50 });
    expect(client.query).toHaveBeenCalledTimes(7);
    expect(client.query.mock.calls.some(([statement]) =>
      String(statement).includes('INSERT INTO audit_events')
    )).toBe(true);
  });

  it('does not overwrite a settled escrow with a death or liquidation', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ id: PROFILE_ID }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: SESSION_ID, survival_seconds: 600, kills: 30 }] })
        .mockResolvedValueOnce({ rows: [] }),
    };
    mocks.withTransaction.mockImplementation(async (callback) => callback(client));

    const response = await request(makeApp()).post('/api/v1/economy/cash-out/failure').send({
      session_id: SESSION_ID,
      failure_type: 'liquidation',
      idempotency_key: 'failure-key-456',
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'Run escrow is already settled' });
    expect(client.query).toHaveBeenCalledTimes(4);
    expect(client.query.mock.calls.some(([statement]) =>
      String(statement).includes('INSERT INTO shard_entries')
    )).toBe(false);
  });
});
