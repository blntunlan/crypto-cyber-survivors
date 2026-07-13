import { describe, expect, it } from 'vitest';
import { CashOutQuoteSigner } from '../../src/services/economy/CashOutQuoteSigner';

const quote = {
  quoteId: 'quote-1',
  sessionId: 'session-1',
  canonicalSequence: 42,
  rewardPoints: 123.45,
  issuedAtSeconds: 1_000,
  expiresAtSeconds: 1_015,
};

describe('CashOutQuoteSigner', () => {
  it('verifies an unmodified server quote within its fifteen-second lifetime', () => {
    const signer = new CashOutQuoteSigner('server-only-secret');
    const signature = signer.sign(quote);

    expect(signer.verify(quote, signature, 1_014)).toBe(true);
  });

  it('rejects a tampered reward or an expired quote', () => {
    const signer = new CashOutQuoteSigner('server-only-secret');
    const signature = signer.sign(quote);

    expect(signer.verify({ ...quote, rewardPoints: 999_999 }, signature, 1_005)).toBe(false);
    expect(signer.verify(quote, signature, 1_016)).toBe(false);
  });

  it('rejects quotes that are not fixed to exactly fifteen seconds', () => {
    const signer = new CashOutQuoteSigner('server-only-secret');
    const shortQuote = { ...quote, expiresAtSeconds: 1_010 };

    expect(signer.verify(shortQuote, signer.sign(shortQuote), 1_005)).toBe(false);
  });
});
