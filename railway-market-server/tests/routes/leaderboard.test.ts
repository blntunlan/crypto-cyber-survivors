import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks --------------------------------------------------------------

// Mock drizzle-orm so `sql\`...\`` produces a plain, inspectable query
// descriptor instead of a real SQL object (which needs a dialect to serialize).
vi.mock('drizzle-orm', () => {
  const sql = (strings: TemplateStringsArray, ...values: unknown[]) => {
    const chunks: Array<{ type: 'raw'; text: string } | { type: 'param'; value: unknown }> = [];
    for (let i = 0; i < strings.length; i++) {
      chunks.push({ type: 'raw', text: strings[i] });
      if (i < values.length) {
        const v = values[i] as { __raw?: boolean; text?: string } | undefined;
        if (v && v.__raw) {
          chunks.push({ type: 'raw', text: v.text ?? '' });
        } else {
          chunks.push({ type: 'param', value: v });
        }
      }
    }
    return { __sql: true, chunks };
  };
  sql.raw = (text: string) => ({ __raw: true, text });
  return { sql };
});

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

import leaderboardRouter from '../../src/routes/leaderboard';

// --- Fixtures -----------------------------------------------------------

const ROW_BTC = {
  profile_id: '550e8400-e29b-41d4-a716-446655440001',
  display_name: 'SatoshiSlayer',
  avatar_url: null,
  primary_auth_provider: 'twitter',
  pair: 'BTC',
  max_survival_time: 842,
  total_kills: 14380,
  high_score: 127450,
  total_sessions: 67,
  last_played_at: '2026-06-23T00:00:00Z',
};

const ROW_ETH = {
  ...ROW_BTC,
  pair: 'ETH',
  max_survival_time: 500,
  high_score: 90000,
  total_kills: 5000,
  total_sessions: 20,
};

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/leaderboard', leaderboardRouter);
  return app;
};

type QueryChunk = { type: 'raw'; text: string } | { type: 'param'; value: unknown };

/** Flatten a mocked sql query descriptor into { text, params }. */
const flatten = (query: { chunks: QueryChunk[] }): { text: string; params: unknown[] } => {
  let text = '';
  const params: unknown[] = [];
  for (const chunk of query.chunks) {
    if (chunk.type === 'raw') {
      text += chunk.text;
    } else {
      text += '?';
      params.push(chunk.value);
    }
  }
  return { text: text.replace(/\s+/g, ' ').trim(), params };
};

/**
 * Build a getDb() mock that records the executed query and returns `rows`.
 */
const makeDb = (rows: unknown[]) => {
  const calls: { text: string; params: unknown[] }[] = [];
  const execute = vi.fn(async (query: { chunks: QueryChunk[] }) => {
    calls.push(flatten(query));
    return { rows, command: 'SELECT', rowCount: rows.length };
  });
  const db = { execute };
  mocks.getDb.mockReturnValue(db);
  return { calls };
};

// --- Tests --------------------------------------------------------------

describe('leaderboard route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uses the global v_leaderboard view (no pair) and returns rows', async () => {
    const { calls } = makeDb([ROW_BTC, ROW_ETH]);

    const response = await request(createApp())
      .get('/api/v1/leaderboard?limit=50')
      .expect(200);

    expect(calls).toHaveLength(1);
    expect(calls[0].text).toContain('FROM v_leaderboard');
    expect(calls[0].text).not.toContain('v_leaderboard_by_pair');
    expect(calls[0].text).not.toContain('WHERE pair');
    expect(response.body).toEqual({
      data: [ROW_BTC, ROW_ETH],
      limit: 50,
      offset: 0,
      sort: 'max_survival_time',
    });
  });

  it('uses v_leaderboard_by_pair when ?pair= is supplied', async () => {
    const { calls } = makeDb([ROW_BTC]);

    const response = await request(createApp())
      .get('/api/v1/leaderboard?pair=BTC&limit=10&offset=5&sort=high_score')
      .expect(200);

    expect(calls).toHaveLength(1);
    expect(calls[0].text).toContain('FROM v_leaderboard_by_pair');
    expect(calls[0].text).toContain('WHERE pair');
    // Ensure it did NOT use the plain global view.
    expect(calls[0].text).not.toMatch(/FROM v_leaderboard(?!_by_pair)/);
    expect(response.body).toEqual({
      data: [ROW_BTC],
      limit: 10,
      offset: 5,
      sort: 'high_score',
    });
  });

  it('passes the pair value as a parameter', async () => {
    const { calls } = makeDb([ROW_BTC]);

    await request(createApp())
      .get('/api/v1/leaderboard?pair=ETH')
      .expect(200);

    expect(calls[0].params).toContain('ETH');
  });

  it('falls back to the default sort when an unknown sort is requested', async () => {
    const { calls } = makeDb([]);

    await request(createApp())
      .get('/api/v1/leaderboard?sort=malicious')
      .expect(200);

    expect(calls).toHaveLength(1);
    expect(calls[0].text).toContain('ORDER BY max_survival_time DESC');
  });

  it('clamps limit into [1, 100] and offset to >= 0', async () => {
    const { calls } = makeDb([]);

    const response = await request(createApp())
      .get('/api/v1/leaderboard?limit=9999&offset=-10')
      .expect(200);

    // limit clamped to 100, offset clamped to 0
    expect(response.body.limit).toBe(100);
    expect(response.body.offset).toBe(0);
    expect(calls[0].params).toContain(100);
    expect(calls[0].params).toContain(0);
  });

  it('returns 500 on database error', async () => {
    const execute = vi.fn(async () => {
      throw new Error('boom');
    });
    mocks.getDb.mockReturnValue({ execute });

    await request(createApp())
      .get('/api/v1/leaderboard')
      .expect(500);
  });
});
