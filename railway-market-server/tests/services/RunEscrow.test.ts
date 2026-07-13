import { describe, expect, it } from 'vitest';
import { RunEscrow } from '../../src/services/economy/RunEscrow';

describe('RunEscrow', () => {
  it('returns the original settlement for a duplicate accept idempotency key', () => {
    const escrow = new RunEscrow('quote-1', 120);

    const first = escrow.decide({ outcome: 'CASH_OUT_ACCEPTED', idempotencyKey: 'accept-1' });
    const duplicate = escrow.decide({ outcome: 'CASH_OUT_ACCEPTED', idempotencyKey: 'accept-1' });

    expect(first).toEqual({ state: 'SETTLED', primaryRewardPoints: 120, greedDelta: 0 });
    expect(duplicate).toBe(first);
  });

  it('treats reject and expiry as the same Greed decision', () => {
    expect(new RunEscrow('quote-1', 120).decide({ outcome: 'REJECTED', idempotencyKey: 'r' }))
      .toEqual({ state: 'ACTIVE', primaryRewardPoints: 0, greedDelta: 1 });
    expect(new RunEscrow('quote-2', 120).decide({ outcome: 'EXPIRED', idempotencyKey: 'e' }))
      .toEqual({ state: 'ACTIVE', primaryRewardPoints: 0, greedDelta: 1 });
  });

  it('does not settle primary escrow for death or liquidation and leaves Safe Exit greed-neutral', () => {
    expect(new RunEscrow('quote-1', 120).decide({ outcome: 'DEATH', idempotencyKey: 'd' }))
      .toEqual({ state: 'FAILED', primaryRewardPoints: 0, greedDelta: 0 });
    expect(new RunEscrow('quote-2', 120).decide({ outcome: 'LIQUIDATION', idempotencyKey: 'l' }))
      .toEqual({ state: 'FAILED', primaryRewardPoints: 0, greedDelta: 0 });
    expect(new RunEscrow('quote-3', 120).decide({ outcome: 'SAFE_EXIT', idempotencyKey: 's' }))
      .toEqual({ state: 'SETTLED', primaryRewardPoints: 120, greedDelta: 0 });
  });
});
