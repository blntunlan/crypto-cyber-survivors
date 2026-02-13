import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameInput } from '../../hooks/useGameInput';

describe('useGameInput', () => {
  it('reads keyboard movement and resets on keyup', () => {
    const { result } = renderHook(() => useGameInput());

    expect(result.current.getMovementVector()).toEqual({ dx: 0, dy: 0 });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });
    expect(result.current.getMovementVector()).toEqual({ dx: 1, dy: 0 });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));
    });
    expect(result.current.getMovementVector()).toEqual({ dx: 0, dy: 0 });
  });

  it('prioritizes touch vector over keyboard and handles dash consumption', () => {
    const { result } = renderHook(() => useGameInput());

    act(() => {
      result.current.setTouchMovement(0.5, -0.25);
    });
    expect(result.current.getMovementVector()).toEqual({ dx: 0.5, dy: -0.25 });

    act(() => {
      result.current.setTouchDash(true);
    });
    expect(result.current.isSpacePressed()).toBe(true);
    expect(result.current.isSpaceFreshPress()).toBe(true);

    act(() => {
      result.current.consumeDash();
    });
    expect(result.current.isSpaceFreshPress()).toBe(false);
  });
});
