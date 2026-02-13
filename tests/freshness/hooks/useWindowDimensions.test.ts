import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/system/ScreenService', () => ({
  screenService: {
    isMobile: vi.fn(),
    getSafeAreaInsets: vi.fn(),
  },
}));

import { screenService } from '../../../services/system/ScreenService';
import { useWindowDimensions } from '../../../hooks/useWindowDimensions';

const mockedScreenService = screenService as unknown as {
  isMobile: ReturnType<typeof vi.fn>;
  getSafeAreaInsets: ReturnType<typeof vi.fn>;
};

describe('useWindowDimensions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1280,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 720,
    });

    mockedScreenService.getSafeAreaInsets.mockReturnValue({
      top: 10,
      bottom: 20,
      left: 3,
      right: 4,
    });
  });

  it('computes desktop insets from safe areas and desktop constants', () => {
    mockedScreenService.isMobile.mockReturnValue(false);

    const { result } = renderHook(() => useWindowDimensions());

    expect(result.current.width).toBe(1280);
    expect(result.current.height).toBe(720);
    expect(result.current.hudInsets).toEqual({
      top: 110,
      bottom: 100,
      left: 3,
      right: 4,
    });
  });

  it('computes mobile insets from safe areas and mobile constants', () => {
    mockedScreenService.isMobile.mockReturnValue(true);

    const { result } = renderHook(() => useWindowDimensions());

    expect(result.current.hudInsets).toEqual({
      top: 190,
      bottom: 140,
      left: 3,
      right: 4,
    });
  });

  it('updates width and height when resize events fire', () => {
    mockedScreenService.isMobile.mockReturnValue(false);

    const { result } = renderHook(() => useWindowDimensions());

    act(() => {
      window.innerWidth = 1024;
      window.innerHeight = 640;
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.width).toBe(1024);
    expect(result.current.height).toBe(640);
  });
});
