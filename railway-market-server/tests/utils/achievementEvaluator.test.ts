import { beforeEach, describe, expect, it, vi } from 'vitest';

const PROFILE_ID = '550e8400-e29b-41d4-a716-446655440002';
const SESSION_ID = '11111111-1111-4111-8111-111111111111';

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

import { evaluateAndUnlockAchievements } from '../../src/utils/achievementEvaluator';

/** Build a mock Drizzle select() chain: select().from().where() -> rows */
const makeSelectChain = (rows: unknown[]) => {
  const where = vi.fn(async () => rows);
  const from = vi.fn(() => ({ where }));
  return { from, where };
};

/** Build a mock Drizzle insert() chain: insert().values().onConflictDoNothing().returning() -> rows */
const makeInsertChain = (rows: unknown[]) => {
  const returning = vi.fn(async () => rows);
  const onConflictDoNothing = vi.fn(() => ({ returning }));
  const values = vi.fn(() => ({ onConflictDoNothing }));
  return { values, onConflictDoNothing, returning };
};

/** Build a mock db.execute() that returns { rows } */
const makeExecute = (rows: unknown[]) =>
  vi.fn(async () => ({ rows }));

const makeMockDb = (opts: {
  statsRows?: unknown[];
  existingRows?: unknown[];
  insertRows?: unknown[];
}) => ({
  execute: makeExecute(opts.statsRows ?? []),
  select: vi.fn(() => makeSelectChain(opts.existingRows ?? [])),
  insert: vi.fn(() => makeInsertChain(opts.insertRows ?? [])),
});

describe('evaluateAndUnlockAchievements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns [] when no achievements are met', async () => {
    const db = makeMockDb({
      statsRows: [{ total_kills: 0, max_survival_seconds: 0, max_level: 0, max_pnl: 0 }],
      existingRows: [],
    });
    mocks.getDb.mockReturnValue(db);

    const result = await evaluateAndUnlockAchievements(PROFILE_ID, SESSION_ID);

    expect(result).toEqual([]);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('unlocks first_blood when total kills >= 1', async () => {
    const db = makeMockDb({
      statsRows: [{ total_kills: 5, max_survival_seconds: 30, max_level: 2, max_pnl: 0 }],
      existingRows: [],
      insertRows: [{ achievementId: 'first_blood', unlockedAt: new Date('2026-07-02T00:00:00Z') }],
    });
    mocks.getDb.mockReturnValue(db);

    const result = await evaluateAndUnlockAchievements(PROFILE_ID, SESSION_ID);

    expect(result.length).toBe(1);
    expect(result[0]?.achievementId).toBe('first_blood');
    expect(result[0]?.name).toBe('First Blood');
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it('does not re-unlock already-owned achievements', async () => {
    const db = makeMockDb({
      statsRows: [{ total_kills: 100, max_survival_seconds: 60, max_level: 5, max_pnl: 0.05 }],
      existingRows: [
        { achievementId: 'first_blood' },
        { achievementId: 'centurion' },
        { achievementId: 'survivor_1min' },
        { achievementId: 'level_5' },
        { achievementId: 'pnl_5' },
      ],
      insertRows: [],
    });
    mocks.getDb.mockReturnValue(db);

    const result = await evaluateAndUnlockAchievements(PROFILE_ID, SESSION_ID);

    // All achievable achievements are already unlocked
    expect(result).toEqual([]);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('unlocks multiple achievements at once for a high-stat profile', async () => {
    const db = makeMockDb({
      statsRows: [{ total_kills: 1000, max_survival_seconds: 300, max_level: 10, max_pnl: 0.1 }],
      existingRows: [{ achievementId: 'first_blood' }], // already has first_blood
      insertRows: [
        { achievementId: 'centurion', unlockedAt: new Date('2026-07-02T00:00:00Z') },
        { achievementId: 'slayer', unlockedAt: new Date('2026-07-02T00:00:00Z') },
        { achievementId: 'survivor_1min', unlockedAt: new Date('2026-07-02T00:00:00Z') },
        { achievementId: 'survivor_3min', unlockedAt: new Date('2026-07-02T00:00:00Z') },
        { achievementId: 'survivor_5min', unlockedAt: new Date('2026-07-02T00:00:00Z') },
        { achievementId: 'level_5', unlockedAt: new Date('2026-07-02T00:00:00Z') },
        { achievementId: 'level_10', unlockedAt: new Date('2026-07-02T00:00:00Z') },
        { achievementId: 'pnl_5', unlockedAt: new Date('2026-07-02T00:00:00Z') },
        { achievementId: 'pnl_10', unlockedAt: new Date('2026-07-02T00:00:00Z') },
      ],
    });
    mocks.getDb.mockReturnValue(db);

    const result = await evaluateAndUnlockAchievements(PROFILE_ID, SESSION_ID);

    // first_blood already owned, so not in result; the rest are newly unlocked
    const ids = result.map((r) => r.achievementId);
    expect(ids).not.toContain('first_blood');
    expect(ids).toContain('centurion');
    expect(ids).toContain('slayer');
    expect(ids).toContain('survivor_5min');
    expect(ids).toContain('level_10');
    expect(ids).toContain('pnl_10');
    expect(result.length).toBe(9);
  });

  it('returns [] on DB error (non-fatal — never throws)', async () => {
    const db = {
      execute: vi.fn(async () => {
        throw new Error('DB connection lost');
      }),
      select: vi.fn(),
      insert: vi.fn(),
    };
    mocks.getDb.mockReturnValue(db);

    const result = await evaluateAndUnlockAchievements(PROFILE_ID, SESSION_ID);

    expect(result).toEqual([]);
  });

  it('includes rewardGold in the unlocked achievement payload', async () => {
    const db = makeMockDb({
      statsRows: [{ total_kills: 100, max_survival_seconds: 0, max_level: 0, max_pnl: 0 }],
      existingRows: [],
      insertRows: [{ achievementId: 'centurion', unlockedAt: new Date('2026-07-02T00:00:00Z') }],
    });
    mocks.getDb.mockReturnValue(db);

    const result = await evaluateAndUnlockAchievements(PROFILE_ID, SESSION_ID);

    // centurion has rewardGold: 50 in the catalog
    expect(result[0]?.rewardGold).toBe(50);
  });
});
