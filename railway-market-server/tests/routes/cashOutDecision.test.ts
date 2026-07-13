import crypto from 'crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440001';
const PROFILE_ID = '550e8400-e29b-41d4-a716-446655440002';
const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const QUOTE_ID = 'quote-1';
const ISSUED_AT = Math.floor(Date.now() / 1_000);
const EXPIRES_AT = ISSUED_AT + 15;
const SECRET = 'server-only-secret';
const signature = crypto
  .createHmac('sha256', SECRET)
  .update([QUOTE_ID, SESSION_ID, 42, 120, ISSUED_AT, EXPIRES_AT].join(':'))
  .digest('hex');

const mocks = vi.hoisted(() => ({ withTransaction: vi.fn(), query: vi.fn() }));

vi.mock('../../src/middleware/auth', () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    req.accountId = ACCOUNT_ID;
    next();
  },
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

describe('cash-out decision route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CASH_OUT_QUOTE_SECRET = SECRET;
  });

  it('settles an authenticated accepted quote and stores its idempotent response', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ id: PROFILE_ID }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              escrow_id: 'escrow-1', session_id: SESSION_ID, quote_id: QUOTE_ID,
              canonical_sequence: 42, reward_points: 120, signature,
              issued_at: new Date(ISSUED_AT * 1_000), expires_at: new Date(EXPIRES_AT * 1_000),
              status: 'open', greed_level: 0,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }),
    };
    mocks.withTransaction.mockImplementation(async (callback) => callback(client));

    const response = await request(makeApp()).post('/api/v1/economy/cash-out/decision').send({
      quote_id: QUOTE_ID,
      decision: 'accept',
      signature,
      idempotency_key: 'accept-key-123',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ state: 'settled', rewardPoints: 120, greedDelta: 0 });
    expect(client.query).toHaveBeenCalledTimes(8);
    expect(client.query.mock.calls.some(([statement]) =>
      String(statement).includes('INSERT INTO reward_point_entries')
    )).toBe(true);
    expect(client.query.mock.calls.some(([statement]) =>
      String(statement).includes('INSERT INTO audit_events')
    )).toBe(true);
  });

  it('replays a stored idempotency response without settling a quote again', async () => {
    const replayBody = { state: 'settled', rewardPoints: 120, greedDelta: 0 };
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ id: PROFILE_ID }] })
        .mockResolvedValueOnce({ rows: [{ response_body: replayBody, status_code: 200 }] }),
    };
    mocks.withTransaction.mockImplementation(async (callback) => callback(client));

    const response = await request(makeApp()).post('/api/v1/economy/cash-out/decision').send({
      quote_id: QUOTE_ID,
      decision: 'accept',
      signature,
      idempotency_key: 'accept-key-123',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(replayBody);
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it('records a rejected quote as greed without creating a primary reward entry', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ id: PROFILE_ID }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            escrow_id: 'escrow-1', session_id: SESSION_ID, quote_id: QUOTE_ID,
            canonical_sequence: 42, reward_points: 120, signature,
            issued_at: new Date(ISSUED_AT * 1_000), expires_at: new Date(EXPIRES_AT * 1_000),
            status: 'open', greed_level: 0,
          }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }),
    };
    mocks.withTransaction.mockImplementation(async (callback) => callback(client));

    const response = await request(makeApp()).post('/api/v1/economy/cash-out/decision').send({
      quote_id: QUOTE_ID,
      decision: 'reject',
      signature,
      idempotency_key: 'reject-key-123',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ state: 'active', rewardPoints: 0, greedDelta: 1 });
    expect(client.query).toHaveBeenCalledTimes(7);
    expect(client.query.mock.calls.some(([statement]) =>
      String(statement).includes('INSERT INTO reward_point_entries')
    )).toBe(false);
  });

  it('rejects a tampered quote signature before any settlement write', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ id: PROFILE_ID }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            escrow_id: 'escrow-1', session_id: SESSION_ID, quote_id: QUOTE_ID,
            canonical_sequence: 42, reward_points: 120, signature,
            issued_at: new Date(ISSUED_AT * 1_000), expires_at: new Date(EXPIRES_AT * 1_000),
            status: 'open', greed_level: 0,
          }],
        }),
    };
    mocks.withTransaction.mockImplementation(async (callback) => callback(client));

    const response = await request(makeApp()).post('/api/v1/economy/cash-out/decision').send({
      quote_id: QUOTE_ID,
      decision: 'accept',
      signature: 'b'.repeat(64),
      idempotency_key: 'tampered-key-123',
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Invalid cash-out quote signature' });
    expect(client.query).toHaveBeenCalledTimes(3);
  });
});
