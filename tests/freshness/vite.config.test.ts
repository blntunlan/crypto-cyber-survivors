import { describe, it } from 'vitest';
import { assertSourceFreshness } from './assertSourceFreshness';

describe('freshness:vite.config.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('vite.config.ts', import.meta.url);
  });
});
