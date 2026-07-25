import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440001';
const PROFILE_ID = '550e8400-e29b-41d4-a716-446655440002';
const SESSION_ID = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  withTransaction: vi.fn(),
  query: vi.fn(),
}));

vi.mock('../../src/middleware/auth', () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    req.accountId = ACCOUNT_ID;
    next();
  },
  getRequiredAccountId: vi.fn(() => ACCOUNT_ID),
}));

vi.mock('../../src/db/pool', () => ({
  query: mocks.query,
  withTransaction: mocks.withTransaction,
}));

vi.mock('../../src/utils/logger', () => ({ Logger: { error: vi.fn() } }));

import economyRouter from '../../src/routes/economy';

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/economy', economyRouter);
  return app;
};

describe('cash-out quote route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CASH_OUT_QUOTE_SECRET = 'server-only-secret';
  });

  it('issues a stored signed quote from the authenticated session and canonical price row', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ id: PROFILE_ID }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: SESSION_ID,
              created_at: new Date(Date.now() - 300_000),
              entry_price: 100,
              position: 'LONG',
              leverage: 5,
              pair: 'BTCUSDT',
              survival_seconds: 300,
              kills: 10,
              level: 3,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ id: 42, price: 101, timestamp: new Date() }] })
        .mockResolvedValueOnce({ rows: [{ average_price: 100.5, sample_count: 2 }] })
        .mockResolvedValueOnce({ rows: [{ id: 'escrow-1', greed_level: 0, last_decision_at_seconds: null }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'quote-row-1' }] }),
    };
    mocks.withTransaction.mockImplementation(async (callback) => callback(client));

    const response = await request(makeApp()).post('/api/v1/economy/cash-out/quote').send({
      session_id: SESSION_ID,
    });

    expect(response.status).toBe(200);
    expect(response.body.greedLevel).toBe(0);
    expect(response.body.quote.canonicalSequence).toBe(42);
    expect(response.body.quote.expiresAtSeconds - response.body.quote.issuedAtSeconds).toBe(15);
    expect(response.body.signature).toMatch(/^[a-f0-9]{64}$/);
    expect(client.query).toHaveBeenCalledTimes(8);
  });

  it('rejects a client-claimed stale duration', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ id: PROFILE_ID }] })
        .mockResolvedValueOnce({
          rows: [{ id: SESSION_ID, created_at: new Date(Date.now() - 300_000), entry_price: 100, position: 'LONG', leverage: 5, pair: 'BTCUSDT', survival_seconds: 300, kills: 10, level: 3 }],
        })
        .mockResolvedValueOnce({ rows: [{ id: 42, price: 101, timestamp: new Date() }] })
        .mockResolvedValueOnce({ rows: [{ average_price: 100.5, sample_count: 2 }] })
        .mockResolvedValueOnce({ rows: [{ id: 'escrow-1', greed_level: 0, last_decision_at_seconds: null }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'quote-row-1' }] }),
    };
    mocks.withTransaction.mockImplementation(async (callback) => callback(client));

    const response = await request(makeApp()).post('/api/v1/economy/cash-out/quote').send({
      session_id: SESSION_ID,
      market_stale_seconds: 60,
    });

    expect(response.status).toBe(400);
    expect(client.query).not.toHaveBeenCalled();
  });

  it('reuses an unexpired open quote instead of issuing a second signed quote', async () => {
    const issuedAt = Math.floor(Date.now() / 1_000);
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ id: PROFILE_ID }] })
        .mockResolvedValueOnce({
          rows: [{ id: SESSION_ID, created_at: new Date(Date.now() - 300_000), entry_price: 100, position: 'LONG', leverage: 5, pair: 'BTCUSDT', survival_seconds: 300, kills: 10, level: 3 }],
        })
        .mockResolvedValueOnce({ rows: [{ id: 42, price: 101, timestamp: new Date() }] })
        .mockResolvedValueOnce({ rows: [{ average_price: 100.5, sample_count: 2 }] })
        .mockResolvedValueOnce({ rows: [{ id: 'escrow-1', greed_level: 0, last_decision_at_seconds: null }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            quote_id: 'open-quote-id', canonical_sequence: 41, reward_points: 99,
            signature: 'a'.repeat(64), issued_at: new Date(issuedAt * 1_000),
            expires_at: new Date((issuedAt + 15) * 1_000),
          }],
        }),
    };
    mocks.withTransaction.mockImplementation(async (callback) => callback(client));

    const response = await request(makeApp()).post('/api/v1/economy/cash-out/quote').send({
      session_id: SESSION_ID,
    });

    expect(response.status).toBe(200);
    expect(response.body.quote.quoteId).toBe('open-quote-id');
    expect(response.body.signature).toBe('a'.repeat(64));
    expect(client.query).toHaveBeenCalledTimes(7);
  });

  it('issues a Safe Exit-only quote after sixty seconds without a canonical price update', async () => {
    const staleTimestamp = new Date(Date.now() - 70_000);
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ id: PROFILE_ID }] })
        .mockResolvedValueOnce({
          rows: [{ id: SESSION_ID, created_at: new Date(Date.now() - 300_000), entry_price: 100, position: 'LONG', leverage: 5, pair: 'BTCUSDT', survival_seconds: 300, kills: 10, level: 3 }],
        })
        .mockResolvedValueOnce({ rows: [{ id: 42, price: 101, timestamp: staleTimestamp }] })
        .mockResolvedValueOnce({ rows: [{ average_price: 100.5, sample_count: 2 }] })
        .mockResolvedValueOnce({ rows: [{ id: 'escrow-1', greed_level: 0, last_decision_at_seconds: null }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ quote_id: 'safe-exit-quote' }] }),
    };
    mocks.withTransaction.mockImplementation(async (callback) => callback(client));

    const response = await request(makeApp()).post('/api/v1/economy/cash-out/quote').send({
      session_id: SESSION_ID,
    });

    expect(response.status).toBe(200);
    expect(response.body.safeExitOnly).toBe(true);
    expect(response.body.quote.expiresAtSeconds - response.body.quote.issuedAtSeconds).toBe(15);
  });
});
