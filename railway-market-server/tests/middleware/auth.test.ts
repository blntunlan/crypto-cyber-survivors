import { afterEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../src/utils/logger', () => ({
  Logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

const SUPABASE_URL = 'https://project-ref.supabase.co';
const RAW_SECRET = 'legacy-test-secret';
const ENCODED_SECRET = Buffer.from(RAW_SECRET).toString('base64');
const SIGNING_SECRET = Buffer.from(ENCODED_SECRET, 'base64');

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

function makeRequest(token: string): Request {
  return {
    headers: {
      authorization: `Bearer ${token}`,
    },
  } as Request;
}

async function loadMiddleware() {
  vi.resetModules();
  process.env.SUPABASE_URL = SUPABASE_URL;
  process.env.SUPABASE_JWT_SECRET = ENCODED_SECRET;
  return import('../../src/middleware/auth');
}

function signToken(overrides: jwt.JwtPayload = {}): string {
  return jwt.sign(
    {
      sub: '550e8400-e29b-41d4-a716-446655440000',
      aud: 'authenticated',
      iss: `${SUPABASE_URL}/auth/v1`,
      role: 'authenticated',
      ...overrides,
    },
    SIGNING_SECRET,
    { algorithm: 'HS256', expiresIn: '5m' }
  );
}

describe('requireAuth', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_JWT_SECRET;
  });

  it('accepts a Supabase access token with the expected issuer and audience', async () => {
    const { requireAuth } = await loadMiddleware();
    const req = makeRequest(signToken());
    const res = makeResponse();
    const next = vi.fn() as NextFunction;

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.authUserId).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects a token signed for the wrong audience', async () => {
    const { requireAuth } = await loadMiddleware();
    const req = makeRequest(signToken({ aud: 'anon' }));
    const res = makeResponse();
    const next = vi.fn() as NextFunction;

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
  });

  it('rejects a token from the wrong issuer', async () => {
    const { requireAuth } = await loadMiddleware();
    const req = makeRequest(signToken({ iss: 'https://other.supabase.co/auth/v1' }));
    const res = makeResponse();
    const next = vi.fn() as NextFunction;

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
  });
});
