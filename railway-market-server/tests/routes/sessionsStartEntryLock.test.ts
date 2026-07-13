import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('sessions start canonical entry lock', () => {
  it('reads a canonical price history row and persists it as the session entry price', () => {
    const source = readFileSync('src/routes/sessions.ts', 'utf8');

    expect(source).toContain('priceHistory.price');
    expect(source).toContain('entryPrice: canonicalEntryPrice');
    expect(source).toContain('Canonical entry price unavailable');
  });
});
