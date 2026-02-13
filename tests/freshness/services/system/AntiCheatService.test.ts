import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:services/system/AntiCheatService.ts', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('services/system/AntiCheatService.ts', import.meta.url);
  });
});
