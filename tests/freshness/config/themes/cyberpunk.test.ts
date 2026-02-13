import { describe, it, expect } from 'vitest';
import { cyberpunkTheme } from '../../../../config/themes/cyberpunk';

describe('cyberpunkTheme', () => {
  it('defines expected identity and audio preset', () => {
    expect(cyberpunkTheme.name).toBe('cyberpunk');
    expect(cyberpunkTheme.displayName).toBe('Cyberpunk');
    expect(cyberpunkTheme.audio.preset).toBe('modern');
  });

  it('uses neon-focused color palette and readable text', () => {
    expect(cyberpunkTheme.colors.background).toMatch(/^#[0-9a-f]{6}$/i);
    expect(cyberpunkTheme.colors.surface).toMatch(/^rgba\(/);
    expect(cyberpunkTheme.colors.accent).toMatch(/^#[0-9a-f]{6}$/i);
    expect(cyberpunkTheme.colors.text).toBe('#ffffff');
  });

  it('keeps smooth modern effects enabled', () => {
    expect(cyberpunkTheme.effects.blur).toBe(true);
    expect(cyberpunkTheme.effects.glow).toBe(true);
    expect(cyberpunkTheme.effects.pixelated).toBe(false);
    expect(cyberpunkTheme.effects.smoothTransitions).toBe(true);
  });
});
