import { describe, it } from 'vitest';
import { assertSourceFreshness } from './assertSourceFreshness';

describe('freshness:commitlint.config.js', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('commitlint.config.js', import.meta.url);
  });
});
