import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useResponsiveHubColumns } from '../../../components/hub/useResponsiveHubColumns';

const resizeWindow = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
};

describe('useResponsiveHubColumns', () => {
  it('returns 1/2/3 columns for responsive breakpoints', () => {
    resizeWindow(360);
    const { result } = renderHook(() => useResponsiveHubColumns());
    expect(result.current).toBe(1);

    act(() => {
      resizeWindow(500);
    });
    expect(result.current).toBe(2);

    act(() => {
      resizeWindow(1400);
    });
    expect(result.current).toBe(3);
  });
});
