import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/core/ReduxDevToolsBridge.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/core/ReduxDevToolsBridge.ts', import.meta.url);
  });
});
