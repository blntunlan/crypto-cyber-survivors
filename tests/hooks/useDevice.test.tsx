import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDevice } from '../../hooks/useDevice';
import { screenService } from '../../services/system/ScreenService';

// Mock ScreenService
vi.mock('../../services/system/ScreenService', async importOriginal => {
  const actual = await importOriginal<Record<string, any>>();
  return {
    ...actual,
    screenService: {
      ...actual.screenService,
      getDeviceInfo: vi.fn(),
      onChange: vi.fn(),
      isMobile: vi.fn(),
    },
  };
});

describe('useDevice', () => {
  const mockDeviceInfo = {
    isMobile: true,
    isTablet: false,
    isDesktop: false,
    isIOS: true,
    isAndroid: false,
    isPWA: false,
    platform: 'mobile' as const,
    os: 'ios' as const,
    hasTouch: true,
    screen: {
      width: 390,
      height: 844,
      isLandscape: false,
      safeArea: { top: 47, bottom: 34, left: 0, right: 0 },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(screenService.getDeviceInfo).mockReturnValue(mockDeviceInfo);
    vi.mocked(screenService.isMobile).mockReturnValue(true);
    // Default mock implementation for onChange returns a dummy unsubscribe
    vi.mocked(screenService.onChange).mockReturnValue(() => {});
  });

  it('should return initial device info', () => {
    const { result } = renderHook(() => useDevice());

    expect(result.current.isMobile).toBe(true);
    expect(result.current.platform).toBe('mobile');
    expect(result.current.os).toBe('ios');
    expect(screenService.getDeviceInfo).toHaveBeenCalled();
  });

  it('should subscribe to screen changes on mount', () => {
    renderHook(() => useDevice());
    expect(screenService.onChange).toHaveBeenCalled();
  });

  it('should update state when screen changes', () => {
    let changeCallback: () => void = () => {};
    vi.mocked(screenService.onChange).mockImplementation(cb => {
      changeCallback = cb;
      return () => {};
    });

    const { result } = renderHook(() => useDevice());

    // Setup next value
    const updatedInfo = {
      ...mockDeviceInfo,
      isLandscape: true,
      screen: { ...mockDeviceInfo.screen, isLandscape: true },
    };
    vi.mocked(screenService.getDeviceInfo).mockReturnValue(updatedInfo);

    // Trigger change
    act(() => {
      changeCallback();
    });

    expect(result.current.screen.isLandscape).toBe(true);
  });

  it('should unsubscribe on unmount', () => {
    const unsubscribe = vi.fn();
    vi.mocked(screenService.onChange).mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useDevice());
    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
