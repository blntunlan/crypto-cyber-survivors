import { describe, it, expect } from 'vitest';
import { retro16bitTheme } from '../../../../config/themes/retro16bit';

describe('retro16bitTheme', () => {
  it('defines expected identity and audio preset', () => {
    expect(retro16bitTheme.name).toBe('retro-16bit');
    expect(retro16bitTheme.displayName).toBe('16-Bit');
    expect(retro16bitTheme.audio.preset).toBe('chiptune');
  });

  it('uses arcade-inspired palette', () => {
    expect(retro16bitTheme.colors.primary).toBe('#00BFFF');
    expect(retro16bitTheme.colors.secondary).toBe('#FFD600');
    expect(retro16bitTheme.colors.accent).toBe('#39FF14');
    expect(retro16bitTheme.colors.background).toBe('#0a0a12');
  });

  it('enables retro visual effects and disables modern transitions', () => {
    expect(retro16bitTheme.effects.scanlines).toBe(true);
    expect(retro16bitTheme.effects.pixelated).toBe(true);
    expect(retro16bitTheme.effects.blur).toBe(false);
    expect(retro16bitTheme.effects.smoothTransitions).toBe(false);
  });
});
