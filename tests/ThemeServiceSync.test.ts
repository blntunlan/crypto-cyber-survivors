import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeService } from '../services/system/ThemeService';

describe('Theme System Synchronization', () => {
  beforeEach(() => {
    // Reset to default
    ThemeService.setTheme('cyberpunk');
  });

  it('ThemeService should update currentTheme and notify listeners', () => {
    const listener = vi.fn();
    const unsubscribe = ThemeService.onChange(listener);

    ThemeService.setTheme('retro-16bit');

    expect(ThemeService.getTheme()).toBe('retro-16bit');
    expect(ThemeService.isRetro()).toBe(true);
    expect(listener).toHaveBeenCalledWith('retro-16bit');

    unsubscribe();
  });

  it('ThemeService should not notify if the theme is the same', () => {
    const listener = vi.fn();
    ThemeService.onChange(listener);

    // Already cyberpunk by default
    ThemeService.setTheme('cyberpunk');

    expect(listener).not.toHaveBeenCalled();
  });

  it('ThemeService should handle multiple listeners and independent unsubscribes', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    const unsub1 = ThemeService.onChange(listener1);
    const unsub2 = ThemeService.onChange(listener2);

    ThemeService.setTheme('retro-16bit');
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);

    unsub1();
    ThemeService.setTheme('cyberpunk');
    expect(listener1).toHaveBeenCalledTimes(1); // Should not be called again
    expect(listener2).toHaveBeenCalledTimes(2); // Should be called again

    unsub2();
  });

  it('ThemeService isRetro/isCyberpunk helper methods should be accurate', () => {
    ThemeService.setTheme('cyberpunk');
    expect(ThemeService.isCyberpunk()).toBe(true);
    expect(ThemeService.isRetro()).toBe(false);

    ThemeService.setTheme('retro-16bit');
    expect(ThemeService.isCyberpunk()).toBe(false);
    expect(ThemeService.isRetro()).toBe(true);
  });
});
