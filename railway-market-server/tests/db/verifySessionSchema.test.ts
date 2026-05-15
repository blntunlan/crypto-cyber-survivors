import { describe, expect, it } from 'vitest';
import { verifySessionSchema } from '../../src/db/validation';

const SESSION_ID = '11111111-1111-4111-8111-111111111111';

const makeVerifyBody = (overrides: Record<string, unknown> = {}) => ({
  sessionId: SESSION_ID,
  signature: 'signature',
  payload: {
    sessionId: SESSION_ID,
    pair: 'BTC',
    position: 'LONG',
    leverage: 10,
    claimedEntryPrice: 50000,
    claimedExitPrice: 51000,
    claimedPnL: 0.2,
    kills: 42,
    level: 5,
    survivalSeconds: 180,
    exitType: 'cycle_complete',
    portalType: null,
    maxStreak: 18,
    rawCoins: 210,
    enemyDropCoins: 0,
    totalCoins: 1460,
    pnlPercent: 0.2,
    breakdown: {
      base: 360,
      survival: 360,
      kill: 210,
      level: 250,
      market: 2000,
      streak: 25,
      portal: 0,
    },
    ...overrides,
  },
});

describe('verifySessionSchema', () => {
  it('accepts cycle-complete reward payloads with null portalType', () => {
    const parsed = verifySessionSchema.safeParse(makeVerifyBody());

    expect(parsed.success).toBe(true);
  });

  it('accepts portal reward payloads with a concrete portalType', () => {
    const parsed = verifySessionSchema.safeParse(
      makeVerifyBody({
        exitType: 'portal',
        portalType: 'TAKE_PROFIT',
      })
    );

    expect(parsed.success).toBe(true);
  });

  it('rejects payloads without exitType', () => {
    const parsed = verifySessionSchema.safeParse(
      makeVerifyBody({
        exitType: undefined,
      })
    );

    expect(parsed.success).toBe(false);
  });

  it('rejects payloads without maxStreak', () => {
    const parsed = verifySessionSchema.safeParse(
      makeVerifyBody({
        maxStreak: undefined,
      })
    );

    expect(parsed.success).toBe(false);
  });

  it('rejects portal exits without portalType', () => {
    const parsed = verifySessionSchema.safeParse(
      makeVerifyBody({
        exitType: 'portal',
        portalType: null,
      })
    );

    expect(parsed.success).toBe(false);
  });

  it('rejects non-portal exits with portalType', () => {
    const parsed = verifySessionSchema.safeParse(
      makeVerifyBody({
        exitType: 'death',
        portalType: 'TAKE_PROFIT',
      })
    );

    expect(parsed.success).toBe(false);
  });

  it('rejects mismatched top-level and payload session ids', () => {
    const body = makeVerifyBody();
    const parsed = verifySessionSchema.safeParse({
      ...body,
      payload: {
        ...body.payload,
        sessionId: '22222222-2222-4222-8222-222222222222',
      },
    });

    expect(parsed.success).toBe(false);
  });
});
