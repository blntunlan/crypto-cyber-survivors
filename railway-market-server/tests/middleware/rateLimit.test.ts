import { describe, it, expect } from 'vitest';
import express, { type RequestHandler } from 'express';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  globalLimiter,
  authLimiter,
  writeLimiter,
  telemetryLimiter,
  leaderboardLimiter,
} from '../../src/middleware/rateLimit';

const routeProbe = (limiter: RequestHandler) => {
  const app = express();
  app.set('trust proxy', 1);
  app.use(limiter);
  app.post('/probe', (_req, res) => res.json({ ok: true }));
  app.get('/probe', (_req, res) => res.json({ ok: true }));
  return app;
};

async function exhaustLimiter(params: {
  limiter: RequestHandler;
  limit: number;
  method?: 'get' | 'post';
  clientIp: string;
}) {
  const app = routeProbe(params.limiter);
  const method = params.method ?? 'post';

  for (let attempt = 0; attempt < params.limit; attempt++) {
    const response = await request(app)
      [method]('/probe')
      .set('X-Forwarded-For', params.clientIp);

    expect(response.status).toBe(200);
  }

  return request(app)[method]('/probe').set('X-Forwarded-For', params.clientIp);
}

const readServerEntry = () =>
  readFileSync(fileURLToPath(new URL('../../src/index.ts', import.meta.url)), 'utf8');

const readTelemetryRoute = () =>
  readFileSync(
    fileURLToPath(new URL('../../src/routes/telemetry.ts', import.meta.url)),
    'utf8'
  );

describe('Rate Limiters', () => {
  it('globalLimiter should be defined and be a function', () => {
    expect(globalLimiter).toBeDefined();
    expect(typeof globalLimiter).toBe('function');
  });

  it('authLimiter should be defined', () => {
    expect(authLimiter).toBeDefined();
    expect(typeof authLimiter).toBe('function');
  });

  it('writeLimiter should be defined', () => {
    expect(writeLimiter).toBeDefined();
    expect(typeof writeLimiter).toBe('function');
  });

  it('telemetryLimiter should be defined', () => {
    expect(telemetryLimiter).toBeDefined();
    expect(typeof telemetryLimiter).toBe('function');
  });

  it('leaderboardLimiter should be defined', () => {
    expect(leaderboardLimiter).toBeDefined();
    expect(typeof leaderboardLimiter).toBe('function');
  });

  it('enforces the global 100 req/min guardrail', async () => {
    const response = await exhaustLimiter({
      limiter: globalLimiter,
      limit: 100,
      clientIp: '203.0.113.100',
    });

    expect(response.status).toBe(429);
    expect(response.body).toEqual({
      error: 'Too many requests, please try again later',
    });
  });

  it('enforces the auth 20 req/min guardrail', async () => {
    const response = await exhaustLimiter({
      limiter: authLimiter,
      limit: 20,
      clientIp: '203.0.113.20',
    });

    expect(response.status).toBe(429);
    expect(response.body).toEqual({
      error: 'Too many auth attempts, please try again later',
    });
  });

  it('enforces the write 50 req/min guardrail used by sessions sync and verify', async () => {
    const response = await exhaustLimiter({
      limiter: writeLimiter,
      limit: 50,
      clientIp: '203.0.113.50',
    });

    expect(response.status).toBe(429);
    expect(response.body).toEqual({
      error: 'Too many write requests, please try again later',
    });
  });

  it('enforces the telemetry 10 req/min guardrail used by public ingest endpoints', async () => {
    const response = await exhaustLimiter({
      limiter: telemetryLimiter,
      limit: 10,
      clientIp: '203.0.113.10',
    });

    expect(response.status).toBe(429);
    expect(response.body).toEqual({ error: 'Too many telemetry requests' });
  });

  it('enforces the leaderboard 30 req/min guardrail', async () => {
    const response = await exhaustLimiter({
      limiter: leaderboardLimiter,
      limit: 30,
      method: 'get',
      clientIp: '203.0.113.30',
    });

    expect(response.status).toBe(429);
    expect(response.body).toEqual({
      error: 'Too many leaderboard requests',
    });
  });

  it('keeps public ingest and session route groups behind the expected limiters', () => {
    const serverEntry = readServerEntry();
    const telemetryRoute = readTelemetryRoute();

    expect(serverEntry).toContain(
      "app.use('/api/v1/sessions', writeLimiter, sessionsRouter);"
    );
    expect(serverEntry).toContain(
      "app.use('/api/v1/telemetry', telemetryLimiter, telemetryRouter);"
    );
    expect(serverEntry).toContain(
      "app.use('/api/v1/market', writeLimiter, marketRuntimeRouter);"
    );
    expect(telemetryRoute).toContain("router.post('/errors'");
    expect(telemetryRoute).toContain("router.post('/cheat-reports'");
    expect(telemetryRoute).toContain("router.post('/performance-metrics'");
    expect(telemetryRoute).toContain("router.post('/product-events'");
  });
});
