import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signRailwayAccessToken } from '../../src/utils/railwayJwt';

const ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440001';
const PROFILE_ID = '550e8400-e29b-41d4-a716-446655440002';
const SESSION_ID = '550e8400-e29b-41d4-a716-446655440003';
const REPLAY_ID = '550e8400-e29b-41d4-a716-446655440004';

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getProfileId: vi.fn(),
  insertReturningRows: vi.fn(),
}));

vi.mock('../../src/db', () => ({
  getDb: mocks.getDb,
}));

vi.mock('../../src/db/helpers', () => ({
  getProfileId: mocks.getProfileId,
}));

vi.mock('../../src/utils/logger', () => ({
  Logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import replaysRouter from '../../src/routes/replays';

const createToken = (): string => {
  return signRailwayAccessToken({
    accountId: ACCOUNT_ID,
    accountType: 'anonymous',
  }).accessToken;
};

const createApp = () => {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use('/api/v1/replays', replaysRouter);
  return app;
};

const createReplayPayload = (overrides: Record<string, unknown> = {}) => ({
  sessionId: SESSION_ID,
  score: 1200,
  durationMs: 60_000,
  finalLevel: 7,
  totalKills: 42,
  pair: 'BTC',
  position: 'LONG',
  leverage: 10,
  replayData: Buffer.from(JSON.stringify({ snapshots: [], events: [] })).toString(
    'base64'
  ),
  ...overrides,
});

const makeSelectBuilder = (rows: unknown[]) => {
  const limit = vi.fn(async () => rows);
  const orderBy = vi.fn(() => ({ limit }));
  const where = vi.fn(() => ({ limit, orderBy }));
  const innerJoin = vi.fn(() => ({ where }));
  const from = vi.fn(() => ({ where, innerJoin }));
  return { from, where, innerJoin, orderBy, limit };
};

const makeInsertBuilder = (rows: unknown[]) => {
  const returning = vi.fn(async () => rows);
  const onConflictDoNothing = vi.fn(() => ({ returning }));
  const values = vi.fn(() => ({ onConflictDoNothing }));
  return { values, onConflictDoNothing, returning };
};

const makeDb = (selectRows: unknown[], insertRows: unknown[] = []) => {
  const selectBuilder = makeSelectBuilder(selectRows);
  const insertBuilder = makeInsertBuilder(insertRows);
  const db = {
    select: vi.fn(() => selectBuilder),
    insert: vi.fn(() => insertBuilder),
  };
  return { db, selectBuilder, insertBuilder };
};

describe('replays route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_JWT_SECRET = 'replays-route-secret';
    mocks.getProfileId.mockResolvedValue(PROFILE_ID);
  });

  afterEach(() => {
    delete process.env.API_JWT_SECRET;
  });

  it('saves a replay only for an owned verified session', async () => {
    const { db, insertBuilder } = makeDb(
      [{ id: SESSION_ID, isVerified: true }],
      [{ id: REPLAY_ID }]
    );
    mocks.getDb.mockReturnValue(db);

    const response = await request(createApp())
      .post('/api/v1/replays/save')
      .set('Authorization', `Bearer ${createToken()}`)
      .send(createReplayPayload())
      .expect(200);

    expect(response.body).toEqual({
      replayId: REPLAY_ID,
      size: Buffer.from(createReplayPayload().replayData, 'base64').length,
    });
    expect(insertBuilder.values).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: SESSION_ID,
        profileId: PROFILE_ID,
        replayData: expect.any(Buffer) as Buffer,
        replaySize: Buffer.from(createReplayPayload().replayData, 'base64').length,
      })
    );
  });

  it('rejects replay save before session verification', async () => {
    const { db } = makeDb([{ id: SESSION_ID, isVerified: false }]);
    mocks.getDb.mockReturnValue(db);

    const response = await request(createApp())
      .post('/api/v1/replays/save')
      .set('Authorization', `Bearer ${createToken()}`)
      .send(createReplayPayload())
      .expect(409);

    expect(response.body).toEqual({
      error: 'Session must be verified before replay save',
    });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('rejects replay save for sessions not owned by the authenticated profile', async () => {
    const { db } = makeDb([]);
    mocks.getDb.mockReturnValue(db);

    const response = await request(createApp())
      .post('/api/v1/replays/save')
      .set('Authorization', `Bearer ${createToken()}`)
      .send(createReplayPayload())
      .expect(403);

    expect(response.body).toEqual({ error: 'Session not found or not owned by user' });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('rejects decoded replay payloads over 500KB before DB access', async () => {
    const oversizedReplay = Buffer.alloc(500_001, 1).toString('base64');

    const response = await request(createApp())
      .post('/api/v1/replays/save')
      .set('Authorization', `Bearer ${createToken()}`)
      .send(createReplayPayload({ replayData: oversizedReplay }))
      .expect(413);

    expect(response.body.error).toContain('Replay too large');
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it('returns conflict when replay already exists for the session', async () => {
    const { db } = makeDb([{ id: SESSION_ID, isVerified: true }], []);
    mocks.getDb.mockReturnValue(db);

    const response = await request(createApp())
      .post('/api/v1/replays/save')
      .set('Authorization', `Bearer ${createToken()}`)
      .send(createReplayPayload())
      .expect(409);

    expect(response.body).toEqual({ error: 'Replay already exists for this session' });
  });

  it('returns replay payload as base64 for public playback', async () => {
    const replayBuffer = Buffer.from('{"snapshots":[],"events":[]}');
    const { db } = makeDb([
      {
        id: REPLAY_ID,
        sessionId: SESSION_ID,
        score: 1200,
        durationMs: 60_000,
        finalLevel: 7,
        totalKills: 42,
        pair: 'BTC',
        position: 'LONG',
        leverage: 10,
        version: 2,
        replayData: replayBuffer,
        createdAt: '2026-06-19T00:00:00.000Z',
        nickname: 'satoshi',
        avatarUrl: null,
      },
    ]);
    mocks.getDb.mockReturnValue(db);

    const response = await request(createApp())
      .get(`/api/v1/replays/${REPLAY_ID}`)
      .expect(200);

    expect(response.body).toEqual({
      id: REPLAY_ID,
      sessionId: SESSION_ID,
      player: {
        nickname: 'satoshi',
        avatarUrl: null,
      },
      score: 1200,
      durationMs: 60_000,
      finalLevel: 7,
      totalKills: 42,
      pair: 'BTC',
      position: 'LONG',
      leverage: 10,
      version: 2,
      replayData: replayBuffer.toString('base64'),
      createdAt: '2026-06-19T00:00:00.000Z',
    });
  });
});
