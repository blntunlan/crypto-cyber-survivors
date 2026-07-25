import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameInput } from '../../hooks/useGameInput';
import { TimeService } from '../../services/core/TimeService';

describe('useGameInput', () => {
  beforeEach(() => {
    TimeService.reset();
    TimeService.setGameTime(0);
  });

  afterEach(() => {
    TimeService.reset();
    vi.useRealTimers();
  });

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

  it('expires the touch dash buffer on game time instead of wall time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const { result } = renderHook(() => useGameInput());

    expect(result.current.isSpacePressed()).toBe(false);
    act(() => {
      result.current.setTouchDash(true);
      result.current.setTouchDash(false);
    });

    vi.advanceTimersByTime(1_000);
    expect(result.current.isSpacePressed()).toBe(true);

    TimeService.setGameTime(401);
    expect(result.current.isSpacePressed()).toBe(false);
  });

  it('reuses the movement vector object across hot-path reads', () => {
    const { result } = renderHook(() => useGameInput());
    const first = result.current.getMovementVector();

    act(() => {
      result.current.setTouchMovement(0.5, -0.25);
    });
    const second = result.current.getMovementVector();

    expect(second).toBe(first);
    expect(second).toEqual({ dx: 0.5, dy: -0.25 });
  });
});
