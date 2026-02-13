import { describe, it, expect } from 'vitest';
import { cn } from '../../../utils/classnames';

describe('cn', () => {
  it('merges tailwind conflicts by keeping the last class', () => {
    const merged = cn('px-2', 'text-sm', 'px-4');

    expect(merged).toContain('px-4');
    expect(merged).toContain('text-sm');
    expect(merged).not.toContain('px-2');
  });

  it('supports conditional and array based class inputs', () => {
    const merged = cn('base', { hidden: true, 'font-bold': false }, ['mt-2', null]);

    expect(merged).toContain('base');
    expect(merged).toContain('hidden');
    expect(merged).toContain('mt-2');
    expect(merged).not.toContain('font-bold');
  });

  it('returns empty string for empty inputs', () => {
    expect(cn()).toBe('');
  });
});
