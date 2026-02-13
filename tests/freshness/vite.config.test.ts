import { describe, it } from 'vitest';
import { assertSourceFreshness } from './assertSourceFreshness';

describe('freshness:vite.config.ts', () => {
  // Freshness checkpoint updated: 2026-02-13 (post-format pass).
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('vite.config.ts', import.meta.url);
  });
});
