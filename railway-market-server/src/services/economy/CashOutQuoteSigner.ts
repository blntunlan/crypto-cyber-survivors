import crypto from 'crypto';

export type CashOutQuote = {
  quoteId: string;
  sessionId: string;
  canonicalSequence: number;
  rewardPoints: number;
  issuedAtSeconds: number;
  expiresAtSeconds: number;
};

const MAX_QUOTE_LIFETIME_SECONDS = 15;

export class CashOutQuoteSigner {
  public constructor(private readonly secret: string) {}

  public sign(quote: CashOutQuote): string {
    return crypto
      .createHmac('sha256', this.secret)
      .update(this.serialize(quote))
      .digest('hex');
  }

  public verify(quote: CashOutQuote, signature: string, nowSeconds: number): boolean {
    if (
      nowSeconds > quote.expiresAtSeconds ||
      quote.expiresAtSeconds - quote.issuedAtSeconds !== MAX_QUOTE_LIFETIME_SECONDS
    ) {
      return false;
    }

    const expected = this.sign(quote);
    const actualBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    return (
      actualBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }

  private serialize(quote: CashOutQuote): string {
    return [
      quote.quoteId,
      quote.sessionId,
      quote.canonicalSequence,
      quote.rewardPoints,
      quote.issuedAtSeconds,
      quote.expiresAtSeconds,
    ].join(':');
  }
}
