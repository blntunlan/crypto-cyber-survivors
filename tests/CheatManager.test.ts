import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CheatManager } from '../services/CheatManager';

describe('CheatManager', () => {
  const mockCallbacks = {
    onLevelUp: vi.fn(),
    onHeal: vi.fn(),
    onKillAll: vi.fn(),
    onToggleGodMode: vi.fn(),
    onSetLuck: vi.fn(),
    onAddExp: vi.fn(),
    onRestart: vi.fn(),
    onAddComboKill: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    CheatManager.setEnabled(true);
    CheatManager.init(mockCallbacks);
  });

  afterEach(() => {
    CheatManager.destroy();
  });

  it('should be a singleton', () => {
    expect(CheatManager).toBeDefined();
  });

  it('should handle "L" key for level up', () => {
    const event = new KeyboardEvent('keydown', { key: 'l' });
    window.dispatchEvent(event);
    expect(mockCallbacks.onLevelUp).toHaveBeenCalled();
  });

  it('should handle "H" key for heal', () => {
    const event = new KeyboardEvent('keydown', { key: 'h' });
    window.dispatchEvent(event);
    expect(mockCallbacks.onHeal).toHaveBeenCalled();
  });

  it('should handle "K" key for kill all', () => {
    const event = new KeyboardEvent('keydown', { key: 'k' });
    window.dispatchEvent(event);
    expect(mockCallbacks.onKillAll).toHaveBeenCalled();
  });

  it('should handle "G" key for god mode toggle', () => {
    const event = new KeyboardEvent('keydown', { key: 'g' });
    window.dispatchEvent(event);
    expect(mockCallbacks.onToggleGodMode).toHaveBeenCalled();
    expect(CheatManager.isGodMode()).toBe(true);

    window.dispatchEvent(event);
    expect(CheatManager.isGodMode()).toBe(false);
  });

  it('should handle "1" key for forced crit toggle', () => {
    const event = new KeyboardEvent('keydown', { key: '1' });
    window.dispatchEvent(event);
    expect(CheatManager.isForcedCrit()).toBe(true);

    // Toggle off
    window.dispatchEvent(event);
    expect(CheatManager.isForcedCrit()).toBe(false);
  });

  it('should handle "2" key for forced super crit toggle', () => {
    const event = new KeyboardEvent('keydown', { key: '2' });
    window.dispatchEvent(event);
    expect(CheatManager.isForcedSuperCrit()).toBe(true);

    // Toggle off
    window.dispatchEvent(event);
    expect(CheatManager.isForcedSuperCrit()).toBe(false);
  });

  it('should handle "3" key for normal firing mode', () => {
    // First enable crit mode
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    expect(CheatManager.isForcedCrit()).toBe(true);

    // Then press 3 to reset
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));
    expect(CheatManager.isForcedCrit()).toBe(false);
    expect(CheatManager.isForcedSuperCrit()).toBe(false);
  });

  it('should handle luck keys "4", "5"', () => {
    const keys = ['4', '5'] as const;
    const expectedLucks = [5, 10];

    keys.forEach((key, index) => {
      const event = new KeyboardEvent('keydown', { key });
      window.dispatchEvent(event);
      expect(mockCallbacks.onSetLuck).toHaveBeenLastCalledWith(expectedLucks[index]);
    });
  });

  it('should handle "X" key for add exp', () => {
    const event = new KeyboardEvent('keydown', { key: 'x' });
    window.dispatchEvent(event);
    expect(mockCallbacks.onAddExp).toHaveBeenCalledWith(500);
  });

  it('should handle "R" key for restart', () => {
    const event = new KeyboardEvent('keydown', { key: 'r' });
    window.dispatchEvent(event);
    expect(mockCallbacks.onRestart).toHaveBeenCalled();
  });

  it('should handle "C" key for combo kill', () => {
    const event = new KeyboardEvent('keydown', { key: 'c' });
    window.dispatchEvent(event);
    expect(mockCallbacks.onAddComboKill).toHaveBeenCalledWith(1);

    const shiftEvent = new KeyboardEvent('keydown', { key: 'c', shiftKey: true });
    window.dispatchEvent(shiftEvent);
    expect(mockCallbacks.onAddComboKill).toHaveBeenCalledWith(10);
  });

  it('should handle word cheats like "moon"', () => {
    vi.useFakeTimers();
    const keys = ['m', 'o', 'o', 'n'];
    keys.forEach(key => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key }));
    });
    expect(mockCallbacks.onSetLuck).toHaveBeenCalledWith(10);
    vi.useRealTimers();
  });

  it('should handle word cheats like "ape"', () => {
    vi.useFakeTimers();
    const keys = ['a', 'p', 'e'];
    keys.forEach(key => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key }));
    });
    expect(mockCallbacks.onSetLuck).toHaveBeenCalledWith(100);
    expect(mockCallbacks.onLevelUp).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should handle word cheats like "rekt"', () => {
    vi.useFakeTimers();
    const keys = ['r', 'e', 'k', 't'];
    keys.forEach(key => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key }));
    });
    expect(mockCallbacks.onAddExp).toHaveBeenCalledWith(-500);
    vi.useRealTimers();
  });

  it('should not trigger cheats when disabled', () => {
    CheatManager.setEnabled(false);
    const event = new KeyboardEvent('keydown', { key: 'l' });
    window.dispatchEvent(event);
    expect(mockCallbacks.onLevelUp).not.toHaveBeenCalled();
  });

  it('should ignore input elements', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', { key: 'l', bubbles: true });
    input.dispatchEvent(event);

    expect(mockCallbacks.onLevelUp).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('should turn off forced crit when super crit is enabled', () => {
    // Enable crit
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    expect(CheatManager.isForcedCrit()).toBe(true);

    // Enable super crit - should disable normal crit
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    expect(CheatManager.isForcedSuperCrit()).toBe(true);
    expect(CheatManager.isForcedCrit()).toBe(false);
  });

  it('should turn off super crit when normal crit is enabled', () => {
    // First reset to clean state
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));

    // Enable super crit
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    expect(CheatManager.isForcedSuperCrit()).toBe(true);

    // Enable normal crit - should disable super crit
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    expect(CheatManager.isForcedCrit()).toBe(true);
    expect(CheatManager.isForcedSuperCrit()).toBe(false);
  });
});
