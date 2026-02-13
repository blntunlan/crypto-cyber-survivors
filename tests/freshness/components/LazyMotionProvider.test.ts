import { describe, it } from 'vitest';
import { assertSourceFreshness } from '../assertSourceFreshness';

describe('freshness:components/LazyMotionProvider.tsx', () => {
  it('keeps mapped source file present and not stale', () => {
    assertSourceFreshness('components/LazyMotionProvider.tsx', import.meta.url);
  });
});
