import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useLazyRef } from '../../../hooks/useLazyRef';

describe('useLazyRef', () => {
  it('initializes only once and preserves the same object across rerenders', () => {
    const factory = vi.fn(() => ({ token: Symbol('once') }));

    const { result, rerender } = renderHook(() => useLazyRef(factory));
    const firstRef = result.current;
    const firstValue = result.current.current;

    rerender();

    expect(factory).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(firstRef);
    expect(result.current.current).toBe(firstValue);
  });
});
