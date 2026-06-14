import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';

const mocks = vi.hoisted(() => ({
  withTransaction: vi.fn(),
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

import authRouter from '../../src/routes/auth';
import {
  RAILWAY_JWT_AUDIENCE,
  RAILWAY_JWT_ISSUER,
} from '../../src/utils/railwayJwt';

describe('anonymous auth route', () => {
  beforeEach(() => {
    mocks.withTransaction.mockReset();
    process.env.API_JWT_SECRET = 'anonymous-route-secret';
  });

  afterEach(() => {
    delete process.env.API_JWT_SECRET;
  });

  it('creates an anonymous account bootstrap response', async () => {
    mocks.withTransaction.mockResolvedValue({
      account_id: '550e8400-e29b-41d4-a716-446655440001',
      profile_id: '550e8400-e29b-41d4-a716-446655440002',
      wallet_id: '550e8400-e29b-41d4-a716-446655440003',
      display_name: 'anon_test',
      balance: '0',
      currency: 'gold',
    });

    const app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRouter);

    const response = await request(app)
      .post('/api/v1/auth/anonymous')
      .send({ display_name: 'anon_test' });

    expect(response.status).toBe(201);
    expect(response.body.tokenType).toBe('Bearer');
    expect(response.body.account).toEqual({
      id: '550e8400-e29b-41d4-a716-446655440001',
      type: 'anonymous',
    });
    expect(response.body.wallet).toEqual({
      id: '550e8400-e29b-41d4-a716-446655440003',
      balance: 0,
      currency: 'gold',
    });

    const decoded = jwt.verify(response.body.accessToken, 'anonymous-route-secret', {
      algorithms: ['HS256'],
      issuer: RAILWAY_JWT_ISSUER,
      audience: RAILWAY_JWT_AUDIENCE,
    }) as jwt.JwtPayload;
    expect(decoded.sub).toBe('550e8400-e29b-41d4-a716-446655440001');
  });
});
