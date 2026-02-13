import { describe, it } from 'vitest';
import { assertSourceFreshness } from './assertSourceFreshness';

describe('freshness:playwright.config.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('playwright.config.ts', import.meta.url);
  });
});
