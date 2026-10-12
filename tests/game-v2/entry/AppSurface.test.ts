import { describe, expect, it } from 'vitest';
import { resolveAppSurface } from '@/entry/AppSurface';

describe('resolveAppSurface', () => {
  it.each(['/game-v2', '/game-v2/'])('selects V2 for %s', pathname => {
    expect(resolveAppSurface(pathname)).toBe('game-v2');
  });

  it.each(['/', '/docs', '/tr/', '/game-v2-preview'])(
    'keeps %s on the legacy entry',
    pathname => {
      expect(resolveAppSurface(pathname)).toBe('legacy');
    }
  );
});
