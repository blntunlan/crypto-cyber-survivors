import { describe, expect, it } from 'vitest';
import { verifySessionSchema } from '../../src/db/validation';

const makeVerifyBody = (overrides: Record<string, unknown> = {}) => ({
  sessionId: '11111111-1111-4111-8111-111111111111',
  signature: 'signature',
  payload: {
    sessionId: '11111111-1111-4111-8111-111111111111',
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
  it('accepts cycle-complete reward payloads with null portalType and market breakdown', () => {
    const parsed = verifySessionSchema.safeParse(makeVerifyBody());

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.payload.portalType).toBeNull();
      expect(parsed.data.payload.breakdown?.market).toBe(2000);
    }
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

  it('rejects unsupported exitType values', () => {
    const parsed = verifySessionSchema.safeParse(
      makeVerifyBody({
        exitType: 'bogus_exit',
      })
    );

    expect(parsed.success).toBe(false);
  });

  it('rejects unsupported portalType values', () => {
    const parsed = verifySessionSchema.safeParse(
      makeVerifyBody({
        exitType: 'portal',
        portalType: 'BOGUS_PORTAL',
      })
    );

    expect(parsed.success).toBe(false);
  });
});
