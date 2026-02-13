import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

describe('freshness:contexts/themeContextDef.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('contexts/themeContextDef.ts', import.meta.url);
  });
});
