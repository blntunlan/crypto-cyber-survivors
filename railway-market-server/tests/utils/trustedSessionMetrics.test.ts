import { describe, expect, it } from 'vitest';
import {
  calculateRawPnlFromPrices,
  deriveTrustedSessionMetrics,
  type VerifyPayload,
} from '../../src/utils/trustedSessionMetrics';

const basePayload: VerifyPayload = {
  sessionId: '11111111-1111-4111-8111-111111111111',
  pair: 'BTC',
  position: 'LONG',
  leverage: 10,
  claimedEntryPrice: 50_000,
  claimedExitPrice: 51_000,
  claimedPnL: 0.02,
  kills: 120,
  level: 12,
  survivalSeconds: 120,
  exitType: 'portal',
  portalType: 'TAKE_PROFIT',
  maxStreak: 20,
};

describe('trustedSessionMetrics', () => {
  it('recomputes pnl from prices and clamps to synced snapshot', () => {
    const result = deriveTrustedSessionMetrics(basePayload, {
      entryPrice: 50_000,
      exitPrice: 50_500,
      survivalSeconds: 110,
      kills: 100,
      level: 10,
    });

    expect(result.metrics.exitPrice).toBe(50_500);
    expect(result.metrics.survivalSeconds).toBe(110);
    expect(result.metrics.kills).toBe(100);
    expect(result.metrics.level).toBe(10);
    expect(result.metrics.pnl).toBeCloseTo(0.01, 6);
    expect(result.suspiciousFlags).toEqual([
      'exit_price_clamped_to_sync',
      'duration_clamped_to_sync',
      'kills_clamped_to_sync',
      'level_clamped_to_sync',
      'pnl_recomputed_from_prices',
    ]);
  });

  it('does not clamp to unsynced session defaults', () => {
    const result = deriveTrustedSessionMetrics(basePayload, {
      entryPrice: null,
      exitPrice: null,
      survivalSeconds: 0,
      kills: 0,
      level: 1,
    });

    expect(result.metrics.kills).toBe(120);
    expect(result.metrics.level).toBe(12);
    expect(result.suspiciousFlags).not.toContain('kills_clamped_to_sync');
    expect(result.suspiciousFlags).not.toContain('level_clamped_to_sync');
  });

  it('clamps survival duration to server session age', () => {
    const createdAtMs = Date.parse('2026-01-01T00:00:00.000Z');
    const result = deriveTrustedSessionMetrics(
      {
        ...basePayload,
        survivalSeconds: 120,
      },
      {
        createdAt: new Date(createdAtMs),
        entryPrice: null,
        exitPrice: null,
        survivalSeconds: null,
        kills: null,
        level: null,
      },
      {
        nowMs: createdAtMs + 20_000,
      }
    );

    expect(result.metrics.survivalSeconds).toBe(25);
    expect(result.suspiciousFlags).toContain('duration_clamped_to_server_age');
  });

  it('does not let synced duration exceed server session age', () => {
    const createdAtMs = Date.parse('2026-01-01T00:00:00.000Z');
    const result = deriveTrustedSessionMetrics(
      {
        ...basePayload,
        survivalSeconds: 120,
      },
      {
        createdAt: new Date(createdAtMs),
        entryPrice: null,
        exitPrice: null,
        survivalSeconds: 110,
        kills: null,
        level: null,
      },
      {
        nowMs: createdAtMs + 20_000,
      }
    );

    expect(result.metrics.survivalSeconds).toBe(25);
    expect(result.suspiciousFlags).toEqual(['duration_clamped_to_server_age']);
  });

  it('rejects kill rates against final clamped duration', () => {
    const createdAtMs = Date.parse('2026-01-01T00:00:00.000Z');

    expect(() =>
      deriveTrustedSessionMetrics(
        {
          ...basePayload,
          survivalSeconds: 120,
          kills: 1_000,
          maxStreak: 50,
        },
        {
          createdAt: new Date(createdAtMs),
          entryPrice: null,
          exitPrice: null,
          survivalSeconds: null,
          kills: null,
          level: null,
        },
        {
          nowMs: createdAtMs + 20_000,
        }
      )
    ).toThrowError('KILL_RATE_IMPLAUSIBLE');
  });

  it('preserves high levels that are valid for market-boosted gameplay', () => {
    const result = deriveTrustedSessionMetrics(
      {
        ...basePayload,
        kills: 6,
        level: 99,
        maxStreak: 6,
      },
      {
        entryPrice: null,
        exitPrice: null,
        survivalSeconds: null,
        kills: null,
        level: null,
      }
    );

    expect(result.metrics.level).toBe(99);
    expect(result.suspiciousFlags).not.toContain('level_clamped_to_kills');
  });

  it('rejects impossible kill rates', () => {
    expect(() =>
      deriveTrustedSessionMetrics(
        {
          ...basePayload,
          survivalSeconds: 10,
          kills: 1000,
          maxStreak: 50,
        },
        {
          entryPrice: null,
          exitPrice: null,
          survivalSeconds: null,
          kills: null,
          level: null,
        }
      )
    ).toThrowError('KILL_RATE_IMPLAUSIBLE');
  });

  it('calculates raw pnl correctly for short positions', () => {
    expect(calculateRawPnlFromPrices(100, 90, 'SHORT')).toBeCloseTo(0.1, 6);
  });
});
