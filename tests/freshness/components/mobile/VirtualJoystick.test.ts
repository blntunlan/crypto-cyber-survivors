import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../../assertSourceFreshness';

describe('freshness:components/mobile/VirtualJoystick.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/mobile/VirtualJoystick.tsx', import.meta.url);
  });
});
