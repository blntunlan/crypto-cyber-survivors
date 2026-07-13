import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('mobile viewport safe-area layout', () => {
  it('does not shrink the game root with safe-area padding', () => {
    const source = readFileSync('index.css', 'utf8');
    const rootRule = source.match(/#root\s*\{([^}]*)\}/)?.[1];

    expect(rootRule).toBeDefined();
    expect(rootRule).not.toMatch(/padding-(?:top|bottom|left|right):/);
  });
});
