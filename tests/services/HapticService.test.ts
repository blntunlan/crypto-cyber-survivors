import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { haptic } from '../../services/system/HapticService';

describe('HapticService', () => {
  let vibrateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset singleton instance for testing if possible, but here we just mock the global navigator
    vibrateMock = vi.fn();
    vi.stubGlobal('navigator', {
      vibrate: vibrateMock,
    });

    // Force re-instantiation or just rely on the fact that isSupported is checked in constructor.
    // Since HapticService is a singleton initialized at module level, checking 'isSupported' might be tricky if it was already initialized.
    // However, we can check if the methods call the global navigator.

    // NOTE: Because HapticService is a singleton created at module load,
    // we can't easily reset its constructor logic regarding 'isSupported'.
    // If the test runner environment had navigator.vibrate at start, it's true.
    // If not, it's false.
    // JSDOM usually has navigator, but maybe not vibrate.
    // Let's assume we can mock the method call directly if it passes the check.
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should call navigator.vibrate with correct pattern for light', () => {
    (haptic as any).isSupported = true;
    haptic.vibrate('light');
    expect(vibrateMock).toHaveBeenCalledWith(10);
  });

  it('should call navigator.vibrate with correct pattern for medium', () => {
    (haptic as any).isSupported = true;
    haptic.vibrate('medium');
    expect(vibrateMock).toHaveBeenCalledWith(30);
  });

  it('should call navigator.vibrate with correct pattern for heavy', () => {
    (haptic as any).isSupported = true;
    haptic.vibrate('heavy');
    expect(vibrateMock).toHaveBeenCalledWith(70);
  });

  it('should call navigator.vibrate with correct pattern for warning', () => {
    (haptic as any).isSupported = true;
    haptic.vibrate('warning');
    expect(vibrateMock).toHaveBeenCalledWith([200]);
  });

  it('should call navigator.vibrate with correct pattern for error', () => {
    (haptic as any).isSupported = true;

    haptic.vibrate('error');
    expect(vibrateMock).toHaveBeenCalledWith([50, 100, 50, 100, 50]);
  });

  it('should call navigator.vibrate(0) when stop is called', () => {
    (haptic as any).isSupported = true;
    haptic.stop();
    expect(vibrateMock).toHaveBeenCalledWith(0);
  });

  it('should not call navigator.vibrate if not supported', () => {
    (haptic as any).isSupported = false;

    haptic.vibrate('success');
    expect(vibrateMock).not.toHaveBeenCalled();
  });
});
