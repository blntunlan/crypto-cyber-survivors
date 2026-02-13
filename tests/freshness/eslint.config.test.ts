import { describe, it } from 'vitest';
import { assertSourceFreshness } from './assertSourceFreshness';

describe('freshness:eslint.config.js', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('eslint.config.js', import.meta.url);
  });
});
