import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/middleware/auth', () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    req.authUserId = '550e8400-e29b-41d4-a716-446655440000';
    next();
  },
  getRequiredAuthUserId: vi.fn(() => '550e8400-e29b-41d4-a716-446655440000'),
}));

vi.mock('../../src/db', () => ({
  getDb: vi.fn(() => {
    throw new Error('recover route must not access database');
  }),
}));

vi.mock('../../src/db/pool', () => ({
  query: vi.fn(() => {
    throw new Error('recover route must not write audit logs');
  }),
}));

vi.mock('../../src/utils/logger', () => ({
  Logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import sessionsRouter from '../../src/routes/sessions';
import { getDb } from '../../src/db';
import { query } from '../../src/db/pool';

describe('sessions recovery route', () => {
  it('does not return session secrets after start', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/v1/sessions', sessionsRouter);

    const response = await request(app).get(
      '/api/v1/sessions/11111111-1111-4111-8111-111111111111/recover'
    );

    expect(response.status).toBe(410);
    expect(response.body).toEqual({
      error: 'Session secret recovery is disabled',
    });
    expect(getDb).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });
});
