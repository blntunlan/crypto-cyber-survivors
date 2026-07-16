import { describe, expect, it } from 'vitest';
import { DifficultyInputInbox } from '../../../../services/difficulty/runtime/DifficultyInputInbox';
import { type CanonicalMarketFrame } from '../../../../types/marketCanonical';

const createFrame = (
  overrides: Partial<CanonicalMarketFrame> = {}
): CanonicalMarketFrame => ({
  revision: 1,
  sequence: 1,
  sourceSequence: 1,
  sourceTimestamp: 1_000,
  receivedAt: 1_000,
  quality: 'LIVE',
  price: 50_000,
  pnlPercent: 0,
  rsi: 50,
  rsiState: 'NEUTRAL',
  atrPercent: 0,
  normalizedVolume: 0,
  whaleTier: 0,
  macd: { value: 0, signal: 0, histogram: 0 },
  priceChangePercent: 0,
  trendStrength: 0,
  trendDirection: 'SIDEWAYS',
  source: 'runtime',
  ...overrides,
});

describe('DifficultyInputInbox', () => {
  it('coalesces same-tick player events and advances the player revision once', () => {
    const inbox = new DifficultyInputInbox();
    inbox.recordPlayerHit({ damage: 5, remainingHp: 95 }, 10);
    inbox.recordPlayerHit({ damage: 4, remainingHp: 91 }, 10);
    inbox.recordEnemyKilled(10);
    inbox.recordDash({ duration: 100, cooldown: 500, isDoubleDash: false }, 10);

    const view = inbox.drain(10);

    expect(view.revisions).toEqual({ market: 0, player: 1, run: 0, world: 0 });
    expect(view.player).toMatchObject({
      damageTaken: 9,
      remainingHp: 91,
      killsInWindow: 1,
      dashesInWindow: 1,
    });
  });

  it('makes a post-boundary copied frame eligible only on its declared tick', () => {
    const inbox = new DifficultyInputInbox();
    const frame = createFrame({ sourceSequence: 4, price: 50_004 });
    inbox.recordMarketFrame(frame, 11);
    frame.price = 1;

    expect(inbox.drain(10).market.frame).toBeNull();
    expect(inbox.drain(11).market.frame).toMatchObject({
      sourceSequence: 4,
      price: 50_004,
    });
  });

  it('ignores source sequences that are not newer than the accepted frame', () => {
    const inbox = new DifficultyInputInbox();
    inbox.recordMarketFrame(createFrame({ sourceSequence: 5, price: 50_005 }), 1);
    inbox.recordMarketFrame(createFrame({ sourceSequence: 4, price: 40_000 }), 1);
    inbox.recordMarketFrame(createFrame({ sourceSequence: 5, price: 30_000 }), 1);

    expect(inbox.drain(1).market.frame).toMatchObject({
      sourceSequence: 5,
      price: 50_005,
    });
    expect(inbox.drain(2).revisions.market).toBe(1);
  });

  it('preserves locked run and market inputs across a cycle reset', () => {
    const inbox = new DifficultyInputInbox();
    inbox.initializeRun(
      {
        runId: 'run-1',
        seed: 7,
        side: 'LONG',
        leverage: 5,
        entryPrice: 50_000,
        liquidationPrice: 40_000,
      },
      1
    );
    inbox.recordMarketFrame(createFrame({ sourceSequence: 8 }), 1);
    inbox.recordPlayerHit({ damage: 30, remainingHp: 70 }, 1);
    inbox.drain(1);

    inbox.resetForCycleContinue();
    const view = inbox.drain(2);

    expect(view.run.constants?.runId).toBe('run-1');
    expect(view.market.frame?.sourceSequence).toBe(8);
    expect(view.player.damageTaken).toBe(0);
  });

  it('rejects non-finite player telemetry without advancing its revision', () => {
    const inbox = new DifficultyInputInbox();
    inbox.recordPlayerHit({ damage: Number.NaN, remainingHp: 50 }, 1);

    expect(inbox.drain(1).revisions.player).toBe(0);
    expect(inbox.drain(1).player.damageTaken).toBe(0);
  });
});
