import crypto from 'crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440001';
const PROFILE_ID = '550e8400-e29b-41d4-a716-446655440002';
const SESSION_SECRET = 'session-secret';

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getProfileId: vi.fn(),
  getClientInfo: vi.fn(() => ({
    ipAddress: '127.0.0.1',
    userAgent: 'vitest',
  })),
  logAudit: vi.fn(),
}));

vi.mock('../../src/middleware/auth', () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    req.authUserId = ACCOUNT_ID;
    req.accountId = ACCOUNT_ID;
    next();
  },
  getRequiredAccountId: vi.fn(() => ACCOUNT_ID),
}));

vi.mock('../../src/db', () => ({
  getDb: mocks.getDb,
}));

vi.mock('../../src/db/helpers', () => ({
  getProfileId: mocks.getProfileId,
}));

vi.mock('../../src/utils/auditLogger', () => ({
  getClientInfo: mocks.getClientInfo,
  logAudit: mocks.logAudit,
}));

vi.mock('../../src/utils/logger', () => ({
  Logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import sessionsRouter from '../../src/routes/sessions';

type VerifyPayload = {
  sessionId: string;
  pair: string;
  position: 'LONG' | 'SHORT';
  leverage: number;
  claimedEntryPrice: number;
  claimedExitPrice: number;
  claimedPnL: number;
  kills: number;
  level: number;
  survivalSeconds: number;
  exitType: 'portal' | 'death' | 'afk_death' | 'cycle_complete';
  portalType: 'TAKE_PROFIT' | 'STOP_LOSS' | 'FLOW_EXIT' | 'FORCED' | null;
  maxStreak: number;
  rawCoins?: number;
  enemyDropCoins?: number;
  totalCoins?: number;
  pnlPercent?: number;
};

const makePayload = (overrides: Partial<VerifyPayload> = {}): VerifyPayload => ({
  sessionId: SESSION_ID,
  pair: 'BTC',
  position: 'LONG',
  leverage: 10,
  claimedEntryPrice: 50_000,
  claimedExitPrice: 50_500,
  claimedPnL: 0.01,
  kills: 30,
  level: 5,
  survivalSeconds: 60,
  exitType: 'death',
  portalType: null,
  maxStreak: 12,
  ...overrides,
});

const makeSignature = (payload: VerifyPayload): string => {
  const signablePayload: Record<string, unknown> = {
    sessionId: payload.sessionId,
    pair: payload.pair,
    position: payload.position,
    leverage: payload.leverage,
    claimedEntryPrice: payload.claimedEntryPrice,
    claimedExitPrice: payload.claimedExitPrice,
    claimedPnL: payload.claimedPnL,
    kills: payload.kills,
    level: payload.level,
    survivalSeconds: Math.floor(payload.survivalSeconds),
    exitType: payload.exitType,
    portalType: payload.portalType,
    maxStreak: payload.maxStreak,
  };

  if (payload.rawCoins !== undefined) signablePayload.rawCoins = payload.rawCoins;
  if (payload.enemyDropCoins !== undefined) {
    signablePayload.enemyDropCoins = payload.enemyDropCoins;
  }
  if (payload.totalCoins !== undefined) {
    signablePayload.totalCoins = payload.totalCoins;
  }
  if (payload.pnlPercent !== undefined) {
    signablePayload.pnlPercent = payload.pnlPercent;
  }

  return crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(JSON.stringify(signablePayload))
    .digest('hex');
};

const makeVerifyBody = (payload = makePayload()) => ({
  sessionId: SESSION_ID,
  signature: makeSignature(payload),
  payload,
});

const makeSessionRow = (isVerified: boolean) => ({
  id: SESSION_ID,
  profileId: PROFILE_ID,
  sessionSecret: SESSION_SECRET,
  isVerified,
  pair: 'BTC',
  position: 'LONG',
  leverage: 10,
  createdAt: new Date(Date.now() - 120_000),
  entryPrice: null,
  exitPrice: null,
  survivalSeconds: null,
  kills: null,
  level: null,
});

const makeSelectBuilder = (rows: unknown[]) => {
  const limit = vi.fn(async () => rows);
  const orderBy = vi.fn(() => ({ limit }));
  const where = vi.fn(() => ({ limit, orderBy }));
  const from = vi.fn(() => ({ where }));

  return { from };
};

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/sessions', sessionsRouter);
  return app;
};

describe('sessions verify route idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProfileId.mockResolvedValue(PROFILE_ID);
  });

  it('rejects already verified sessions before reward transaction starts', async () => {
    const transaction = vi.fn();
    const select = vi.fn(() => makeSelectBuilder([makeSessionRow(true)]));
    mocks.getDb.mockReturnValue({ select, transaction });

    const response = await request(makeApp())
      .post('/api/v1/sessions/verify')
      .send(makeVerifyBody());

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'Already verified' });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects a concurrent duplicate after the session row is locked', async () => {
    const txExecute = vi.fn(async () => ({
      rows: [
        {
          id: SESSION_ID,
          profile_id: PROFILE_ID,
          is_verified: true,
        },
      ],
    }));
    const tx = {
      execute: txExecute,
      update: vi.fn(),
    };
    const transaction = vi.fn(async (callback: (lockedTx: typeof tx) => unknown) =>
      callback(tx)
    );
    const select = vi
      .fn()
      .mockReturnValueOnce(makeSelectBuilder([makeSessionRow(false)]))
      .mockReturnValueOnce(makeSelectBuilder([]))
      .mockReturnValueOnce(makeSelectBuilder([]));

    mocks.getDb.mockReturnValue({ select, transaction });

    const response = await request(makeApp())
      .post('/api/v1/sessions/verify')
      .send(makeVerifyBody());

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'Already verified' });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(txExecute).toHaveBeenCalledTimes(1);
    expect(tx.update).not.toHaveBeenCalled();
  });
});
