import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThemeService } from '../../../../services/system/ThemeService';
import { cyberpunkTheme, retro16bitTheme } from '../../../../config/themes';

describe('ThemeService', () => {
  beforeEach(() => {
    ThemeService.setTheme('cyberpunk');
  });

  it('starts from and reports the active theme correctly', () => {
    expect(ThemeService.getTheme()).toBe('cyberpunk');
    expect(ThemeService.isCyberpunk()).toBe(true);
    expect(ThemeService.isRetro()).toBe(false);
    expect(ThemeService.getConfig()).toBe(cyberpunkTheme);
  });

  it('switches theme and returns matching configuration', () => {
    ThemeService.setTheme('retro-16bit');

    expect(ThemeService.getTheme()).toBe('retro-16bit');
    expect(ThemeService.isRetro()).toBe(true);
    expect(ThemeService.isCyberpunk()).toBe(false);
    expect(ThemeService.getConfig()).toBe(retro16bitTheme);
  });

  it('notifies listeners only on actual changes and supports unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = ThemeService.onChange(listener);

    ThemeService.setTheme('cyberpunk');
    ThemeService.setTheme('retro-16bit');
    ThemeService.setTheme('retro-16bit');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('retro-16bit');

    unsubscribe();
    ThemeService.setTheme('cyberpunk');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
