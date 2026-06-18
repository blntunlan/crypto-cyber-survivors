import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import {
  RAILWAY_JWT_AUDIENCE,
  RAILWAY_JWT_ISSUER,
} from '../../src/utils/railwayJwt';

process.env.TEST_ENFORCE_AUTH_DB = 'true';

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

const API_JWT_SECRET = 'railway-test-secret';
const ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440001';

function makeResponse(): Response & {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
} {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
}

function makeRequest(token?: string): Request {
  return {
    headers: token
      ? {
          authorization: `Bearer ${token}`,
        }
      : {},
  } as Request;
}

async function loadMiddleware(configureSecret = true) {
  vi.resetModules();
  delete process.env.API_JWT_SECRET;
  delete process.env.RAILWAY_JWT_SECRET;
  delete process.env.JWT_SECRET;

  if (configureSecret) {
    process.env.API_JWT_SECRET = API_JWT_SECRET;
  }

  return import('../../src/middleware/auth');
}

function signRailwayToken(
  overrides: jwt.JwtPayload = {},
  options: jwt.SignOptions = {}
): string {
  return jwt.sign(
    {
      sub: ACCOUNT_ID,
      account_id: ACCOUNT_ID,
      account_type: 'anonymous',
      role: 'player',
      token_use: 'access',
      ...overrides,
    },
    API_JWT_SECRET,
    {
      algorithm: 'HS256',
      issuer: RAILWAY_JWT_ISSUER,
      audience: RAILWAY_JWT_AUDIENCE,
      expiresIn: '5m',
      ...options,
    }
  );
}

const mockSelectBuilder = (status: string | null) => {
  const rows = status ? [{ status }] : [];
  const limit = vi.fn(async () => rows);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  return { from };
};

function setupDbMock(status: string | null) {
  mocks.getDb.mockReturnValue({
    select: vi.fn(() => mockSelectBuilder(status)),
  });
}

describe('requireAuth', () => {
  beforeEach(() => {
    setupDbMock('active');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.API_JWT_SECRET;
    delete process.env.RAILWAY_JWT_SECRET;
    delete process.env.JWT_SECRET;
  });

  it('accepts a Railway-native access token when account is active', async () => {
    const { requireAuth } = await loadMiddleware();
    const req = makeRequest(signRailwayToken());
    const res = makeResponse();
    const next = vi.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.authUserId).toBe(ACCOUNT_ID);
    expect(req.accountId).toBe(ACCOUNT_ID);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects requests if account is not found in database', async () => {
    setupDbMock(null); // Account not found
    const { requireAuth } = await loadMiddleware();
    const req = makeRequest(signRailwayToken());
    const res = makeResponse();
    const next = vi.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Account not found' });
  });

  it('rejects requests if account status is suspended', async () => {
    setupDbMock('suspended');
    const { requireAuth } = await loadMiddleware();
    const req = makeRequest(signRailwayToken());
    const res = makeResponse();
    const next = vi.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Account is suspended' });
  });

  it('rejects a token signed for the wrong audience', async () => {
    const { requireAuth } = await loadMiddleware();
    const token = signRailwayToken({}, { audience: 'authenticated' });
    const req = makeRequest(token);
    const res = makeResponse();
    const next = vi.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
  });

  it('rejects a token from the wrong issuer', async () => {
    const { requireAuth } = await loadMiddleware();
    const token = signRailwayToken({}, { issuer: 'legacy-auth-provider' });
    const req = makeRequest(token);
    const res = makeResponse();
    const next = vi.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
  });

  it('rejects requests without a bearer token', async () => {
    const { requireAuth } = await loadMiddleware();
    const req = makeRequest();
    const res = makeResponse();
    const next = vi.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing or invalid Authorization header',
    });
  });

  it('fails closed when Railway JWT secret is not configured', async () => {
    const { requireAuth } = await loadMiddleware(false);
    const req = makeRequest(signRailwayToken());
    const res = makeResponse();
    const next = vi.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Auth not configured' });
  });
});
